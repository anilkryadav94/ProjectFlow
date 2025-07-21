
"use client"

import * as React from "react"
import { LogOut, Settings, FileSpreadsheet, Workflow, Edit, RotateCcw } from "lucide-react"
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

interface HeaderProps {
    user: User;
    activeRole: Role;
    setActiveRole?: (role: Role) => void;
    search?: string;
    setSearch?: (search: string) => void;
    searchColumn?: SearchableColumn;
    setSearchColumn?: (column: SearchableColumn) => void;
    handleDownload?: () => void;
    isDownloadDisabled?: boolean;
    isManagerOrAdmin: boolean;
    hasSearchResults: boolean;
    onAmendSearch?: () => void;
    onResetSearch?: () => void;
    clientNameFilter?: string;
    setClientNameFilter?: (value: string) => void;
    processFilter?: string | 'all';
    setProcessFilter?: (value: string | 'all') => void;
    clientNames: string[];
    processes: ProcessType[];
    children?: React.ReactNode;
}

export function Header({ 
  user, 
  activeRole,
  setActiveRole,
  search,
  setSearch,
  searchColumn,
  setSearchColumn,
  handleDownload,
  isDownloadDisabled,
  isManagerOrAdmin,
  hasSearchResults,
  onAmendSearch,
  onResetSearch,
  clientNameFilter,
  setClientNameFilter,
  processFilter,
  setProcessFilter,
  clientNames,
  processes,
  children,
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleRoleChange = (role: Role) => {
    if (setActiveRole) {
      setActiveRole(role);
    } else {
      // If on a page without setActiveRole (like task page), redirect to home
      // This will effectively switch the role for the whole dashboard context.
      router.push('/');
      router.refresh();
    }
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
      default:
        return 'Dashboard';
    }
  }

  // Sort user roles based on the hierarchy for consistent display
  const sortedUserRoles = React.useMemo(() => {
    if (!user.roles) return [];
    return user.roles.sort((a, b) => roleHierarchy.indexOf(a) - roleHierarchy.indexOf(b));
  }, [user.roles]);

  const dashboardName = getDashboardName();

  return (
    <>
    <div className="flex items-center justify-between bg-primary text-primary-foreground p-2 px-4 shadow-md h-16 shrink-0 gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            <h2 className="text-xl font-bold tracking-tight">ProjectFlow</h2>
          </div>
          <Separator orientation="vertical" className="h-6 bg-primary-foreground/50" />
            <Link href="/" className="text-md font-semibold hover:underline">
                {dashboardName}
            </Link>
        </div>
        
        <div className="flex-grow flex items-center justify-center px-8">
            {children ? (
                children
            ) : !isManagerOrAdmin && setSearch && setSearchColumn && setClientNameFilter && setProcessFilter && clientNameFilter && processFilter && (
              <div className="flex w-full max-w-2xl items-center space-x-2">
                <div className="flex items-center space-x-0 w-1/2">
                    <Select value={searchColumn} onValueChange={(v) => setSearchColumn(v as SearchableColumn)}>
                    <SelectTrigger className="w-[180px] rounded-r-none focus:ring-0 text-foreground">
                        <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="refNumber">Ref Number</SelectItem>
                        <SelectItem value="applicationNumber">Application No.</SelectItem>
                        <SelectItem value="patentNumber">Patent No.</SelectItem>
                        <SelectItem value="subject">Subject</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="emailDate">Email Date</SelectItem>
                        <SelectItem value="allocationDate">Allocation Date</SelectItem>
                    </SelectContent>
                    </Select>
                    <Input
                    type="text"
                    placeholder="Quick search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-l-none focus-visible:ring-0"
                    />
                </div>
                
                <Select value={clientNameFilter} onValueChange={setClientNameFilter}>
                  <SelectTrigger className="w-1/4 text-foreground">
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
                  <SelectTrigger className="w-1/4 text-foreground">
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
            )}
        </div>

        {isManagerOrAdmin && hasSearchResults && (
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onAmendSearch} className="text-foreground">
                    <Edit /> Amend Search
                </Button>
                 <Button variant="outline" size="sm" onClick={onResetSearch} className="text-foreground">
                    <RotateCcw /> Reset Search
                </Button>
            </div>
        )}

        <div className="flex items-center space-x-2 flex-shrink-0">
            {handleDownload && (
                <Button variant="ghost" size="icon" onClick={handleDownload} disabled={isDownloadDisabled} className="h-8 w-8 hover:bg-primary/80">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span className="sr-only">Download CSV</span>
                </Button>
            )}
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
    </div>
    </>
  )
}
