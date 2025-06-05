import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { TestRunSummary } from '@/types';

const S3_BUCKET = process.env.S3_BUCKET!;
const S3_PREFIX = process.env.S3_PREFIX!.endsWith('/') ? process.env.S3_PREFIX!.slice(0, -1) : process.env.S3_PREFIX!;

if (!S3_BUCKET || !S3_PREFIX) {
  throw new Error('S3_BUCKET and S3_PREFIX environment variables must be set.');
}
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables must be set.');
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

interface PlaywrightTest {
  id?: string;
  testId?: string;
  title: string;
  project: string;
  status?: string;
  duration?: number;
  results?: Array<{
    status?: string;
    duration?: number;
    stdout?: string[];
    errors?: string[];
  }>;
}

interface PlaywrightSuite {
  title: string;
  specs: Array<{
    title: string;
    tests: PlaywrightTest[];
  }>;
}

interface PlaywrightReport {
  runId?: string;
  startedAt?: string;
  startTime?: string;
  tests?: PlaywrightTest[];
  suites?: PlaywrightSuite[];
}

export function transformPlaywrightReportToTestRunSummary(report: PlaywrightReport, s3Key: string): TestRunSummary {
  const runId = s3Key.substring(s3Key.lastIndexOf('/') + 1).replace('.json', '');
  let earliestStartDate: Date | null = null;
  const tests: TestRunSummary['tests'] = [];

  // Extract trigger
  let trigger: string | undefined = undefined;
  const keyWithoutPrefix = s3Key.startsWith(S3_PREFIX + '/') ? s3Key.substring(S3_PREFIX.length + 1) : '';
  if (keyWithoutPrefix) {
    const parts = keyWithoutPrefix.split('/');
    if (parts.length > 1) { // Need at least one segment for trigger and then the filename part
      trigger = parts[0];
    }
  }

  if (report.suites) {
    report.suites.forEach(suite => {
      suite.specs.forEach(spec => {
        spec.tests.forEach(test => {
          // Use the first result for a given test spec + project combination for simplicity
          // Playwright can have multiple results for a single test (e.g. retries)
          // We'll consider the first one as representative for this summary.
          const mainResult = test.results?.[0];
          if (mainResult) {
            const resultStartTime = new Date(report.startedAt || report.startTime || new Date().toISOString());
            if (earliestStartDate === null || resultStartTime < earliestStartDate) {
              earliestStartDate = resultStartTime;
            }

            let status: TestRunSummary['tests'][0]['status'];
            if (mainResult.status === 'failed' || mainResult.status === 'timedOut') {
              status = 'failed';
            } else if (mainResult.status === 'passed') {
              status = 'passed';
            } else {
              status = 'skipped'; // Includes 'interrupted', etc.
            }

            tests.push({
              id: `${spec.title}|${test.project}`,
              title: `${suite.title} > ${spec.title}`,
              project: test.project,
              status: status,
              duration: mainResult.duration,
              stdout: Array.isArray(mainResult.stdout) ? mainResult.stdout : undefined,
              errors: Array.isArray(mainResult.errors) ? mainResult.errors : undefined,
            });
          }
        });
      });
    });
  }

  return {
    runId,
    startedAt: earliestStartDate || new Date(), // Fallback if no tests/results found
    trigger,
    tests,
  };
}

interface AvailableDates {
  years: number[];
  monthsByYear: Record<number, number[]>;
}

