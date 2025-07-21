
"use client";

import * as React from 'react';
import { type Project, type Role, ProcessType, type User, roleHierarchy, ProjectStatus, clientNames, processes, projectStatuses } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { ProjectForm } from './project-form';
import { UserManagementTable } from './user-management-table';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { DashboardSidebar } from './dashboard-sidebar';
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

interface DashboardProps {
  user: User;
  initialProjects: Project[];
}

export default function Dashboard({ 
  user, 
  initialProjects,
}: DashboardProps) {
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  const [clientNameFilter, setClientNameFilter] = React.useState<string>('all');
  const [processFilter, setProcessFilter] = React.useState<ProcessType | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<ProjectStatus | 'all'>('all');
  const [emailDateFilter, setEmailDateFilter] = React.useState<DateRange | undefined>({ from: addDays(new Date(), -90), to: new Date() });
  const [allocationDateFilter, setAllocationDateFilter] = React.useState<DateRange | undefined>();
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = React.useState(false);
  const { toast } = useToast();
  
  React.useEffect(() => {
    if (user?.roles?.length > 0) {
      if (user.roles.includes('Admin') && user.roles.includes('Manager')) {
          setActiveRole('Manager');
      } else {
        for (const role of roleHierarchy) {
            if (user.roles.includes(role)) {
                setActiveRole(role);
                break;
            }
        }
      }
    }
  }, [user.roles]);

  const handleProjectUpdate = (updatedProject: Project) => {
    const existingProjectIndex = projects.findIndex(p => p.id === updatedProject.id);

    if (existingProjectIndex > -1) {
        const newProjects = [...projects];
        newProjects[existingProjectIndex] = updatedProject;
        setProjects(newProjects);
    } else {
        setProjects(prev => [updatedProject, ...prev]);
    }
    
    toast({
        title: "Project Saved",
        description: `Project ${updatedProject.refNumber} has been updated.`,
    });
    setIsNewProjectDialogOpen(false);
  };

  const filteredProjects = React.useMemo(() => {
    let userProjects = [...projects];

    if (activeRole === 'Manager' || activeRole === 'Admin') {
        // Managers and Admins see all projects initially
    } else if (activeRole === 'Processor') {
      userProjects = userProjects.filter(p => p.processor === user.name);
    } else if (activeRole === 'QA') {
      userProjects = userProjects.filter(p => p.qa === user.name);
    }
    
    if (search) {
      userProjects = userProjects.filter(project =>
        (project.refNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (project.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
        (project.applicationNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (project.patentNumber || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (clientNameFilter !== 'all') {
      userProjects = userProjects.filter(p => p.clientName === clientNameFilter);
    }

    if (processFilter !== 'all') {
      userProjects = userProjects.filter(p => p.process === processFilter);
    }

    if (statusFilter !== 'all') {
        userProjects = userProjects.filter(p => p.status === statusFilter);
    }

    if (emailDateFilter?.from) {
        userProjects = userProjects.filter(p => new Date(p.emailDate) >= emailDateFilter.from!);
    }
    if (emailDateFilter?.to) {
        userProjects = userProjects.filter(p => new Date(p.emailDate) <= emailDateFilter.to!);
    }

    if (allocationDateFilter?.from) {
        userProjects = userProjects.filter(p => new Date(p.allocationDate) >= allocationDateFilter.from!);
    }
    if (allocationDateFilter?.to) {
        userProjects = userProjects.filter(p => new Date(p.allocationDate) <= allocationDateFilter.to!);
    }

    if (sort) {
      userProjects.sort((a, b) => {
        const valA = a[sort.key];
        const valB = b[sort.key];

        if (valA === null) return 1;
        if (valB === null) return -1;

        if (valA < valB) {
          return sort.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return userProjects;
  }, [search, sort, projects, activeRole, user.name, clientNameFilter, processFilter, statusFilter, emailDateFilter, allocationDateFilter]);

  if (!activeRole) {
    return null;
  }

  const isAdminView = activeRole === 'Admin';
  const isManagerView = activeRole === 'Manager';
  const isQATorProcessorView = activeRole === 'QA' || activeRole === 'Processor';

  const renderManagerOrAdminView = () => (
     <div className="flex flex-col h-screen bg-background w-full">
        <Header 
            user={user}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            search={search}
            setSearch={setSearch}
            clientNameFilter={clientNameFilter}
            setClientNameFilter={setClientNameFilter}
            processFilter={processFilter}
            setProcessFilter={setProcessFilter}
        />
        <div className="flex flex-col flex-grow overflow-hidden p-4 gap-4">
          {isAdminView ? (
            <UserManagementTable sessionUser={user} />
          ) : (
            <>
              {isManagerView && (
                 <div className="flex justify-end">
                    <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          New Project
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Create New Project</DialogTitle>
                        </DialogHeader>
                        <ProjectForm 
                          onFormSubmit={handleProjectUpdate}
                          role={activeRole}
                          setOpen={setIsNewProjectDialogOpen}
                        />
                      </DialogContent>
                    </Dialog>
                 </div>
              )}
               <DataTable 
                  data={filteredProjects}
                  columns={columns}
                  sort={sort}
                  setSort={setSort}
                  projectsToDownload={filteredProjects}
                />
            </>
          )}
        </div>
    </div>
  );

  const renderQATorProcessorView = () => (
     <SidebarProvider>
      <DashboardSidebar 
        user={user}
        activeRole={activeRole}
        search={search}
        setSearch={setSearch}
        clientNameFilter={clientNameFilter}
        setClientNameFilter={setClientNameFilter}
        processFilter={processFilter}
        setProcessFilter={setProcessFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        emailDateFilter={emailDateFilter}
        setEmailDateFilter={setEmailDateFilter}
        allocationDateFilter={allocationDateFilter}
        setAllocationDateFilter={setAllocationDateFilter}
        clientNames={clientNames}
        processes={processes}
        projectStatuses={projectStatuses}
      />
      <SidebarInset className="p-4 flex-1">
         <DataTable 
            data={filteredProjects}
            columns={columns}
            sort={sort}
            setSort={setSort}
            projectsToDownload={filteredProjects}
          />
      </SidebarInset>
     </SidebarProvider>
  )

  return isQATorProcessorView ? renderQATorProcessorView() : renderManagerOrAdminView();
}
