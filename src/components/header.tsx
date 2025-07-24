
"use client"

import * as React from "react"
import { LogOut, Settings, FileSpreadsheet, Workflow, Edit, RotateCcw, ChevronLeft, ChevronRight, Search } from "lucide-react"
import type { Role, User, ProcessType } from "@/lib/data"
import { roleHierarchy } from "@/lib/data"
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
import { logout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "./theme-toggle";
import { Separator } from "./ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import type { SearchableColumn } from "./dashboard"
import Link from "next/link"

interface TaskPagination {
    currentIndex: number;
    total: number;
    nextId: string | null;
    prevId: string | null;
    filteredIds?: string;
}

interface HeaderProps {
    user: User;
    activeRole: Role;
    setActiveRole?: (role: Role) => void;
    
    // For non-manager roles
    search?: string;
    setSearch?: (search: string) => void;
    searchColumn?: SearchableColumn;
    setSearchColumn?: (column: SearchableColumn) => void;
    clientNameFilter?: string;
    setClientNameFilter?: (value: string) => void;
    processFilter?: string | 'all';
    setProcessFilter?: (value: string | 'all') => void;

    isManagerOrAdmin: boolean;
    hasSearchResults?: boolean;
    onResetSearch?: () => void;
    
    clientNames: string[];
    processes: ProcessType[];
    children?: React.ReactNode;
    taskPagination?: TaskPagination;
}

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
  isManagerOrAdmin,
  hasSearchResults,
  onResetSearch,
  clientNames,
  processes,
  children,
  taskPagination,
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleRoleChange = (role: Role) => {
    const targetUrl = `/?role=${role}`;
    if (setActiveRole) {
      setActiveRole(role);
    }
    router.push(targetUrl, { scroll: false });
  }
  
  const handlePagination = (id: string | null) => {
    if (!id) return;
    const filteredIdsParam = taskPagination?.filteredIds ? `&filteredIds=${taskPagination.filteredIds}` : '';
    router.push(`/task/${id}?role=${activeRole}${filteredIdsParam}`);
  }


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
      case 'Case Manager':
        return 'Client Dashboard';
      default:
        return 'Dashboard';
    }
  }

  const sortedUserRoles = React.useMemo(() => {
    if (!user.roles) return [];
    return user.roles.sort((a, b) => roleHierarchy.indexOf(a) - roleHierarchy.indexOf(b));
  }, [user.roles]);

  const dashboardName = getDashboardName();
  const dashboardLink = `/?role=${activeRole}`;

  return (
    <header className="flex items-center justify-between bg-primary text-primary-foreground p-2 px-4 shadow-md h-16 shrink-0 gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            <Link href={dashboardLink}>
              <h2 className="text-xl font-bold tracking-tight">ProjectFlow</h2>
            </Link>
          </div>
          <Separator orientation="vertical" className="h-6 bg-primary-foreground/50" />
            <Link href={dashboardLink} className="text-md font-semibold hover:underline">
                {dashboardName}
            </Link>
        </div>
        
        <div className="flex-grow" />

        <div className="flex items-center gap-2 flex-shrink-0">
            
            {setSearch && setSearchColumn && !isManagerOrAdmin && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-0 relative">
                    {activeRole !== 'Case Manager' ? (
                      <>
                        <Select value={searchColumn} onValueChange={(v) => setSearchColumn(v as SearchableColumn)}>
                          <SelectTrigger className="w-[180px] rounded-r-none focus:ring-0 text-foreground h-8 text-xs">
                              <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="any">Any Text/Number</SelectItem>
                              <SelectItem value="ref_number">Ref Number</SelectItem>
                              <SelectItem value="application_number">Application No.</SelectItem>
                              <SelectItem value="patent_number">Patent No.</SelectItem>
                              <SelectItem value="subject_line">Subject</SelectItem>
                              <SelectItem value="processing_status">Processor Status</SelectItem>
                              <SelectItem value="qa_status">QA Status</SelectItem>
                              <SelectItem value="workflowStatus">Workflow Status</SelectItem>
                              <SelectItem value="received_date">Email Date</SelectItem>
                              <SelectItem value="allocation_date">Allocation Date</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                            type="text"
                            placeholder="Quick search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-l-none focus-visible:ring-0 h-8 w-48 text-foreground text-xs"
                        />
                      </>
                    ) : (
                      <>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                        <Input
                            type="text"
                            placeholder="Quick search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="focus-visible:ring-0 h-9 w-64 text-foreground pl-9"
                        />
                      </>
                    )}
                </div>
                
                {setClientNameFilter && setProcessFilter && activeRole !== 'Case Manager' && (
                  <>
                    <Select value={clientNameFilter} onValueChange={setClientNameFilter}>
                      <SelectTrigger className="w-[150px] text-foreground h-8 text-xs">
                        <SelectValue placeholder="Filter by Client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {clientNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={processFilter} onValueChange={setProcessFilter}>
                      <SelectTrigger className="w-[150px] text-foreground h-8 text-xs">
                        <SelectValue placeholder="Filter by Process" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Processes</SelectItem>
                        {processes.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            )}

            {taskPagination && (
                 <div className="flex items-center gap-2 text-sm font-medium">
                    <Button variant="outline" size="icon" className="h-8 w-8 text-foreground" disabled={!taskPagination.prevId} onClick={() => handlePagination(taskPagination.prevId)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>{taskPagination.total > 0 ? taskPagination.currentIndex + 1 : 0} of {taskPagination.total}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-foreground" disabled={!taskPagination.nextId} onClick={() => handlePagination(taskPagination.nextId)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {children}

            {isManagerOrAdmin && hasSearchResults && onResetSearch && activeRole !== 'Manager' && (
                <Button variant="outline" className="h-9 text-foreground" onClick={onResetSearch}>
                    <RotateCcw className="mr-2" /> Reset Search
                </Button>
            )}
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-auto h-8 text-foreground text-xs px-2">
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
                            <DropdownMenuRadioGroup value={activeRole} onValueChange={(value) => handleRoleChange(value as Role)}>
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
    </header>
  )
}

    