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
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');
  
  // If no year/month provided, use current date
  const now = new Date();
  const year = yearParam ? parseInt(yearParam) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1; // getMonth() returns 0-11

  if (isNaN(year) || isNaN(month)) {
    return NextResponse.json(
      { error: 'Invalid year or month parameter' },
      { status: 400 }
    );
  }

  try {
    const summaries = await getTestRunSummaries(year, month);
    const flakinessStats = calculateFlakinessStats(summaries);

    // Get unique triggers and projects from the data
    const triggers = Array.from(new Set(summaries.map(s => s.trigger).filter(Boolean)));
    const projects = Array.from(new Set(summaries.flatMap(s => s.tests.map(t => t.project))));

    // Get available dates
    const availableDates = {
      years: [year], // For now, just include the current year
      monthsByYear: {
        [year]: [month] // For now, just include the current month
      }
    };

    const response = {
      summaries,
      flakinessStats,
      allTriggers: triggers,
      allProjects: projects,
      year,
      month,
      availableDates
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch flakiness data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 