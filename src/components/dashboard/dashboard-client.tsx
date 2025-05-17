'use client'

import * as React from 'react'
import { FlakyStat, TestRunSummary } from '@/types'
import { columns } from './columns'
import { DataTable } from './data-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { ThemeToggle } from '@/components/theme-toggle'
import { calculateFlakinessStats } from '@/lib/flakiness-calculator' // Import calculator
import { FlakinessApiData } from '@/app/api/flakiness-data/route' // Import API response type

async function getDashboardData(): Promise<FlakinessApiData> {
  const res = await fetch('/api/flakiness-data', { cache: 'no-store' });
  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({}))
    console.error('API Error Response:', errorPayload);
    throw new Error(`Failed to fetch data: ${res.statusText} - ${errorPayload.details || 'Unknown error'}`);
  }
  return res.json();
}

const ALL_TRIGGERS_KEY = '__ALL_TRIGGERS__'; // Special key for selecting all triggers

export default function DashboardClient() {
  const [allSummaries, setAllSummaries] = React.useState<TestRunSummary[]>([]);
  const [flakyStatsForTable, setFlakyStatsForTable] = React.useState<FlakyStat[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [allProjects, setAllProjects] = React.useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = React.useState<string[]>([]);

  const [allTriggers, setAllTriggers] = React.useState<string[]>([]);
  const [selectedTrigger, setSelectedTrigger] = React.useState<string>(ALL_TRIGGERS_KEY); // Default to all

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const apiData = await getDashboardData();
        setAllSummaries(apiData.summaries);
        setAllProjects(apiData.allProjects);
        setSelectedProjects(apiData.allProjects); // Initially select all projects
        setAllTriggers(apiData.allTriggers);
        setSelectedTrigger(ALL_TRIGGERS_KEY); // Default to all triggers

      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
        // Ensure table data is empty on error
        setFlakyStatsForTable([]); 
        setAllSummaries([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  React.useEffect(() => {
    if (allSummaries.length === 0 && !isLoading) {
        setFlakyStatsForTable([]);
        return;
    }

    let filteredSummaries = allSummaries;

    // 1. Filter by selectedTrigger
    if (selectedTrigger !== ALL_TRIGGERS_KEY) {
      filteredSummaries = filteredSummaries.filter(summary => summary.trigger === selectedTrigger);
    }

    // 2. Filter by selectedProjects
    if (selectedProjects.length > 0 && selectedProjects.length < allProjects.length) {
        filteredSummaries = filteredSummaries.filter(summary => 
            summary.tests.some(test => selectedProjects.includes(test.project))
        );
        // Important: After filtering summaries by project, we need to ensure tests within those summaries also reflect this project selection.
        // The calculateFlakinessStats function aggregates based on test.id (`title|project`).
        // If a summary is included because *one* of its tests matches a selected project,
        // but that summary also contains tests from *unselected* projects, those tests should ideally not contribute to stats.
        // For simplicity now, calculateFlakinessStats will process all tests within the filtered summaries.
        // A more precise approach would be to map/filter `summary.tests` array as well.
        // However, current `calculateFlakinessStats` takes `TestRunSummary[]` where each `TestRunSummary` is a whole run.
        // The project filtering logic on `FlakyStat` (done by `data.filter(stat => selectedProjects.includes(stat.project))` previously)
        // was simpler as it acted on already calculated stats. 
        // We will apply project filtering to the *final FlakyStat[]* for now, similar to before, for simplicity and correctness of `FlakyStat.project`.
    }

    const calculatedStats = calculateFlakinessStats(filteredSummaries);
    
    // Post-filter stats by project (if not all projects are selected)
    let finalStats = calculatedStats;
    if (selectedProjects.length > 0 && selectedProjects.length < allProjects.length) {
        finalStats = calculatedStats.filter(stat => selectedProjects.includes(stat.project));
    }

    setFlakyStatsForTable(finalStats);

  }, [allSummaries, selectedTrigger, selectedProjects, allProjects, isLoading]);


  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-10 w-full" /> {/* Filter bars placeholder*/}
        <Skeleton className="h-[500px] w-full" /> {/* Table placeholder*/}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
            <h1 className='text-3xl font-bold'>Flakiest Playwright Tests</h1>
            <ThemeToggle />
        </div>
      
      <DataTable 
        columns={columns} 
        data={flakyStatsForTable} 
        searchColumnId='title'
        allProjects={allProjects}
        selectedProjects={selectedProjects}
        onProjectFilterChange={setSelectedProjects}
        allTriggers={allTriggers}
        selectedTrigger={selectedTrigger}
        onTriggerFilterChange={setSelectedTrigger}
        allTriggersKey={ALL_TRIGGERS_KEY}
      />
    </div>
  );
} 