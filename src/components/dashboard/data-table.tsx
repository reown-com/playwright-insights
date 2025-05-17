'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchColumnId?: string
  // Project filter props
  allProjects?: string[]
  selectedProjects?: string[]
  onProjectFilterChange?: (selected: string[]) => void
  // Trigger filter props
  allTriggers?: string[]
  selectedTrigger?: string
  onTriggerFilterChange?: (selected: string) => void
  allTriggersKey?: string // Key for "All Triggers" option
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumnId = 'title',
  allProjects = [],
  selectedProjects = [],
  onProjectFilterChange,
  allTriggers = [],
  selectedTrigger = '__ALL_TRIGGERS__', // Default from client
  onTriggerFilterChange,
  allTriggersKey = '__ALL_TRIGGERS__', // Default from client
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'failureRate', desc: true }, 
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  
  // Initialize column visibility based on column meta
  const initialColumnVisibility = React.useMemo(() => {
    const visibility: VisibilityState = {};
    columns.forEach(col => {
      const columnDef = col as ColumnDef<TData, unknown> & { meta?: { initiallyHidden?: boolean } };
      if (columnDef.meta?.initiallyHidden && columnDef.id) {
        visibility[columnDef.id] = false;
      }
    });
    return visibility;
  }, [columns]);

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 25, 
      }
    }
  })

  const handleProjectToggle = (project: string) => {
    if (!onProjectFilterChange) return;
    const newSelected = selectedProjects.includes(project)
      ? selectedProjects.filter(p => p !== project)
      : [...selectedProjects, project];
    onProjectFilterChange(newSelected);
  };

  return (
    <div>
      {/* Filters and Column Visibility */}
      <div className="flex items-center justify-between py-4 gap-2">
        {/* Search Input - takes available space */} 
        <div className="flex-grow">
            {searchColumnId && (
            <Input
                placeholder={`Filter by ${searchColumnId}...`}
                value={(table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                table.getColumn(searchColumnId)?.setFilterValue(event.target.value)
                }
                className="max-w-sm w-full"
            />
            )}
        </div>

        {/* Filter Buttons - grouped to the right */}
        <div className="flex items-center gap-2">
            {/* Trigger Filter Dropdown */}
            {allTriggers.length > 0 && onTriggerFilterChange && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    Trigger: {selectedTrigger === allTriggersKey ? 'All' : selectedTrigger} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Trigger</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={selectedTrigger} onValueChange={onTriggerFilterChange}>
                    <DropdownMenuRadioItem value={allTriggersKey!}>All Triggers</DropdownMenuRadioItem>
                    {allTriggers.map((trigger) => (
                    <DropdownMenuRadioItem key={trigger} value={trigger}>
                        {trigger}
                    </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            )}

            {/* Project Filter Dropdown */}
            {allProjects.length > 0 && onProjectFilterChange && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    Projects <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Project</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allProjects.map((project) => (
                    <DropdownMenuCheckboxItem
                    key={project}
                    checked={selectedProjects.includes(project)}
                    onCheckedChange={() => handleProjectToggle(project)}
                    >
                    {project}
                    </DropdownMenuCheckboxItem>
                ))}
                </DropdownMenuContent>
            </DropdownMenu>
            )}

            {/* Column Visibility Dropdown */}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                    return (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                        }
                    >
                        {column.id}
                    </DropdownMenuCheckboxItem>
                    )
                })}
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
} 