export async function getAvailableDates(): Promise<AvailableDates> {
  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: S3_PREFIX + '/',
    Delimiter: '/',
  });

  const response = await s3Client.send(command);
  const years: number[] = [];
  const monthsByYear: Record<number, number[]> = {};

  // Process CommonPrefixes to get years
  if (response.CommonPrefixes) {
    for (const prefix of response.CommonPrefixes) {
      if (prefix.Prefix) {
        const yearMatch = prefix.Prefix.match(/year=(\d{4})\//);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          years.push(year);
          monthsByYear[year] = [];
        }
      }
    }
  }

  // For each year, get its months
  for (const year of years) {
    const monthCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: `${S3_PREFIX}/year=${year}/`,
      Delimiter: '/',
    });

    const monthResponse = await s3Client.send(monthCommand);
    if (monthResponse.CommonPrefixes) {
      for (const prefix of monthResponse.CommonPrefixes) {
        if (prefix.Prefix) {
          const monthMatch = prefix.Prefix.match(/month=(\d{2})\//);
          if (monthMatch) {
            const month = parseInt(monthMatch[1]);
            monthsByYear[year].push(month);
          }
        }
      }
    }
  }

  // Sort years and months
  years.sort((a, b) => b - a); // Descending order
  Object.keys(monthsByYear).forEach(year => {
    monthsByYear[parseInt(year)].sort((a, b) => b - a); // Descending order
  });

  return { years, monthsByYear };
}

export async function getTestRunSummaries(year: number, month: number): Promise<TestRunSummary[]> {
  const prefix = `${S3_PREFIX}/year=${year}/month=${month.toString().padStart(2, '0')}/`;

  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  const summaries: TestRunSummary[] = [];

  if (!response.Contents) {
    return [];
  }

  for (const item of response.Contents) {
    if (!item.Key) continue;

    try {
      const keyWithoutPrefix = item.Key.startsWith(S3_PREFIX + '/') ? item.Key.substring(S3_PREFIX.length + 1) : item.Key;
      const parts = keyWithoutPrefix.split('/');

      const getObjectCommand = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: item.Key,
      });

      const response = await s3Client.send(getObjectCommand);
      const stream = response.Body;
      if (!stream) {
        continue;
      }

      const content = await stream.transformToString();
      const data = JSON.parse(content) as PlaywrightReport;

      // Extract trigger from the path - look for it after the date segments
      let trigger: string | undefined;
      
      // Skip the date segments (year=YYYY, month=MM, day=DD) and get the next part
      const dateSegmentCount = 3; // year, month, day
      if (parts.length > dateSegmentCount) {
        trigger = parts[dateSegmentCount];
      }

      // Handle both original Playwright report format and our simplified format
      let tests: PlaywrightTest[] = [];
      
      if (data.tests) {
        tests = data.tests;
      } else if (data.suites) {
        tests = data.suites.flatMap(suite => 
          suite.specs.flatMap(spec => 
            spec.tests.map(test => ({
              ...test,
              title: `${suite.title} > ${spec.title}`,
            }))
          )
        );
      }
      
      if (tests.length > 0) {
        const summary: TestRunSummary = {
          runId: data.runId || item.Key,
          startedAt: new Date(data.startedAt || data.startTime || new Date().toISOString()),
          trigger,
          tests: tests.map(test => {
            const mainResult = test.results?.[0];
            const base = {
              id: test.id || test.testId || `${test.title}-${test.project}`,
              title: test.title,
              project: test.project,
              status: (test.status || mainResult?.status || 'skipped') as 'skipped' | 'passed' | 'failed',
              duration: test.duration || mainResult?.duration,
              stdout: mainResult?.stdout?.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)),
              errors: mainResult?.errors?.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)),
            };
            return base;
          }),
        };
        summaries.push(summary);
      }
    } catch {
      // Skip files that can't be processed
      continue;
    }
  }

  return summaries;
}

export async function getAllTestRunSummaries(): Promise<TestRunSummary[]> {
  const { years, monthsByYear } = await getAvailableDates();
  
  // Get the most recent year and month
  const mostRecentYear = years[0];
  const mostRecentMonth = monthsByYear[mostRecentYear]?.[0];
  
  if (!mostRecentYear || !mostRecentMonth) {
    console.log('No data available');
    return [];
  }

  return getTestRunSummaries(mostRecentYear, mostRecentMonth);
} 