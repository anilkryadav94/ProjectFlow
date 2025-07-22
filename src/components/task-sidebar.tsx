
"use client"

import type { Project, Role } from '@/lib/data';
import { Badge } from "@/components/ui/badge"
import {
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from './ui/button';
import { ArrowLeft, History, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TaskSidebarProps {
  project: Project;
  userRole: Role;
}

export function TaskSidebar({ project, userRole }: TaskSidebarProps) {
    const router = useRouter();

  return (
    <>
      <SidebarHeader className="border-b">
         <Button variant="ghost" onClick={() => router.back()} className="w-full justify-start">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
         </Button>
      </SidebarHeader>
      <SidebarContent>
        <div className="p-2 space-y-4">
            <h3 className="font-semibold px-2 text-sm flex items-center gap-2">
                <Info className="h-4 w-4"/>
                Task Info
            </h3>
            <div className="space-y-2 px-2 text-xs">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Ref Number:</span>
                    <span className="font-medium">{project.refNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-xs">{project.workflowStatus}</Badge>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{project.clientName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Process:</span>
                    <span className="font-medium">{project.process}</span>
                </div>
            </div>

            <SidebarSeparator />

            <h3 className="font-semibold px-2 text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                History
            </h3>
            <div className="space-y-3 px-2 text-xs">
                <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 h-4 w-4 rounded-full bg-blue-500 mt-0.5" />
                    <div>
                        <p className="font-medium">Allocated to {project.processor}</p>
                        <p className="text-muted-foreground">{project.allocationDate}</p>
                    </div>
                </div>
                {project.processingDate && (
                    <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-500 mt-0.5" />
                         <div>
                            <p className="font-medium">Processed by {project.processor}</p>
                            <p className="text-muted-foreground">{project.processingDate}</p>
                        </div>
                    </div>
                )}
                 {project.qaDate && (
                    <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 h-4 w-4 rounded-full bg-purple-500 mt-0.5" />
                         <div>
                            <p className="font-medium">QA'd by {project.qa}</p>
                            <p className="text-muted-foreground">{project.qaDate}</p>
                        </div>
                    </div>
                )}
            </div>
            
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <p className="text-xs text-muted-foreground px-2">Task ID: {project.id}</p>
      </SidebarFooter>
    </>
  );
}
