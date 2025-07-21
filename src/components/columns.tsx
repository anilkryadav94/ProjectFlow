
"use client";

import Link from "next/link";
import type { Project, ProjectStatus } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const statusColors: Record<ProjectStatus, string> = {
  Pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  Processing: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  QA: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  Complete: "bg-green-500/20 text-green-700 border-green-500/30",
  "On Hold": "bg-gray-500/20 text-gray-700 border-gray-500/30",
};

export const columns = [
  {
    key: "refNumber" as const,
    header: "Ref Number",
    render: (project: Project) => (
        <Button variant="link" asChild className="p-0 h-auto">
             <Link href={`/task/${project.id}`} className="font-medium">
                {project.refNumber}
            </Link>
        </Button>
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
