
"use client"

import * as React from "react"
import { LogOut, Search, Settings, FileSpreadsheet, Workflow, Edit, RotateCcw } from "lucide-react"
import type { Role, User } from "@/lib/data"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { logout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "./theme-toggle";
import { Separator } from "./ui/separator";
import { Label } from "@/components/ui/label";
import type { SearchableColumn } from "./dashboard"
import { cn } from "@/lib/utils"

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
    showQuickSearch: boolean;
    isManagerOrAdmin: boolean;
    hasSearchResults: boolean;
    onAmendSearch: () => void;
    onResetSearch: () => void;
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
  handleDownload,
  isDownloadDisabled,
  showQuickSearch,
  isManagerOrAdmin,
  hasSearchResults,
  onAmendSearch,
  onResetSearch
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
        
        {showQuickSearch && setSearch && (
             <div className="flex-grow flex items-center justify-center">
                 <div className="w-full max-w-xl">
                    <div className="relative flex items-center">
                        <div className="absolute left-0 z-10">
                             <Select value={searchColumn} onValueChange={(value) => setSearchColumn?.(value as SearchableColumn)}>
                                <SelectTrigger className="h-9 w-[110px] rounded-r-none border-r-0 focus:ring-0 bg-background text-foreground">
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
                    
                    {sortedUserRoles.length > 1 && setActiveRole && (
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
    </>
  )
}
