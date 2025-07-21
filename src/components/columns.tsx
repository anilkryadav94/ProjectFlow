
"use client";

import type { Project, ProjectStatus } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

const statusColors: Record<ProjectStatus, string> = {
  Pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  Processing: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  QA: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  Complete: "bg-green-500/20 text-green-700 border-green-500/30",
  "On Hold": "bg-gray-500/20 text-gray-700 border-gray-500/30",
};

export const getColumns = (
  isManagerOrAdmin: boolean,
  rowSelection: Record<string, boolean>,
  setRowSelection: (selection: Record<string, boolean>) => void,
  allProjectsOnPage: Project[]
) => {
  const baseColumns = [
    {
      key: "refNumber" as const,
      header: "Ref Number",
      render: (project: Project) => (
         <Link href={`/task/${project.id}`} className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto font-medium text-primary")}>
              {project.refNumber}
          </Link>
      )
    },
    {
      key: "clientName" as const,
      header: "Client Name",
    },
    {
      key: "process" as const,
      header: "Process",
    },
    {
      key: "subject" as const,
      header: "Subject",
    },
    {
      key: "applicationNumber" as const,
      header: "Application No.",
    },
    {
      key: "patentNumber" as const,
      header: "Patent No.",
    },
    {
      key: "emailDate" as const,
      header: "Email Date",
    },
    {
      key: "allocationDate" as const,
      header: "Allocation Date",
    },
    {
      key: "processor" as const,
      header: "Processor",
    },
    {
      key: "qa" as const,
      header: "QA",
    },
    {
      key: "status" as const,
      header: "Status",
      render: (project: Project) => (
          <Badge variant="outline" className={cn("capitalize", statusColors[project.status])}>
              {project.status}
          </Badge>
      )
    },
  ];

  if (isManagerOrAdmin) {
    const selectionColumn = {
      key: "select",
      header: (
        <Checkbox
          checked={
            Object.keys(rowSelection).length > 0 &&
            allProjectsOnPage.every((p) => rowSelection[p.id])
          }
          onCheckedChange={(value) => {
            const newSelection = { ...rowSelection };
            allProjectsOnPage.forEach((p) => {
              if (value) {
                newSelection[p.id] = true;
              } else {
                delete newSelection[p.id];
              }
            });
            setRowSelection(newSelection);
          }}
          aria-label="Select all"
        />
      ),
      render: (project: Project) => (
        <Checkbox
          checked={rowSelection[project.id] || false}
          onCheckedChange={(value) => {
             const newSelection = { ...rowSelection };
             if(value) {
                newSelection[project.id] = true;
             } else {
                delete newSelection[project.id];
             }
             setRowSelection(newSelection)
          }}
          aria-label="Select row"
        />
      ),
    };
    return [selectionColumn, ...baseColumns];
  }

  return baseColumns;
};

    