
"use client";

import type { Project, Role } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

const statusColors: Record<string, string> = {
  // Workflow Statuses
  "Pending Allocation": "bg-gray-500/20 text-gray-700 border-gray-500/30",
  "With Processor": "bg-blue-500/20 text-blue-700 border-blue-500/30",
  "With QA": "bg-purple-500/20 text-purple-700 border-purple-500/30",
  "Completed": "bg-green-500/20 text-green-700 border-green-500/30",

  // Processor Statuses
  "Pending": "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  "On Hold": "bg-orange-500/20 text-orange-700 border-orange-500/30",
  "Re-Work": "bg-red-500/20 text-red-800 border-red-500/30 font-bold",
  "Processed": "bg-green-500/20 text-green-700 border-green-500/30",
  "NTP": "bg-indigo-500/20 text-indigo-700 border-indigo-500/30",
  "Client Query": "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
  "Already Processed": "bg-gray-500/20 text-gray-600 border-gray-500/30",

  // QA Statuses
  "Complete": "bg-green-500/20 text-green-700 border-green-500/30",
};


export const getColumns = (
  isManagerOrAdmin: boolean,
  rowSelection: Record<string, boolean>,
  setRowSelection: (selection: Record<string, boolean>) => void,
  allProjectsOnPage: Project[],
  activeRole: Role,
  searchParams: { search: string, searchColumn: string, clientName: string, process: string }
) => {

  const navigationSearchParams = new URLSearchParams();
  if (searchParams.search) navigationSearchParams.set('search', searchParams.search);
  if (searchParams.searchColumn) navigationSearchParams.set('searchColumn', searchParams.searchColumn);
  if (searchParams.clientName) navigationSearchParams.set('clientName', searchParams.clientName);
  if (searchParams.process) navigationSearchParams.set('process', searchParams.process);
  navigationSearchParams.set('role', activeRole);
  const queryString = navigationSearchParams.toString();


  const baseColumns = [
    {
      key: "refNumber" as const,
      header: "Ref Number",
      render: (project: Project) => (
         <Link 
              href={`/task/${project.id}?${queryString}`} 
              className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto font-medium text-primary")}
          >
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
      key: "workflowStatus" as const,
      header: "Status",
      render: (project: Project) => {
        let statusText: string = project.workflowStatus;
        let statusColorClass = statusColors[project.workflowStatus];

        if (project.workflowStatus === 'With Processor') {
            statusText = project.processorStatus;
            statusColorClass = statusColors[project.processorStatus];
        } else if (project.workflowStatus === 'With QA') {
            statusText = `QA: ${project.qaStatus} (P: ${project.processorStatus})`;
            statusColorClass = statusColors[project.qaStatus] || statusColors['With QA'];
        } else if (project.workflowStatus === 'Completed') {
             statusText = `QA: ${project.qaStatus} (P: ${project.processorStatus})`;
             statusColorClass = statusColors['Completed'];
        }
        
        return (
          <Badge variant="outline" className={cn("capitalize", statusColorClass)}>
              {statusText}
          </Badge>
        )
      }
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
                delete newSelection[p.id];
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

    