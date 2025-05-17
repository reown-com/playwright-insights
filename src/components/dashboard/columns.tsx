'use client'

import { FlakyStat } from '@/types'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

// Helper for sparkline data
const getSparklineData = (history: ('P' | 'F' | 'S')[]) => {
  if (history.length === 0) return [];
  return history.map((status, index) => ({
    name: index.toString(),
    value: status === 'F' ? 1 : (status === 'P' ? 0 : 0.5), // F=1, P=0, S=0.5 (for visual distinction if needed)
    statusChar: status,
  }));
};

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
    header: 'Title',
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
    header: 'Project',
    cell: ({ row }) => <Badge variant='outline'>{row.getValue('project')}</Badge>,
    size: 150,
  },
  {
    accessorKey: 'runs',
    header: () => <div className='text-center'>Runs</div>,
    cell: ({ row }) => <div className='text-center'>{row.getValue('runs')}</div>,
    size: 60, 
  },
  {
    accessorKey: 'failures',
    header: ({ column }) => (
      <Button
        variant='ghost'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className='w-full flex items-center justify-center'
      >
        Failures
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => <div className='text-center'>{row.getValue('failures')}</div>,
    size: 80, 
  },
  {
    accessorKey: 'failureRate',
    header: ({ column }) => (
      <Button
        variant='ghost'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className='w-full flex items-center justify-center'
      >
        Failure Rate
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => {
      const rate = parseFloat(row.getValue('failureRate'))
      return <div className='text-center font-medium'>{`${(rate * 100).toFixed(0)}%`}</div>
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
    accessorKey: 'durationAvg',
    header: ({ column }) => (
      <Button 
        variant='ghost' 
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className='w-full flex items-center justify-end px-0 hover:bg-transparent' // Adjusted for right alignment
      >
        Avg Duration
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => <div className='text-right'>{formatDuration(row.getValue('durationAvg'))}</div>,
    size: 130, // Slightly increased size for sort icon
    meta: { initiallyHidden: true },
  },
  {
    accessorKey: 'durationMin',
    header: ({ column }) => (
      <Button 
        variant='ghost' 
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className='w-full flex items-center justify-end px-0 hover:bg-transparent'
      >
        Min Duration
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => <div className='text-right'>{formatDuration(row.getValue('durationMin'))}</div>,
    size: 130,
    meta: { initiallyHidden: true },
  },
  {
    accessorKey: 'durationMax',
    header: ({ column }) => (
      <Button 
        variant='ghost' 
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className='w-full flex items-center justify-end px-0 hover:bg-transparent'
      >
        Max Duration
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => <div className='text-right'>{formatDuration(row.getValue('durationMax'))}</div>,
    size: 130,
    meta: { initiallyHidden: true },
  },
  {
    accessorKey: 'durationP50',
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
    cell: ({ row }) => <div className='text-right'>{formatDuration(row.getValue('durationP50'))}</div>,
    size: 130,
    meta: { initiallyHidden: true },
  },
  {
    accessorKey: 'durationP99',
    header: ({ column }) => (
      <Button 
        variant='ghost' 
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className='w-full flex items-center justify-end px-0 hover:bg-transparent'
      >
        P99 Duration
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => <div className='text-right'>{formatDuration(row.getValue('durationP99'))}</div>,
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