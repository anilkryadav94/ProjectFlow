
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
    key: keyof Project | 'subject' | 'clientName' | 'process' | 'actions';
    header: string;
    render?: (project: Project, isClickable?: boolean) => React.ReactNode;
    isClickable?: boolean;
  }[];
  sort: { key: keyof Project; direction: 'asc' | 'desc' } | null;
  setSort: (sort: { key: keyof Project; direction: 'asc' | 'desc' } | null) => void;
}

export function DataTable({ data, columns, sort, setSort }: DataTableProps) {
  const handleSort = (key: keyof Project) => {
    if (sort && sort.key === key) {
      setSort({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ key, direction: 'asc' });
    }
  };

  return (
    <div className={cn("animated-border shadow-xl h-full")}>
      <div className={cn("rounded-md border bg-card overflow-y-auto relative h-full")}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-primary backdrop-blur-sm">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className="text-primary-foreground/90">
                    <div
                      className={cn("flex items-center gap-2", column.key !== 'actions' && "cursor-pointer")}
                      onClick={() => column.key !== 'actions' && handleSort(column.key as keyof Project)}
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
            {data.length ? (
              data.map((row) => (
                <TableRow 
                  key={row.id}
                  data-state={undefined}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render ? column.render(row, column.isClickable) : (row[column.key as keyof Project] ?? 'N/A')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
