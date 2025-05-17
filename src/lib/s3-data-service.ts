import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { TestRun, TestRunSummary } from '@/types';

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

async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

export function transformPlaywrightReportToTestRunSummary(report: TestRun, s3Key: string): TestRunSummary {
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
          const mainResult = test.results[0];
          if (mainResult) {
            const resultStartTime = new Date(mainResult.startTime);
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
              id: `${spec.title}|${test.projectName}`,
              title: `${suite.title} > ${spec.title}`,
              project: test.projectName,
              status: status,
              duration: mainResult.duration,
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

// Simple in-memory cache with a Map
const cache = new Map<string, { data: TestRunSummary[]; timestamp: number }>();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function getAllTestRunSummaries(): Promise<TestRunSummary[]> {
  const cacheKey = 'allTestRunSummaries';
  const cachedEntry = cache.get(cacheKey);

  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION_MS)) {
    console.log('Returning cached data');
    return cachedEntry.data;
  }
  console.log('Fetching fresh data from S3');

  const listObjectsParams = {
    Bucket: S3_BUCKET,
    Prefix: `${S3_PREFIX}/`, // Ensure prefix ends with a slash for folder-like behavior
  };

  const listedObjects = await s3Client.send(new ListObjectsV2Command(listObjectsParams));
  const jsonFiles = listedObjects.Contents?.filter(obj => obj.Key?.endsWith('.json')) || [];

  const summaries: TestRunSummary[] = [];

  for (const file of jsonFiles) {
    if (file.Key) {
      try {
        const getObjectParams = {
          Bucket: S3_BUCKET,
          Key: file.Key,
        };
        const objectData = await s3Client.send(new GetObjectCommand(getObjectParams));
        if (objectData.Body) {
          const rawJsonString = await streamToString(objectData.Body as Readable);
          const report = JSON.parse(rawJsonString) as TestRun;
          summaries.push(transformPlaywrightReportToTestRunSummary(report, file.Key));
        } else {
          console.warn(`Skipping empty file: ${file.Key}`);
        }
      } catch (error) {
        console.error(`Error processing file ${file.Key}:`, error);
        // Optionally, decide if one failed file should stop the whole process
        // or just skip this file and continue.
      }
    }
  }

  // Sort summaries by startedAt date, most recent first
  summaries.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  cache.set(cacheKey, { data: summaries, timestamp: Date.now() });
  return summaries;
} 