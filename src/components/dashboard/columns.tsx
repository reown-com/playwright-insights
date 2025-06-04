'use client'

import { FlakyStat } from '@/types'
import { ColumnDef, Column } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Helper for sparkline data
function getSparklineData(history: Array<{ status: 'passed' | 'failed' | 'skipped' }>) {
  return history.map((item, index) => ({
    name: index.toString(),
    value: item.status === 'failed' ? 1 : (item.status === 'passed' ? 0 : 0.5),
    statusChar: item.status === 'failed' ? 'F' : (item.status === 'passed' ? 'P' : 'S'),
  }));
}

// Helper to format duration or show N/A
const formatDuration = (ms?: number) => ms !== undefined ? `${ms} ms` : 'N/A';

export const columns: ColumnDef<FlakyStat>[] = [
  {
    id: 'rank',
    header: 'Rank',
    cell: ({ row }) => `#${row.index + 1}`,
    enableSorting: false,
    size: 50, // Smaller size for rank
  },
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const title = row.getValue('title') as string
      const id = row.original.id
      return (
        <Link href={`/test/${encodeURIComponent(id)}`} className='hover:underline'>
          {title}
        </Link>
      )
    },
    size: 350, 
  },
  {
    accessorKey: 'project',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Project
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <Badge variant="outline">{row.getValue('project')}</Badge>
    },
    size: 150,
  },
  {
    accessorKey: 'trigger',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Trigger
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const trigger = row.getValue('trigger') as string | undefined
      return trigger ? <Badge variant="secondary">{trigger}</Badge> : null
    },
    filterFn: (row, id, value) => {
      return value === "all" || row.getValue(id) === value
    },
    enableColumnFilter: true,
    meta: {
      filterComponent: ({ column }: { column: Column<FlakyStat> }) => {
        return (
          <Select
            onValueChange={(value) => column.setFilterValue(value)}
            defaultValue="all"
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Triggers</SelectItem>
              <SelectItem value="merge-queue">Merge Queue</SelectItem>
              <SelectItem value="pull-request">Pull Request</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    size: 120,
  },
  {
    accessorKey: 'runs',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Runs
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="text-right">{row.getValue('runs')}</div>
    },
    size: 60, 
  },
  {
    accessorKey: 'failures',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Failures
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="text-right">{row.getValue('failures')}</div>
    },
    size: 80, 
  },
  {
    accessorKey: 'failureRate',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Failure Rate
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const failureRate = row.getValue('failureRate') as number
      return <div className="text-right">{(failureRate * 100).toFixed(1)}%</div>
    },
    sortingFn: 'alphanumeric',
    size: 100, 
  },
  {
    id: 'trend',
    header: () => <div className='text-center'>Trend</div>,
    cell: ({ row }) => {
      const history = row.original.history;
      const data = getSparklineData(history);
      if (data.length < 2) { 
        return <div className='h-[30px] w-full flex items-center justify-center text-xs text-muted-foreground'>No trend</div>;
      }
      return (
        <div style={{ width: '100px', height: '30px', margin: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Tooltip 
                contentStyle={{ fontSize: '10px', padding: '2px 5px' }}
                labelFormatter={() => ''} 
                formatter={(value, name, props) => [`Status: ${props.payload.statusChar}`, null]} 
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    },
    enableSorting: false,
    size: 120,
  },
  // Duration Columns (initially hidden, now sortable)
  {
    accessorKey: 'durationStats.mean',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Avg Duration
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const duration = row.original.durationStats.mean
      return <div className="text-right">{duration ? `${duration.toFixed(2)}s` : '-'}</div>
    },
    size: 130,
    meta: { initiallyHidden: true },
  },
  {
    accessorKey: 'durationStats.p50',
    header: ({ column }) => (
      <Button 
        variant='ghost' 
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className='w-full flex items-center justify-end px-0 hover:bg-transparent'
      >
        P50 Duration
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => <div className='text-right'>{formatDuration(row.original.durationStats.p50)}</div>,
    size: 130,
    meta: { initiallyHidden: true },
  },
  {
    accessorKey: 'durationStats.p90',
    header: ({ column }) => (
      <Button 
        variant='ghost' 
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className='w-full flex items-center justify-end px-0 hover:bg-transparent'
      >
        P90 Duration
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => <div className='text-right'>{formatDuration(row.original.durationStats.p90)}</div>,
    size: 130,
    meta: { initiallyHidden: true },
  },
  {
    accessorKey: 'durationStats.p95',
    header: ({ column }) => (
      <Button 
        variant='ghost' 
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className='w-full flex items-center justify-end px-0 hover:bg-transparent'
      >
        P95 Duration
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => <div className='text-right'>{formatDuration(row.original.durationStats.p95)}</div>,
    size: 130,
    meta: { initiallyHidden: true },
  },
  // Example for actions, can be used for a link to detail page or other operations
  // {
  //   id: "actions",
  //   cell: ({ row }) => {
  //     const stat = row.original
  //     return (
  //       <Link href={`/test/${encodeURIComponent(stat.id)}`}>
  //         <Button variant="ghost" className="h-8 w-8 p-0">
  //           <span className="sr-only">Open details</span>
  //           <MoreHorizontal className="h-4 w-4" />
  //         </Button>
  //       </Link>
  //     )
  //   },
  // },
] 