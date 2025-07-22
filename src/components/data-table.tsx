
"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react"
import type { Project } from "@/lib/data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "./ui/button"
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
  children?: React.ReactNode;
  totalCount: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
}

export function DataTable({ 
    data, 
    columns, 
    sort, 
    setSort, 
    rowSelection, 
    setRowSelection, 
    isManagerOrAdmin, 
    children, 
    totalCount,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage
}: DataTableProps) {
  const handleSort = (key: string) => {
    if (key === 'select') return;
    const projectKey = key as keyof Project;
    if (sort && sort.key === projectKey) {
      setSort({ key: projectKey, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ key: projectKey, direction: 'asc' });
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className={cn("animated-border shadow-xl h-full flex flex-col")}>
      <div className={cn("rounded-t-md border bg-card overflow-y-auto relative flex-grow")}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-primary backdrop-blur-sm">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className="text-primary-foreground/90">
                    <div
                      className={cn("flex items-center gap-2", column.key !== 'select' && "cursor-pointer")}
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
            {data.length ? (
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

       <div className="flex-shrink-0 rounded-b-md border border-t-0">
         {children}
         {totalCount > 0 && (
          <div className="flex items-center justify-between p-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select
                value={`${itemsPerPage}`}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={itemsPerPage} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
                <span>
                    {startItem} - {endItem} of {totalCount}
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                     <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
          </div>
         )}
       </div>
    </div>
  )
}
