import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTestRunSummaries } from '@/lib/s3-data-service';
import { calculateFlakinessStats } from '@/lib/flakiness-calculator';
import { TestRunSummary, FlakyStat } from '@/types';

// Force dynamic rendering and disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface FlakinessApiData {
  summaries: TestRunSummary[];
  flakinessStats: FlakyStat[];
  allTriggers: string[];
  allProjects: string[];
  year: number;
  month: number;
  availableDates: {
    years: number[];
    monthsByYear: Record<number, number[]>;
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get('year') || '');
  const month = parseInt(searchParams.get('month') || '');

  try {
    const summaries = await getTestRunSummaries(year, month);
    const flakinessStats = calculateFlakinessStats(summaries);

    // Get unique triggers and projects from the data
    const triggers = Array.from(new Set(summaries.map(s => s.trigger).filter(Boolean)));
    const projects = Array.from(new Set(summaries.flatMap(s => s.tests.map(t => t.project))));

    return NextResponse.json({
      triggers,
      projects,
      flakinessStats,
    });
  } catch (error) {
    console.error('Error fetching flakiness data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flakiness data' },
      { status: 500 }
    );
  }
} 