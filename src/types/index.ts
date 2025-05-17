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
  }[];
}

export interface FlakyStat {
  id: string; // `${title}|${projectName}`
  title: string;
  project: string;
  runs: number;
  failures: number;
  failureRate: number; // failures / runs, rounded to 2 dp
  // P = passed, F = failed, S = skipped
  history: ('P' | 'F' | 'S')[]; // chronological per-run status
  durationMin?: number; // in milliseconds
  durationMax?: number; // in milliseconds
  durationAvg?: number; // in milliseconds, rounded
  durationP50?: number; // in milliseconds (median)
  durationP99?: number; // in milliseconds
  // Optional: store runIds for history to link back to specific run details if needed
  // historyDetails: { runId: string, status: 'P' | 'F' | 'S', startedAt: Date }[];
} 