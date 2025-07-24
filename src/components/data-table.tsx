
"use client"

import * as React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import type { Project } from "@/lib/data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface DataTableProps {
  data: Project[];
  columns: {
    key: string;
    header: React.ReactNode;
    render?: (project: Project) => React.ReactNode;
  }[];
  sort: { key: keyof Project; direction: 'asc' | 'desc' } | null;
  setSort: (sort: { key: keyof Project; direction: 'asc' | 'desc' } | null) => void;
  rowSelection: Record<string, boolean>;
  setRowSelection: (selection: Record<string, boolean>) => void;
  isManagerOrAdmin: boolean;
  totalCount: number;
}

export function DataTable({ 
    data, 
    columns, 
    sort, 
    setSort, 
    rowSelection, 
    setRowSelection,
    isManagerOrAdmin, 
    totalCount
}: DataTableProps) {
  const handleSort = (key: string) => {
    if (key === 'select' || key === 'actions') return;
    const projectKey = key as keyof Project;
    if (sort && sort.key === projectKey) {
      setSort({ key: projectKey, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ key: projectKey, direction: 'asc' });
    }
  };

  return (
    <div className={cn("h-full flex flex-col")}>
       <div className={cn("flex-grow rounded-t-md border bg-card relative overflow-y-auto")}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-primary">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className="text-primary-foreground/90">
                    <div
                      className={cn("flex items-center gap-2", !['select', 'actions'].includes(column.key) && "cursor-pointer")}
                      onClick={() => handleSort(column.key)}
                    >
                      {column.header}
                      {sort?.key === column.key && (
                        sort.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((row) => (
                <TableRow 
                  key={row.id}
                  data-state={rowSelection[row.id] ? "selected" : undefined}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={cn(column.key === 'select' && 'pr-0')}>
                      {column.render ? column.render(row) : (row[column.key as keyof Project] ?? 'N/A')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <div className="rounded-b-md border border-t-0 bg-card">
         
         <div className="flex items-center justify-end p-2 text-sm text-card-foreground">
             {totalCount > 0 && <span>Total items: {totalCount}</span>}
         </div>
       </div>
    </div>
  )
}

    