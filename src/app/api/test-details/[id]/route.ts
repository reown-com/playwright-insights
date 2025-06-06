import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTestRunSummaries, getAvailableDates } from '@/lib/s3-data-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TestHistoryEntry {
  runId: string;
  startedAt: string; // ISO string
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  stdout?: string[];
  errors?: string[];
}

export interface TestDetailsData {
  id: string;
  title: string;
  project: string;
  history: TestHistoryEntry[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: testId } = await params;

  if (!testId) {
    return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
  }

  try {
    // Get the most recent year and month
    const { years, monthsByYear } = await getAvailableDates();
    const mostRecentYear = years[0];
    const mostRecentMonth = monthsByYear[mostRecentYear]?.[0];
    
    if (!mostRecentYear || !mostRecentMonth) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }

    const allRuns = await getTestRunSummaries(mostRecentYear, mostRecentMonth);
    
    let testTitle = '';
    let testProject = '';
    const history: TestHistoryEntry[] = [];

    // Sort runs by date to ensure history is chronological
    const sortedRuns = [...allRuns].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    for (const run of sortedRuns) {
      const testInstance = run.tests.find(t => t.id === testId);
      if (testInstance) {
        if (!testTitle) testTitle = testInstance.title;
        if (!testProject) testProject = testInstance.project;
        
        history.push({
          runId: run.runId,
          startedAt: run.startedAt.toISOString(),
          status: testInstance.status,
          duration: testInstance.duration,
          stdout: testInstance.stdout,
          errors: testInstance.errors,
        });
      }
    }

    if (!testTitle) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const responseData: TestDetailsData = {
      id: testId,
      title: testTitle,
      project: testProject,
      history,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(`Error fetching details for test ${testId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
        { error: 'Failed to fetch test details', details: errorMessage }, 
        { status: 500 }
    );
  }
} 