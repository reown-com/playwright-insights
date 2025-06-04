import { TestRunSummary, FlakyStat } from '@/types';

interface TestStat {
  id: string;
  title: string;
  project: string;
  trigger: string;
  runs: number;
  failures: number;
  history: Array<{
    runId: string;
    status: 'passed' | 'failed' | 'skipped';
    duration?: number;
  }>;
  durations: number[];
}

export function calculateFlakinessStats(summaries: TestRunSummary[]): FlakyStat[] {
  const testStats = new Map<string, TestStat>();

  // Process each test run
  summaries.forEach(summary => {
    // Skip summaries without a trigger
    if (!summary.trigger) {
      return;
    }

    const trigger = summary.trigger; // Store in a variable to satisfy TypeScript

    summary.tests.forEach(test => {
      // Create a unique key that includes both test ID and trigger
      const key = `${test.id}|${trigger}`;
      
      const existingStat = testStats.get(key) || {
        id: test.id,
        title: test.title,
        project: test.project,
        trigger,
        runs: 0,
        failures: 0,
        history: [],
        durations: [],
      };

      existingStat.runs++;
      if (test.status === 'failed') {
        existingStat.failures++;
      }

      existingStat.history.push({
        runId: summary.runId,
        status: test.status,
        duration: test.duration,
      });

      if (test.duration) {
        existingStat.durations.push(test.duration);
      }

      testStats.set(key, existingStat);
    });
  });

  // Convert to FlakyStat array
  const result = Array.from(testStats.values()).map(stat => {
    const sortedDurations = [...stat.durations].sort((a, b) => a - b);
    const p50Index = Math.floor(sortedDurations.length * 0.5);
    const p90Index = Math.floor(sortedDurations.length * 0.9);
    const p95Index = Math.floor(sortedDurations.length * 0.95);

    return {
      id: stat.id,
      title: stat.title,
      project: stat.project,
      trigger: stat.trigger,
      runs: stat.runs,
      failures: stat.failures,
      failureRate: stat.runs > 0 ? (stat.failures / stat.runs) * 100 : 0,
      history: stat.history,
      durationStats: {
        p50: sortedDurations[p50Index] || 0,
        p90: sortedDurations[p90Index] || 0,
        p95: sortedDurations[p95Index] || 0,
        mean: stat.durations.length > 0
          ? stat.durations.reduce((sum, duration) => sum + duration, 0) / stat.durations.length
          : 0,
      },
    };
  });

  return result;
} 