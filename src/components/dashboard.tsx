
"use client";

import * as React from 'react';
import { type Project, type Role, ProcessType, type User, roleHierarchy } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { ProjectForm } from './project-form';
import { ScrollArea } from './ui/scroll-area';
import { UserManagementTable } from './user-management-table';
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  user: User;
  initialProjects: Project[];
}

export default function Dashboard({ 
  user, 
  initialProjects,
}: DashboardProps) {
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);

  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  const [clientNameFilter, setClientNameFilter] = React.useState<string>('all');
  const [processFilter, setProcessFilter] = React.useState<ProcessType | 'all'>('all');
  const { toast } = useToast();
  
  React.useEffect(() => {
    if (user?.roles?.length > 0) {
      // If user is an admin and has other roles, default to Manager view.
      if (user.roles.includes('Admin') && user.roles.includes('Manager')) {
          setActiveRole('Manager');
      } else {
        // Otherwise, pick the highest role in the hierarchy.
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
    
    if (activeProject?.id === updatedProject.id) {
        setActiveProject(updatedProject);
    }
    
    toast({
        title: "Project Saved",
        description: `Project ${updatedProject.refNumber} has been updated.`,
    });
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
        (project.applicationNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (project.patentNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (project.refNumber || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (clientNameFilter !== 'all') {
      userProjects = userProjects.filter(p => p.clientName === clientNameFilter);
    }

    if (processFilter !== 'all') {
      userProjects = userProjects.filter(p => p.process === processFilter);
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
  }, [search, sort, projects, activeRole, user.name, clientNameFilter, processFilter]);

  React.useEffect(() => {
    if (filteredProjects.length > 0) {
      if (!activeProject || !filteredProjects.find(p => p.id === activeProject.id)) {
        setActiveProject(filteredProjects[0]);
      }
    } else {
      setActiveProject(null);
    }
  }, [filteredProjects, activeProject]);

  const handleRowClick = (project: Project) => {
    setActiveProject(project);
  }
  
  if (!activeRole) {
    // This can be a loading spinner as well
    return null;
  }

  const isTaskView = activeRole === 'Processor' || activeRole === 'QA';
  const isAdminView = activeRole === 'Admin';

  return (
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
        <div className="flex flex-col flex-grow overflow-hidden py-2 gap-2">
          {isAdminView ? (
            <UserManagementTable sessionUser={user} />
          ) : isTaskView ? (
             <div className="flex flex-col h-full space-y-2">
                <div className="flex-shrink-0" style={{ height: 'calc(70% - 0.5rem)' }}>
                    <ProjectForm 
                        project={activeProject} 
                        onFormSubmit={handleProjectUpdate}
                        onCancel={() => setActiveProject(null)}
                        role={activeRole}
                    />
                </div>
                <div className="flex-grow flex-shrink min-h-0" style={{ height: 'calc(30% - 0.5rem)' }}>
                    <DataTable 
                        data={filteredProjects}
                        columns={columns}
                        sort={sort}
                        setSort={setSort}
                        onRowClick={handleRowClick}
                        activeProjectId={activeProject?.id}
                        isTaskView={true}
                        projectsToDownload={filteredProjects}
                    />
                </div>
            </div>
          ) : ( // Manager view
             <DataTable 
                data={filteredProjects}
                columns={columns}
                sort={sort}
                setSort={setSort}
                isTaskView={false}
                projectsToDownload={filteredProjects}
              />
          )}
        </div>
    </div>
  );
}
