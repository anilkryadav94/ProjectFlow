"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { ChevronsUpDown, Download, PlusCircle, Search, UserCircle, Workflow } from "lucide-react"
import type { Project, Role, ProcessType } from "@/lib/data"
import { roles, clientNames, processes } from "@/lib/data"
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
import { ProjectForm } from "./project-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { TabsList, TabsTrigger } from "./ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface HeaderProps {
    search: string;
    setSearch: (search: string) => void;
    role: Role;
    setRole: (role: Role) => void;
    onProjectUpdate: (project: Project) => void;
    clientNameFilter: string;
    setClientNameFilter: (client: string) => void;
    processFilter: ProcessType | 'all';
    setProcessFilter: (process: ProcessType | 'all') => void;
}

export function Header({ search, setSearch, role, setRole, onProjectUpdate, clientNameFilter, setClientNameFilter, processFilter, setProcessFilter }: HeaderProps) {
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const getDashboardName = () => {
    switch(role) {
      case 'Processor':
        return 'Processor Dashboard';
      case 'QA':
        return 'QA Dashboard';
      case 'Manager':
        return 'Manager Dashboard';
      case 'Admin':
        return 'Admin Dashboard';
      default:
        return 'Dashboard';
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-2">
          <Workflow className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">SmartFlow</h2>
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
        </div>
      </div>
      <div className="flex items-center justify-between">
        <TabsList>
            <TabsTrigger value="projects">{getDashboardName()}</TabsTrigger>
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
            <Select value={clientNameFilter} onValueChange={setClientNameFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Client" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clientNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={processFilter} onValueChange={(value) => setProcessFilter(value as ProcessType | 'all')}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Process" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Processes</SelectItem>
                     {processes.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
    </div>
  )
}
