
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { DateRange } from 'react-day-picker';
import { LogOut, Search, Workflow, ChevronLeft, RotateCcw } from 'lucide-react';

import type { Role, User, ProcessType, ProjectStatus } from '@/lib/data';
import { logout } from '@/lib/auth';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { DateRangePicker } from './date-range-picker';
import { ThemeToggle } from './theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


interface TaskSidebarProps {
  user: User;
  activeRole: Role;
  onBack: () => void;
  search: string;
  setSearch: (search: string) => void;
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
  clientNames: string[];
  processes: ProcessType[];
  projectStatuses: ProjectStatus[];
  onResetFilters: () => void;
}

export function TaskSidebar({
  user,
  activeRole,
  onBack,
  search,
  setSearch,
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
  clientNames,
  processes,
  projectStatuses,
  onResetFilters
}: TaskSidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getDashboardName = () => {
    switch (activeRole) {
      case 'Processor':
        return 'Processor View';
      case 'QA':
        return 'QA View';
      default:
        return 'Task View';
    }
  };

  return (
    <Sidebar collapsible="none" className="border-r">
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            <div className='flex flex-col'>
                <h2 className="text-xl font-bold tracking-tight">ProjectFlow</h2>
                <p className="text-xs text-muted-foreground">{getDashboardName()}</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="p-2 space-y-2">
            <Button variant="ghost" onClick={onBack} className="justify-start w-full">
                <ChevronLeft className="mr-2 h-4 w-4"/>
                Back to Dashboard
            </Button>
            <SidebarSeparator/>
        </div>
        <div className="p-2 space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-sm">Filters</Label>
                <Button variant="ghost" size="sm" onClick={onResetFilters}>
                    <RotateCcw className="mr-2 h-3 w-3" />
                    Reset
                </Button>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                <Input 
                    placeholder="Quick search..."
                    className="pl-9 h-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            
            <div>
                <Label>Client</Label>
                <Select value={clientNameFilter} onValueChange={setClientNameFilter}>
                    <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Filter by Client" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {clientNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div>
                <Label>Process</Label>
                <Select value={processFilter} onValueChange={(value) => setProcessFilter(value as ProcessType | 'all')}>
                    <SelectTrigger className="w-full h-9">
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
            
            <div>
                <Label>Status</Label>
                 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'all')}>
                    <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {projectStatuses.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label>Email Date</Label>
                <DateRangePicker date={emailDateFilter} setDate={setEmailDateFilter} />
            </div>

            <div>
                <Label>Allocation Date</Label>
                <DateRangePicker date={allocationDateFilter} setDate={setAllocationDateFilter} />
            </div>
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarSeparator />
         <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-9 w-9">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${user.email}`} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-sm font-semibold">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
        </div>
        <div className="flex flex-col gap-2 mt-4">
            <div className="px-2">
                <Label htmlFor="theme-toggle" className="text-xs mb-2 w-full cursor-pointer">Theme</Label>
                <ThemeToggle />
            </div>
            <Button variant="ghost" onClick={handleLogout} className="justify-start px-2">
                <LogOut className="mr-2 h-4 w-4"/>
                Logout
            </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
