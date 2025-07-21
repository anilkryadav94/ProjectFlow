
"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { LogOut, Settings, Workflow, ChevronLeft } from "lucide-react";
import { type Project, type Role, type User, projects, roleHierarchy } from "@/lib/data";
import { ProjectForm } from "./project-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

interface TaskViewLayoutProps {
  user: User;
  projectId: string;
}

export function TaskViewLayout({ user, projectId }: TaskViewLayoutProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = React.useState<Project | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // The user's highest role is used for permissions inside the form.
  const activeRole = React.useMemo(() => {
     if (user?.roles?.length > 0) {
      for (const role of roleHierarchy) {
        if (user.roles.includes(role)) {
          return role;
        }
      }
    }
    return 'Processor'; // Fallback
  }, [user.roles]);

  React.useEffect(() => {
    const foundProject = projects.find((p) => p.id === projectId);
    if (foundProject) {
      setProject(foundProject);
    } else {
        toast({
            title: "Error",
            description: "Project not found.",
            variant: "destructive"
        })
        router.push('/');
    }
    setIsLoading(false);
  }, [projectId, router, toast]);

  const handleProjectUpdate = (updatedProject: Project) => {
    // In a real app, you might re-fetch or optimistically update
    setProject(updatedProject); 
    toast({
      title: "Project Saved",
      description: `Project ${updatedProject.refNumber} has been updated.`,
    });
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };
  
  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="none" className="border-r">
        <SidebarHeader>
            <div className="flex items-center gap-2">
                <Workflow className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">ProjectFlow</h2>
            </div>
        </SidebarHeader>
        <SidebarContent>
           <div className="flex flex-col p-2 space-y-2">
                <Button variant="ghost" onClick={() => router.push('/')} className="justify-start">
                    <ChevronLeft className="mr-2 h-4 w-4"/>
                    Back to Dashboard
                </Button>
                <SidebarSeparator />
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
      <SidebarInset className="p-4 flex-1">
        <ProjectForm
            project={project}
            onFormSubmit={handleProjectUpdate}
            role={activeRole}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
