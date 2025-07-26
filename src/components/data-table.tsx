
"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import type { Project, Role } from "@/lib/data"
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
import { usePathname, useRouter, useSearchParams } from "next/navigation"

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
  activeRole: Role;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  isFetching?: boolean;
}

export function DataTable({ 
    data, 
    columns, 
    sort, 
    setSort, 
    rowSelection, 
    setRowSelection,
    isManagerOrAdmin, 
    totalCount,
    activeRole,
    page,
    totalPages,
    onPageChange,
    isFetching,
}: DataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSort = (key: string) => {
    if (key === 'select' || key === 'actions' || !isManagerOrAdmin) return;
    const projectKey = key as keyof Project;

    const newSort = {
        key: projectKey,
        direction: (sort && sort.key === projectKey && sort.direction === 'asc') ? 'desc' : 'asc'
    }
    setSort(newSort);

    if (onPageChange) { // This implies server-side sorting
        const params = new URLSearchParams(searchParams);
        params.set('sort', newSort.key);
        params.set('dir', newSort.direction);
        router.push(`${pathname}?${params.toString()}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
        onPageChange(newPage);
    }
  }
  
  const renderEmptyState = () => {
    if (isFetching) {
        return (
            <div className="flex items-center justify-center h-full text-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    let message = "No results found.";
    
    if (activeRole === 'Processor' || activeRole === 'QA') {
        message = "There are currently no tasks assigned to you. Please contact your manager for further assignments.";
    } else if (activeRole === 'Case Manager') {
        message = "Your dashboard is up to date — there are no pending queries at the moment.";
    } else if (isManagerOrAdmin) {
        message = "No projects found matching your search criteria."
    }

    return (
        <div className="flex items-center justify-center h-full text-center p-8">
            <p className="text-muted-foreground">{message}</p>
        </div>
    );
  };
  
  const showPagination = isManagerOrAdmin && totalPages && totalPages > 1;

  return (
    <div className={cn("h-full flex flex-col")}>
       <div className={cn("flex-grow rounded-t-md border bg-card relative overflow-y-auto")}>
        {data.length > 0 || isFetching ? (
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
                    {isFetching && data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                            </TableCell>
                        </TableRow>
                    ) : data.map((row) => (
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
                    ))}
                </TableBody>
            </Table>
        ) : (
            renderEmptyState()
        )}
      </div>

       <div className="flex-shrink-0 rounded-b-md border border-t-0 bg-card">
         <div className="flex items-center justify-between p-2 text-sm text-card-foreground">
             <div className="flex-1 text-left">
                {Object.keys(rowSelection).length > 0 && <span>{Object.keys(rowSelection).length} selected</span>}
             </div>
             {showPagination && page && totalPages && handlePageChange && (
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || isFetching}>
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <span>Page {page} of {totalPages}</span>
                     <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || isFetching}>
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
             )}
             <div className="flex-1 text-right">
                {totalCount > 0 && <span>Total items: {totalCount}</span>}
             </div>
         </div>
       </div>
    </div>
  )
}
