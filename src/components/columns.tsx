
"use client";

import type { Project, Role } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { Edit, PlusCircle } from "lucide-react";
import { Button } from "./ui/button";

const statusColors: Record<string, string> = {
  // Workflow Statuses
  "Pending Allocation": "bg-gray-500/20 text-gray-700 border-gray-500/30",
  "With Processor": "bg-blue-500/20 text-blue-700 border-blue-500/30",
  "With QA": "bg-purple-500/20 text-purple-700 border-purple-500/30",
  "With Client": "bg-orange-500/20 text-orange-800 border-orange-500/30 font-bold",
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


export const allColumns: { key: keyof Project | 'actions' | 'select', header: string, render?: (p: Project) => React.ReactNode }[] = [
    { key: "row_number", header: "Row Number", render: (p: Project) => <div className="font-medium">{p.row_number}</div> },
    { key: "ref_number", header: "Ref Number" },
    { key: "client_name", header: "Client Name" },
    { key: "process", header: "Process" },
    { key: "processor", header: "Processor" },
    { key: "sender", header: "Sender" },
    { key: "subject_line", header: "Subject Line" },
    { key: "received_date", header: "Received Date" },
    { key: "case_manager", header: "Case Manager" },
    { key: "allocation_date", header: "Allocation Date" },
    { key: "processing_date", header: "Processing Date" },
    { key: "processing_status", header: "Processing Status" },
    { key: "application_number", header: "Application No" },
    { key: "patent_number", header: "Patent No" },
    { key: "country", header: "Country" },
    { key: "document_type", header: "Document Type" },
    { key: "action_taken", header: "Action Taken" },
    { key: "renewal_agent", header: "Renewal Agent" },
    { key: "client_query_description", header: "Client Query Description" },
    { key: "client_comments", header: "Client Comments" },
    { key: "client_error_description", header: "Client Error Description" },
    { key: "qa", header: "QA" },
    { key: "qa_date", header: "QA Date" },
    { key: "qa_status", header: "QA Status" },
    { key: "qa_remark", header: "QA Remark" },
    { key: "error", header: "Error" },
    { key: "rework_reason", header: "Rework Reason" },
    { key: "email_renaming", header: "Email Renaming" },
    { key: "email_forwarded", header: "Email Forwarded" },
    { key: "reportout_date", header: "Report-Out Date" },
    { key: "manager_name", header: "Manager Name" },
    { key: "clientquery_status", header: "Client Query Status" },
    { key: "client_response_date", header: "Client Response Date" },
    {
      key: "workflowStatus",
      header: "Workflow Status",
      render: (project: Project) => {
        let statusText: string = project.workflowStatus;
        let statusColorClass: string = statusColors[project.workflowStatus] || "bg-gray-500/20 text-gray-700"; // Default color

        // This simplified logic directly reflects the database `workflowStatus`.
        if (project.workflowStatus === 'With Processor') {
            statusText = project.processing_status;
            statusColorClass = statusColors[project.processing_status];
        } else if (project.workflowStatus === 'With QA') {
            statusText = `QA: ${project.qa_status}`;
            statusColorClass = statusColors[project.qa_status] || statusColors['With QA'];
        }
        // For 'With Client' and 'Completed', the statusText is already correct from project.workflowStatus
        // The color is also correctly picked up from the statusColors map.
        
        return (
          <Badge variant="outline" className={cn("capitalize", statusColorClass)}>
              {statusText}
          </Badge>
        )
      }
    },
];

export const getColumns = (
  isManagerOrAdmin: boolean,
  activeRole: Role,
  rowSelection: Record<string, boolean>,
  setRowSelection: (selection: Record<string, boolean>) => void,
  allProjectsOnPage: Project[],
  handleEditProject: (project: Project) => void,
  handleAddRows: (project: Project) => void,
  visibleColumnKeys: string[]
) => {

  const actionColumn = {
      key: 'actions',
      header: 'Actions',
      render: (project: Project) => (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => handleEditProject(project)}>
              <Edit className="h-4 w-4"/>
          </Button>
          {(activeRole === 'Admin' || activeRole === 'Processor' || activeRole === 'QA' || activeRole === 'Manager') && (
            <Button size="icon" variant="ghost" onClick={() => handleAddRows(project)}>
                <PlusCircle className="h-4 w-4"/>
            </Button>
          )}
        </div>
      )
  };
  
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
  
  const allPossibleColumns = [...allColumns];
  if (isManagerOrAdmin) {
    allPossibleColumns.unshift(selectionColumn);
  }
  allPossibleColumns.unshift(actionColumn);
  

  // Filter and order columns based on visibleColumnKeys
  const visibleColumns = visibleColumnKeys
    .map(key => allPossibleColumns.find(col => col.key === key))
    .filter((col): col is typeof allPossibleColumns[number] => !!col);

  return visibleColumns;

};
