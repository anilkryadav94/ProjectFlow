
"use client";

import * as React from 'react';
import { type Project, type Role, ProcessType, type User, roleHierarchy, ProjectStatus, clientNames, processes, projectStatuses } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { ProjectForm } from './project-form';
import { UserManagementTable } from './user-management-table';
import { useToast } from "@/hooks/use-toast";
import type { DateRange } from 'react-day-picker';
import { TaskSidebar } from './task-sidebar';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset
} from "@/components/ui/sidebar";
import { DataTableRowActions } from './data-table-row-actions';

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
  const [emailDateFilter, setEmailDateFilter] = React.useState<DateRange | undefined>();
  const [allocationDateFilter, setAllocationDateFilter] = React.useState<DateRange | undefined>();
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);

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

    if (selectedProject?.id === updatedProject.id) {
        setSelectedProject(updatedProject);
    }
    
    toast({
        title: "Project Saved",
        description: `Project ${updatedProject.refNumber} has been updated.`,
    });
  };
  
  const handleRowClick = (project: Project) => {
    if (activeRole === 'Processor' || activeRole === 'QA') {
        setSelectedProject(project);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
    resetFilters();
  }
  
  const resetFilters = () => {
    setSearch('');
    setClientNameFilter('all');
    setProcessFilter('all');
    setStatusFilter('all');
    setEmailDateFilter(undefined);
    setAllocationDateFilter(undefined);
  }

  // Projects for the main dashboard view
  const dashboardProjects = React.useMemo(() => {
    let userProjects = [...projects];

    // Role-based filtering
    if (activeRole === 'Processor') {
      userProjects = userProjects.filter(p => p.processor === user.name);
    } else if (activeRole === 'QA') {
      userProjects = userProjects.filter(p => p.qa === user.name);
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
  }, [sort, projects, activeRole, user.name]);


  // Effect to update the selected project when filters change in task view
  React.useEffect(() => {
    if (!selectedProject || (activeRole !== 'Processor' && activeRole !== 'QA')) {
      return;
    }

    let userProjects = [...projects];

    if (activeRole === 'Processor') {
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
        if (valA === null) return 1; if (valB === null) return -1;
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // If there are results, set the first one as selected. 
    // If not, keep the current one (or maybe clear it? For now, keep).
    if (userProjects.length > 0) {
      // Only update if the current selected project is no longer in the filtered list
      if (!userProjects.find(p => p.id === selectedProject.id)) {
        setSelectedProject(userProjects[0]);
      }
    } else {
        // Handle case with no results, maybe show a message in the form area
    }

  }, [search, clientNameFilter, processFilter, statusFilter, emailDateFilter, allocationDateFilter, activeRole, user.name, projects, selectedProject, sort]);


  if (!activeRole) {
    return null;
  }

  const isQATorProcessor = activeRole === 'QA' || activeRole === 'Processor';

  if (isQATorProcessor && selectedProject) {
    return (
      <SidebarProvider>
        <TaskSidebar
            user={user}
            activeRole={activeRole}
            onBack={handleBackToDashboard}
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
            onResetFilters={resetFilters}
        />
        <SidebarInset className="p-4 flex-1">
             <ProjectForm 
                project={selectedProject}
                onFormSubmit={handleProjectUpdate}
                role={activeRole}
             />
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
     <div className="flex flex-col h-screen bg-background w-full">
        <Header 
            user={user}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            onNewProject={() => {/* Logic for new project */}}
        />
        <div className="flex flex-col flex-grow overflow-hidden p-4 gap-4">
          {activeRole === 'Admin' ? (
            <UserManagementTable sessionUser={user} />
          ) : (
            <DataTable 
                data={dashboardProjects}
                columns={columns.map(col => {
                    if (col.key === 'refNumber') {
                        return { ...col, isClickable: isQATorProcessor };
                    }
                    return col;
                })}
                sort={sort}
                setSort={setSort}
                onRowClick={isQATorProcessor ? handleRowClick : undefined}
                activeProjectId={selectedProject?.id}
                projectsToDownload={dashboardProjects}
                isRowClickable={isQATorProcessor}
            />
          )}
        </div>
    </div>
  );
}

  