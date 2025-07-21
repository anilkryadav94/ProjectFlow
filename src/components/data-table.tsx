
"use client"

import * as React from "react"
import Papa from "papaparse"
import { ArrowDown, ArrowUp, FileSpreadsheet } from "lucide-react"
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
import { Button } from "./ui/button"

interface DataTableProps {
  data: Project[];
  columns: {
    key: keyof Project | 'subject' | 'clientName' | 'process';
    header: string;
    render?: (project: Project) => React.ReactNode;
  }[];
  sort: { key: keyof Project; direction: 'asc' | 'desc' } | null;
  setSort: (sort: { key: keyof Project; direction: 'asc' | 'desc' } | null) => void;
  onRowClick?: (project: Project) => void;
  activeProjectId?: string;
  isTaskView: boolean;
  projectsToDownload: Project[];
}

export function DataTable({ data, columns, sort, setSort, onRowClick, activeProjectId, isTaskView, projectsToDownload }: DataTableProps) {
  const handleSort = (key: keyof Project) => {
    if (sort && sort.key === key) {
      setSort({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ key, direction: 'asc' });
    }
  };
  
  const handleDownload = () => {
    if (!projectsToDownload || projectsToDownload.length === 0) {
      return;
    }
    const csv = Papa.unparse(projectsToDownload);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `projects_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const maxHeightClass = isTaskView
    ? "h-full"
    : "max-h-[calc(100vh-280px)]";


  return (
    <div className={cn("animated-border shadow-xl", maxHeightClass)}>
      <div className={cn("rounded-md border bg-card overflow-y-auto relative h-full")}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-primary/40 backdrop-blur-sm">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className="text-primary-foreground/90">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => handleSort(column.key as keyof Project)}
                    >
                      {column.header}
                      {sort?.key === column.key && (
                        sort.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                </TableHead>
              ))}
              <TableHead className="text-right">
                  <Button variant="ghost" size="icon" onClick={handleDownload} disabled={projectsToDownload.length === 0} className="h-8 w-8 text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary/40">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="sr-only">Download CSV</span>
                  </Button>
              </TableHead>
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
                      {column.render ? column.render(row) : (row[column.key as keyof Project] ?? 'N/A')}
                    </TableCell>
                  ))}
                  <TableCell></TableCell>
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
