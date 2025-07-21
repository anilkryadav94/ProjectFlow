
"use client"

import * as React from "react"
import { ChevronsUpDown, LogOut, PlusCircle, Search, UserCircle, Workflow, Settings } from "lucide-react"
import type { Project, ProcessType, User } from "@/lib/data"
import { clientNames, processes } from "@/lib/data"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { TabsList, TabsTrigger } from "./ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { logout } from "@/lib/auth"
import { useRouter } from "next/navigation"

interface HeaderProps {
    search: string;
    setSearch: (search: string) => void;
    user: User;
    clientNameFilter: string;
    setClientNameFilter: (client: string) => void;
    processFilter: ProcessType | 'all';
    setProcessFilter: (process: ProcessType | 'all') => void;
    onProjectUpdate: (project: Project) => void;
}

export function Header({ 
  search, setSearch, 
  user, 
  clientNameFilter, setClientNameFilter, 
  processFilter, setProcessFilter,
  onProjectUpdate
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getDashboardName = () => {
    switch(user.role) {
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">SmartFlow</h2>
        </div>
        <div className="flex items-center space-x-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-48 justify-between">
                       <UserCircle className="mr-2 h-4 w-4" />
                       <span className="truncate">{user.name}</span>
                       <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                    <DropdownMenuLabel>{user.role}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <TabsList>
            <TabsTrigger value="projects">{getDashboardName()}</TabsTrigger>
            {(user.role === 'Admin') && (
              <TabsTrigger value="users">User Management</TabsTrigger>
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
