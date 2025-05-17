import { TestRunSummary, FlakyStat } from '@/types';

// Helper function to calculate percentile
function calculatePercentile(arr: number[], percentile: number): number | undefined {
  if (!arr || arr.length === 0) return undefined;
  const sortedArr = [...arr].sort((a, b) => a - b);
  const index = (percentile / 100) * (sortedArr.length -1); // Corrected index calculation for 0-based array
  if (index % 1 === 0) {
    return sortedArr[index];
  }
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  // Simple linear interpolation, or just take lower/upper for simplicity if preferred
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
  // For p50 (median) with even numbers, often average of two middle, this handles it.
  // For p99, if index is, say, 98.5 for 100 items, it interpolates between 98th and 99th item.
  // If exact index like 99 is hit, it takes that.
}

export function calculateFlakinessStats(allRunsData: TestRunSummary[]): FlakyStat[] {
  // Ensure startedAt is a Date object for all runs
  const allRuns = allRunsData.map(run => ({
    ...run,
    startedAt: typeof run.startedAt === 'string' ? new Date(run.startedAt) : run.startedAt,
  }));

  const testStatsMap = new Map<string, {
    title: string;
    project: string;
    runs: number;
    failures: number;
    // history: ('P' | 'F' | 'S')[]; // No longer directly stored here, built from runDetails
    runDetails: { status: 'P' | 'F' | 'S'; startedAt: Date }[];
    durations: number[]; // To collect all durations for a test
  }>();

  // Sort runs by date to process them chronologically for history
  // Now safe to use getTime() as startedAt is a Date
  const sortedRuns = [...allRuns].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  for (const run of sortedRuns) {
    for (const test of run.tests) {
      if (!testStatsMap.has(test.id)) {
        testStatsMap.set(test.id, {
          title: test.title,
          project: test.project,
          runs: 0,
          failures: 0,
          // history: [],
          runDetails: [],
          durations: [],
        });
      }

      const stat = testStatsMap.get(test.id)!;
      stat.runs++;
      let historyChar: 'P' | 'F' | 'S';
      if (test.status === 'failed') {
        stat.failures++;
        historyChar = 'F';
      } else if (test.status === 'passed') {
        historyChar = 'P';
      } else {
        historyChar = 'S';
      }
      // run.startedAt is confirmed to be a Date object here from the initial map and sort
      stat.runDetails.push({ status: historyChar, startedAt: run.startedAt });
      if (test.duration !== undefined) {
        stat.durations.push(test.duration);
      }
    }
  }

  const flakyStats: FlakyStat[] = [];
  for (const [id, stat] of testStatsMap.entries()) {
    // Sort history for each test by run date
    // stat.runDetails[x].startedAt is already a Date object
    const chronologicalHistory = stat.runDetails
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .map(detail => detail.status);

    const failureRate = stat.runs > 0 ? parseFloat((stat.failures / stat.runs).toFixed(2)) : 0;
    
    let durationMin: number | undefined;
    let durationMax: number | undefined;
    let durationAvg: number | undefined;
    let durationP50: number | undefined;
    let durationP99: number | undefined;

    if (stat.durations.length > 0) {
      const sortedDurations = [...stat.durations].sort((a,b) => a - b);
      durationMin = sortedDurations[0];
      durationMax = sortedDurations[sortedDurations.length - 1];
      const sum = stat.durations.reduce((acc, d) => acc + d, 0);
      durationAvg = Math.round(sum / stat.durations.length);
      durationP50 = calculatePercentile(sortedDurations, 50);
      durationP99 = calculatePercentile(sortedDurations, 99);
       // Ensure P99 is not greater than max if array is small and percentile calc goes over.
      if (durationP99 !== undefined && durationMax !== undefined && durationP99 > durationMax) {
        durationP99 = durationMax;
      }
    }

    flakyStats.push({
      id,
      title: stat.title,
      project: stat.project,
      runs: stat.runs,
      failures: stat.failures,
      failureRate: failureRate,
      history: chronologicalHistory,
      durationMin,
      durationMax,
      durationAvg,
      durationP50,
      durationP99,
    });
  }

  // Sort descending by failureRate, then by failures (tiebreaker)
  flakyStats.sort((a, b) => {
    if (b.failureRate !== a.failureRate) {
      return b.failureRate - a.failureRate;
    }
    return b.failures - a.failures;
  });

  return flakyStats;
} 