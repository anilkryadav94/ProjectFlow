
"use client";

import * as React from "react";
import { Pencil, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "./project-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import type { Project, Role } from "@/lib/data";
import { MultiMattersForm } from "./multi-matters-form";

interface DataTableRowActionsProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  role: Role;
}

export function DataTableRowActions({ project, onProjectUpdate, role }: DataTableRowActionsProps) {
  const [isEditFormOpen, setIsEditFormOpen] = React.useState(false);
  const [isMMFormOpen, setIsMMFormOpen] = React.useState(false);

  return (
    <>
      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[75vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="flex-grow min-h-0">
             <ProjectForm 
                project={project} 
                onFormSubmit={onProjectUpdate} 
                setOpen={setIsEditFormOpen}
                role={role}
              />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
