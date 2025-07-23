
"use client";

import type { Project, Role } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { Save, XCircle, Edit } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { processors, qas } from "@/lib/data";


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
  editingRowId: string | null,
  startEditing: (id: string) => void,
  cancelEditing: () => void,
  editedData: Partial<Project> | null,
  setEditedData: (data: Partial<Project> | null) => void,
  handleUpdateProject: () => void,
  isUpdating: boolean
) => {

  const baseColumns = [
    {
      key: "refNumber" as const,
      header: "Ref Number",
      render: (project: Project) => (
         <div className="font-medium text-primary">
            {project.refNumber}
         </div>
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
      render: (project: Project) => {
          if (editingRowId === project.id) {
              return (
                   <Select
                        value={editedData?.processor ?? project.processor}
                        onValueChange={(value) => setEditedData({ ...editedData, processor: value })}
                    >
                        <SelectTrigger className="w-full h-8">
                            <SelectValue placeholder="Select Processor" />
                        </SelectTrigger>
                        <SelectContent>
                            {processors.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
              )
          }
          return project.processor
      }
    },
    {
      key: "qa" as const,
      header: "QA",
       render: (project: Project) => {
          if (editingRowId === project.id) {
              return (
                   <Select
                        value={editedData?.qa ?? project.qa}
                        onValueChange={(value) => setEditedData({ ...editedData, qa: value })}
                    >
                        <SelectTrigger className="w-full h-8">
                            <SelectValue placeholder="Select QA" />
                        </SelectTrigger>
                        <SelectContent>
                            {qas.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
              )
          }
          return project.qa
      }
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
            statusText = `QA: ${project.qaStatus}`;
            statusColorClass = statusColors[project.qaStatus] || statusColors['With QA'];
        } else if (project.workflowStatus === 'Completed') {
             statusText = `QA: ${project.qaStatus}`;
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

  let columns = [...baseColumns];

  const actionColumn = {
      key: 'actions',
      header: 'Actions',
      render: (project: Project) => {
          if (editingRowId === project.id) {
              return (
                  <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={handleUpdateProject} disabled={isUpdating}>
                          <Save className="h-4 w-4 text-green-600"/>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEditing} disabled={isUpdating}>
                          <XCircle className="h-4 w-4 text-red-600"/>
                      </Button>
                  </div>
              )
          }
          return (
              <Button size="icon" variant="ghost" onClick={() => startEditing(project.id)}>
                  <Edit className="h-4 w-4"/>
              </Button>
          )
      }
  }
  columns.unshift(actionColumn);

  if (isManagerOrAdmin) {
    const selectionColumn = {
      key: "select",
      header: (
        <Checkbox
          checked={
            Object.keys(rowSelection).length > 0 &&
            allProjectsOnPage.length > 0 &&
            allProjectsOnPage.every((p) => rowSelection[p.id])
          }
          onCheckedChange={(value) => {
            const newSelection = { ...rowSelection };
            allProjectsOnPage.forEach((project) => {
              if (value) {
                newSelection[project.id] = true;
              } else {
                delete newSelection[project.id];
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
    columns.unshift(selectionColumn);
  }

  return columns;
};
