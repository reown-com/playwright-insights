'use client'

import * as React from 'react'
import type { FlakyStat } from '@/types/index'
import { columns } from './columns'
import { DataTable } from './data-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { ThemeToggle } from '@/components/theme-toggle'
import { FlakinessApiData } from '@/app/api/flakiness-data/route'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

async function getDashboardData(year?: number, month?: number): Promise<FlakinessApiData> {
  let url = '/api/flakiness-data';
  if (year && month) {
    url += `?year=${year}&month=${month}`;
  }
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({}))
    throw new Error(`Failed to fetch data: ${res.statusText} - ${errorPayload.details || 'Unknown error'}`);
  }
  const data = await res.json();
  
  // Validate required fields
  if (!data.flakinessStats || !data.allTriggers || !data.allProjects || !data.year || !data.month || !data.availableDates) {
    throw new Error('API response missing required fields');
  }
  
  return data;
}

const ALL_TRIGGERS_KEY = '__ALL_TRIGGERS__'; // Special key for selecting all triggers

function getYearMonthPairs(availableDates: FlakinessApiData['availableDates']) {
  const pairs: { year: number; month: number }[] = [];
  for (const year of availableDates.years) {
    for (const month of availableDates.monthsByYear[year] || []) {
      pairs.push({ year, month });
    }
  }
  // Sort descending (most recent first)
  return pairs.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
}

export default function DashboardClient() {
  const [allFlakyStats, setAllFlakyStats] = React.useState<FlakyStat[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [allProjects, setAllProjects] = React.useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = React.useState<string[]>([]);

  const [allTriggers, setAllTriggers] = React.useState<string[]>([]);
  const [selectedTrigger, setSelectedTrigger] = React.useState<string>(ALL_TRIGGERS_KEY); // Default to all

  const [availableDates, setAvailableDates] = React.useState<FlakinessApiData['availableDates'] | null>(null);
  const [selectedYearMonth, setSelectedYearMonth] = React.useState<string>('');

  // Fetch data for a specific year/month
  const fetchData = React.useCallback(async (year?: number, month?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const apiData = await getDashboardData(year, month);
      setAllProjects(apiData.allProjects);
      setSelectedProjects(apiData.allProjects); // Initially select all projects
      setAllTriggers(apiData.allTriggers);
      setSelectedTrigger(ALL_TRIGGERS_KEY); // Default to all triggers
      setAllFlakyStats(apiData.flakinessStats);
      setAvailableDates(apiData.availableDates);
      if (apiData.year && apiData.month) {
        setSelectedYearMonth(`${apiData.year}-${apiData.month.toString().padStart(2, '0')}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
      setAllFlakyStats([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter stats based on selected trigger and project
  const filteredStats = React.useMemo(() => {
    let filtered = allFlakyStats;

    if (selectedTrigger && selectedTrigger !== ALL_TRIGGERS_KEY) {
      filtered = filtered.filter(stat => stat.trigger === selectedTrigger);
    }

    if (selectedProjects?.length > 0 && selectedProjects?.length < allProjects?.length) {
      filtered = filtered.filter(stat => selectedProjects.includes(stat.project));
    }

    return filtered;
  }, [allFlakyStats, selectedTrigger, selectedProjects, allProjects]);

  // Handle year/month change
  const handleYearMonthChange = (value: string) => {
    setSelectedYearMonth(value);
    const [year, month] = value.split('-').map(Number);
    fetchData(year, month);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className='text-3xl font-bold'>Flakiest Playwright Tests</h1>
        <ThemeToggle />
      </div>
      {availableDates && (
        <div className="mb-4 flex items-center gap-4">
          <Select value={selectedYearMonth} onValueChange={handleYearMonthChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              {getYearMonthPairs(availableDates).map(({ year, month }) => (
                <SelectItem key={`${year}-${month}`} value={`${year}-${month.toString().padStart(2, '0')}`}>{`${year}-${month.toString().padStart(2, '0')}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <DataTable 
          columns={columns} 
          data={filteredStats} 
          searchColumnId='title'
          allProjects={allProjects}
          selectedProjects={selectedProjects}
          onProjectFilterChange={setSelectedProjects}
          allTriggers={allTriggers}
          selectedTrigger={selectedTrigger}
          onTriggerFilterChange={setSelectedTrigger}
          allTriggersKey={ALL_TRIGGERS_KEY}
        />
      )}
    </div>
  );
} 