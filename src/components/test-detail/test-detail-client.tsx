'use client'

import * as React from 'react'
import { TestDetailsData } from '@/app/api/test-details/[id]/route' // Import the type
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, ArrowLeft } from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { format } from 'date-fns' // For formatting dates

async function getTestDetails(id: string): Promise<TestDetailsData> {
  const res = await fetch(`/api/test-details/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({}));
    console.error('API Error Response:', errorPayload);
    throw new Error(`Failed to fetch test details: ${res.statusText} - ${errorPayload.details || 'Unknown error'}`);
  }
  return res.json();
}

interface TestDetailClientProps {
  testId: string;
}

export default function TestDetailClient({ testId }: TestDetailClientProps) {
  const [data, setData] = React.useState<TestDetailsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedData = await getTestDetails(testId);
        setData(fetchedData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    if (testId) {
      loadData();
    }
  }, [testId]);

  const getStatusBadge = (status: 'passed' | 'failed' | 'skipped') => {
    switch (status) {
      case 'passed': return <Badge variant="default" className="bg-green-500 text-white">Passed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'skipped': return <Badge variant="secondary">Skipped</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4 mb-4" /> {/* Back link */}
        <Skeleton className="h-10 w-3/4 mb-2" /> {/* Title */}
        <Skeleton className="h-6 w-1/2 mb-6" /> {/* Project */}
        <Skeleton className="h-[300px] w-full" /> {/* Table placeholder*/}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
         <Link href="/" passHref>
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Test Details</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
        <div>
            <Link href="/" passHref>
            <Button variant="outline" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
            </Link>
            <p>No data available for this test.</p>
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Link href="/" passHref>
          <Button variant="outline" className="mb-4 w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
        <CardTitle className="truncate" title={data.title}>{data.title}</CardTitle>
        <CardDescription>
          Project: <Badge variant="outline">{data.project}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <h3 className="text-xl font-semibold mb-2">Run History</h3>
        <div className="rounded-md border">
            <Table>
            <TableCaption>A list of recent runs for this test.</TableCaption>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[250px]">Run ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Duration (ms)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.history.length > 0 ? data.history.map((run) => (
                <TableRow key={run.runId}>
                    <TableCell className="font-medium truncate" title={run.runId}>{run.runId}</TableCell>
                    <TableCell>{format(new Date(run.startedAt), 'PPP p')}</TableCell>
                    <TableCell>{getStatusBadge(run.status)}</TableCell>
                    <TableCell className="text-right">
                    {run.duration !== undefined ? `${run.duration} ms` : 'N/A'}
                    </TableCell>
                </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                        No run history found for this test.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
} 