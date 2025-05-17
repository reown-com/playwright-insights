import { NextResponse } from 'next/server';
import { getAllTestRunSummaries } from '@/lib/s3-data-service';
// import { calculateFlakinessStats } from '@/lib/flakiness-calculator'; // Calculation moves to client
import { TestRunSummary } from '@/types';

// Force dynamic rendering and disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface FlakinessApiData {
  summaries: TestRunSummary[];
  allTriggers: string[];
  allProjects: string[];
}

export async function GET() {
  try {
    const allSummaries = await getAllTestRunSummaries(); // These now include the 'trigger' field
    
    const uniqueTriggers = new Set<string>();
    const uniqueProjects = new Set<string>();

    allSummaries.forEach(summary => {
      if (summary.trigger) {
        uniqueTriggers.add(summary.trigger);
      }
      summary.tests.forEach(test => {
        uniqueProjects.add(test.project);
      });
    });

    const responseData: FlakinessApiData = {
      summaries: allSummaries,
      allTriggers: Array.from(uniqueTriggers).sort(),
      allProjects: Array.from(uniqueProjects).sort(),
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching flakiness API data:', error);
    // Check if the error is an Error instance to safely access message
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
        { error: 'Failed to fetch flakiness API data', details: errorMessage }, 
        { status: 500 }
    );
  }
} 