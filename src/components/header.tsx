"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { ChevronsUpDown, Download, PlusCircle, Search, UserCircle, Workflow } from "lucide-react"
import type { Project, Role } from "@/lib/data"
import { roles } from "@/lib/data"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { DateRangePicker } from "@/components/date-range-picker"
import { ProjectForm } from "./project-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { TabsList, TabsTrigger } from "./ui/tabs"

interface HeaderProps {
    search: string;
    setSearch: (search: string) => void;
    role: Role;
    setRole: (role: Role) => void;
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    onExport: () => void;
    onProjectUpdate: (project: Project) => void;
}

export function Header({ search, setSearch, role, setRole, date, setDate, onExport, onProjectUpdate }: HeaderProps) {
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-2">
          <Workflow className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">ProjectFlow</h2>
        </div>
        <div className="flex items-center space-x-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-48 justify-between">
                       <UserCircle className="mr-2 h-4 w-4" />
                        {role}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                    <DropdownMenuLabel>Select Role</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={role} onValueChange={(value) => setRole(value as Role)}>
                        {roles.map((r) => (
                             <DropdownMenuRadioItem key={r} value={r}>{r}</DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={onExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Create Project</DialogTitle>
                </DialogHeader>
                <ProjectForm onFormSubmit={onProjectUpdate} setOpen={setIsFormOpen}/>
              </DialogContent>
            </Dialog>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            {(role === 'Admin' || role === 'Manager') && (
              <TabsTrigger value="manager">Manager Tools</TabsTrigger>
            )}
        </TabsList>
        <div className="flex items-center space-x-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Quick search..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <DateRangePicker date={date} setDate={setDate} />
        </div>
      </div>
    </div>
  )
}
