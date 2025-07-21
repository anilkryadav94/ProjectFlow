
"use client"

import * as React from "react"
import Papa from "papaparse";
import { Check, ChevronsUpDown, LogOut, PlusCircle, Search, UserCircle, Workflow, Settings, Download } from "lucide-react"
import type { Project, ProcessType, User, Role } from "@/lib/data"
import { clientNames, processes, roleHierarchy } from "@/lib/data"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { logout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
    search: string;
    setSearch: (search: string) => void;
    user: User;
    clientNameFilter: string;
    setClientNameFilter: (client: string) => void;
    processFilter: ProcessType | 'all';
    setProcessFilter: (process: ProcessType | 'all') => void;
    onProjectUpdate: (project: Project) => void;
    activeRole: Role;
    setActiveRole: (role: Role) => void;
    projectsToDownload: Project[];
}

export function Header({ 
  search, setSearch, 
  user, 
  clientNameFilter, setClientNameFilter, 
  processFilter, setProcessFilter,
  onProjectUpdate,
  activeRole,
  setActiveRole,
  projectsToDownload
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getDashboardName = () => {
    if (!activeRole) return 'Dashboard';
    switch(activeRole) {
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

  // Sort user roles based on the hierarchy for consistent display
  const sortedUserRoles = React.useMemo(() => {
    if (!user.roles) return [];
    return user.roles.sort((a, b) => roleHierarchy.indexOf(a) - roleHierarchy.indexOf(b));
  }, [user.roles]);

  const handleDownload = () => {
    if (!projectsToDownload || projectsToDownload.length === 0) {
      return;
    }
    const csv = Papa.unparse(projectsToDownload);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `projects_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">ProjectFlow</h2>
        </div>
        <div className="flex items-center space-x-2">
            <ThemeToggle />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-48 justify-between h-8">
                       <UserCircle className="mr-2 h-4 w-4" />
                       <span className="truncate">{user.name}</span>
                       <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
                    
                    {sortedUserRoles.length > 1 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={activeRole} onValueChange={(value) => setActiveRole(value as Role)}>
                                {sortedUserRoles.map(role => (
                                    <DropdownMenuRadioItem key={role} value={role}>
                                        {role}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </>
                    )}

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
         <h3 className="text-sm font-semibold">{getDashboardName()}</h3>
        
        {/* Hide filters for Admin */}
        {activeRole !== 'Admin' && (
          <div className="flex items-center space-x-2">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Quick search..."
                      className="pl-9 h-8"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                  />
              </div>
              <Select value={clientNameFilter} onValueChange={setClientNameFilter}>
                  <SelectTrigger className="w-[180px] h-8">
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
                  <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Filter by Process" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Processes</SelectItem>
                      {processes.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={projectsToDownload.length === 0} className="h-8 w-8 p-0">
                <Download className="h-4 w-4" />
                <span className="sr-only">Download CSV</span>
              </Button>
          </div>
        )}
      </div>
    </div>
  )
}
