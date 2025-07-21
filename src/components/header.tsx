
"use client"

import * as React from "react"
import { LogOut, Search, Settings, FileSpreadsheet, Workflow, X } from "lucide-react"
import type { ProcessType, Role, User, ProjectStatus } from "@/lib/data"
import { clientNames, processes, projectStatuses, roleHierarchy } from "@/lib/data"
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
import { Separator } from "./ui/separator";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "./date-range-picker"
import type { DateRange } from "react-day-picker"
import type { SearchableColumn } from "./dashboard"
import { cn } from "@/lib/utils"

interface HeaderProps {
    user: User;
    activeRole: Role;
    setActiveRole: (role: Role) => void;
    search: string;
    setSearch: (search: string) => void;
    searchColumn: SearchableColumn;
    setSearchColumn: (column: SearchableColumn) => void;
    clientNameFilter: string;
    setClientNameFilter: (client: string) => void;
    processFilter: ProcessType | 'all';
    setProcessFilter: (process: ProcessType | 'all') => void;
    statusFilter: ProjectStatus | 'all';
    setStatusFilter: (status: ProjectStatus | 'all') => void;
    emailDateFilter: DateRange | undefined;
    setEmailDateFilter: (date: DateRange | undefined) => void;
    allocationDateFilter: DateRange | undefined;
    setAllocationDateFilter: (date: DateRange | undefined) => void;
    onResetFilters: () => void;
    handleDownload: () => void;
    isDownloadDisabled: boolean;
}

const searchColumns: { value: SearchableColumn; label: string }[] = [
    { value: 'refNumber', label: 'Ref No.' },
    { value: 'applicationNumber', label: 'App No.' },
    { value: 'patentNumber', label: 'Patent No.' },
    { value: 'subject', label: 'Subject' },
];

export function Header({ 
  user, 
  activeRole,
  setActiveRole,
  search,
  setSearch,
  searchColumn,
  setSearchColumn,
  clientNameFilter,
  setClientNameFilter,
  processFilter,
  setProcessFilter,
  statusFilter,
  setStatusFilter,
  emailDateFilter,
  setEmailDateFilter,
  allocationDateFilter,
  setAllocationDateFilter,
  onResetFilters,
  handleDownload,
  isDownloadDisabled,
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
  
  const showFilters = activeRole === 'Manager' || activeRole === 'Processor' || activeRole === 'QA' || activeRole === 'Admin';

  return (
    <>
    <div className="flex items-center justify-between bg-primary text-primary-foreground p-2 px-4 shadow-md h-16 shrink-0 gap-4">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            <h2 className="text-xl font-bold tracking-tight">ProjectFlow</h2>
          </div>
          <Separator orientation="vertical" className="h-6 bg-primary-foreground/50" />
          <h3 className="text-md font-semibold">{getDashboardName()}</h3>
        </div>
        
        {showFilters && (
            <div className="flex-grow flex items-center justify-center">
                 <div className="w-full max-w-xl">
                    <div className="relative flex items-center">
                        <div className="absolute left-0">
                             <Select value={searchColumn} onValueChange={(value) => setSearchColumn(value as SearchableColumn)}>
                                <SelectTrigger className="h-9 w-[110px] rounded-r-none border-r-0 focus:ring-0">
                                    <SelectValue placeholder="Search by" />
                                </SelectTrigger>
                                <SelectContent>
                                    {searchColumns.map(col => <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Input 
                            placeholder="Search..."
                            className="pl-[120px] h-9 text-foreground"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                         <Search className="absolute right-3 h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </div>
        )}

        <div className="flex items-center space-x-2 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={isDownloadDisabled} className="h-8 w-8 hover:bg-primary/80">
              <FileSpreadsheet className="h-5 w-5" />
              <span className="sr-only">Download CSV</span>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-auto h-9 text-foreground text-xs px-2">
                       <Settings className="h-4 w-4" />
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
                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex-col items-start">
                        <Label htmlFor="theme-toggle" className="text-xs mb-2 w-full cursor-pointer">Theme</Label>
                        <ThemeToggle />
                     </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>
    {showFilters && (
      <div className="flex items-center gap-2 bg-background border-b p-2">
        <Select value={clientNameFilter} onValueChange={setClientNameFilter}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clientNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={processFilter} onValueChange={(value) => setProcessFilter(value as ProcessType | 'all')}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Process" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Processes</SelectItem>
            {processes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'all')}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {projectStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="w-[250px]">
            <Label className="text-xs font-medium text-muted-foreground ml-1">Email Date</Label>
            <DateRangePicker date={emailDateFilter} setDate={setEmailDateFilter} />
        </div>
         <div className="w-[250px]">
             <Label className="text-xs font-medium text-muted-foreground ml-1">Allocation Date</Label>
            <DateRangePicker date={allocationDateFilter} setDate={setAllocationDateFilter} />
        </div>
        <Button variant="ghost" onClick={onResetFilters} size="sm">
          <X className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    )}
    </>
  )
}
