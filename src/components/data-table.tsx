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
    key: keyof Project | 'actions' | 'subject' | 'clientName' | 'process';
    header: string;
    render?: (project: Project, onProjectUpdate: (project: Project) => void) => React.ReactNode;
  }[];
  sort: { key: keyof Project; direction: 'asc' | 'desc' } | null;
  setSort: (sort: { key: keyof Project; direction: 'asc' | 'desc' } | null) => void;
  onProjectUpdate: (project: Project) => void;
  onRowClick?: (project: Project) => void;
  activeProjectId?: string;
}

export function DataTable({ data, columns, sort, setSort, onProjectUpdate, onRowClick, activeProjectId }: DataTableProps) {
  const handleSort = (key: keyof Project) => {
    if (sort && sort.key === key) {
      setSort({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ key, direction: 'asc' });
    }
  };

  return (
    <div className="rounded-md border bg-card overflow-y-auto relative max-h-[calc(100vh-420px)]">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>
                {column.key !== 'actions' ? (
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort(column.key as keyof Project)}
                  >
                    {column.header}
                    {sort?.key === column.key && (
                      sort.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length ? (
            data.map((row) => (
              <TableRow 
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                    onRowClick && 'cursor-pointer',
                    activeProjectId === row.id && 'bg-muted/80'
                )}
              >
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render ? column.render(row, onProjectUpdate) : (row[column.key as keyof Project] ?? 'N/A')}
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
  )
}
