
"use client"

import * as React from "react"
import { LogOut, Search, Settings, FileSpreadsheet, Workflow, Home } from "lucide-react"
import type { ProcessType, Role, User } from "@/lib/data"
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
import { Separator } from "./ui/separator";
import { Label } from "@/components/ui/label";

interface HeaderProps {
    user: User;
    activeRole: Role;
    setActiveRole: (role: Role) => void;
}

export function Header({ 
  user, 
  activeRole,
  setActiveRole,
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
    <div className="flex items-center justify-between bg-primary text-primary-foreground p-2 px-4 shadow-md h-16 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/80" onClick={() => router.push('/')}>
            <Home className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            <h2 className="text-xl font-bold tracking-tight">ProjectFlow</h2>
          </div>
          <Separator orientation="vertical" className="h-6 bg-primary-foreground/50" />
          <h3 className="text-md font-semibold">{getDashboardName()}</h3>
        </div>
        
        <div className="flex items-center space-x-2">
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
  )
}
