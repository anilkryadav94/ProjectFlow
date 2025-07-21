"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectForm } from "./project-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import type { Project } from "@/lib/data";
import { MultiMattersForm } from "./multi-matters-form";

interface DataTableRowActionsProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

export function DataTableRowActions({ project, onProjectUpdate }: DataTableRowActionsProps) {
  const [isEditFormOpen, setIsEditFormOpen] = React.useState(false);
  const [isMMFormOpen, setIsMMFormOpen] = React.useState(false);

  return (
    <>
      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsEditFormOpen(true); }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                </DropdownMenuItem>
            </DialogTrigger>
            <DropdownMenuSeparator />
             <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsMMFormOpen(true); }}>
                    <PlusSquare className="mr-2 h-4 w-4" />
                    Add MM Records
                </DropdownMenuItem>
             </DialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectForm project={project} onFormSubmit={onProjectUpdate} setOpen={setIsEditFormOpen}/>
        </DialogContent>
      </Dialog>
      <Dialog open={isMMFormOpen} onOpenChange={setIsMMFormOpen}>
        <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
                <DialogTitle>Add Multimatters Records</DialogTitle>
            </DialogHeader>
            <MultiMattersForm project={project} setOpen={setIsMMFormOpen} />
        </DialogContent>
      </Dialog>
    </>
  );
}
