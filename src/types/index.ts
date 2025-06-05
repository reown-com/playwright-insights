export interface TestRun {
  // Raw structure from Playwright JSON for relevant parts
  suites: {
    title: string; // file name e.g. basic-tests.spec.ts
    specs: {
      title: string; // test title e.g. "Should be able to open modal"
      tests: {
        projectName: string; // e.g. "Desktop Firefox/ethers5"
        results: {
          status: 'passed' | 'failed' | 'skipped' | 'timedOut' | string; // Playwright status
          startTime: string; // ISO date string
          duration?: number;
        }[];
      }[];
    }[];
  }[];
}

export interface TestRunSummary {
  runId: string; // S3 key stem (e.g. 2025-05-16T16-58-run-123)
  startedAt: Date; // earliest result.startTime in the file
  trigger?: string; // First path segment after S3_PREFIX
  tests: {
    id: string; // `${title}|${projectName}`   (unique across runs)
    title: string;
    project: string; // value of projectName
    status: 'passed' | 'failed' | 'skipped';
    duration?: number; // duration from playwright result if available
    stdout?: string[];
    errors?: string[];
  }[];
}

export interface FlakyStat {
  id: string;
  title: string;
  project: string;
  trigger: string;
  runs: number;
  failures: number;
  failureRate: number;
  history: Array<{
    runId: string;
    status: 'passed' | 'failed' | 'skipped';
    duration?: number;
  }>;
  durationStats: {
    p50: number;
    p90: number;
    p95: number;
    mean: number;
  };
} 