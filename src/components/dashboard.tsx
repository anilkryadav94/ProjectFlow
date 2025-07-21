
"use client";

import * as React from 'react';
import { useToast } from "@/hooks/use-toast"
import { type Project, projects as initialProjects, type Role, ProcessType, type User } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { ManagerView } from '@/components/manager-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectForm } from './project-form';
import { ScrollArea } from './ui/scroll-area';
import { redirect } from 'next/navigation';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [filteredProjects, setFilteredProjects] = React.useState<Project[]>(initialProjects);
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);

  const [search, setSearch] = React.useState('');
  const [role, setRole] = React.useState<Role>(user.role); 
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  const [clientNameFilter, setClientNameFilter] = React.useState<string>('all');
  const [processFilter, setProcessFilter] = React.useState<ProcessType | 'all'>('all');

  const { toast } = useToast();

  React.useEffect(() => {
    setRole(user.role);
    if (user.role === 'Admin' && window.location.pathname !== '/admin') {
      // Optional: redirect to admin page if user is Admin and not there already
      // This might be better handled in middleware, but for simplicity's sake...
    }
  }, [user.role]);

  const userQueue = React.useMemo(() => {
    let userProjects = [...projects];
    // Role-based filtering
    if (role === 'Processor') {
      userProjects = userProjects.filter(p => p.processor === user.name && (p.status === 'Processing' || p.status === 'Pending' || p.status === 'On Hold'));
    } else if (role === 'QA') {
        userProjects = userProjects.filter(p => p.qa === user.name && p.status === 'QA');
    } else if (role === 'Manager' || role === 'Admin') {
      // No filter, show all
    }

    // Search filtering
    if (search) {
        userProjects = userProjects.filter(project =>
        (project.applicationNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (project.patentNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (project.refNumber || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Client Name filter
    if (clientNameFilter !== 'all') {
        userProjects = userProjects.filter(p => p.clientName === clientNameFilter);
    }

    // Process filter
    if (processFilter !== 'all') {
        userProjects = userProjects.filter(p => p.process === processFilter);
    }


    // Sorting
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
  }, [search, sort, projects, role, user.name, clientNameFilter, processFilter]);

  React.useEffect(() => {
    setFilteredProjects(userQueue);
    // Always set the active project to the first one in the queue
    if (userQueue.length > 0) {
      setActiveProject(userQueue[0]);
    } else {
      setActiveProject(null);
    }
  }, [userQueue]);


  const handleProjectUpdate = (updatedProject: Project) => {
    let newProjects : Project[];
    const existingProjectIndex = projects.findIndex(p => p.id === updatedProject.id);

    if (existingProjectIndex > -1) {
        newProjects = [...projects];
        newProjects[existingProjectIndex] = updatedProject;
    } else {
        newProjects = [updatedProject, ...projects];
    }
    
    setProjects(newProjects);

    toast({
        title: "Project Saved",
        description: `Project ${updatedProject.refNumber} has been updated.`,
    })
  };

  const handleRowClick = (project: Project) => {
    setActiveProject(project);
  }

  const isTaskView = role === 'Processor' || role === 'QA';

  return (
    <div className="flex flex-col h-screen p-4 md:p-8 pt-6">
       <Tabs defaultValue="projects" className="flex flex-col h-full">
        <Header 
          search={search}
          setSearch={setSearch}
          user={user}
          clientNameFilter={clientNameFilter}
          setClientNameFilter={setClientNameFilter}
          processFilter={processFilter}
          setProcessFilter={setProcessFilter}
          onProjectUpdate={handleProjectUpdate}
        />
        <TabsContent value="projects" className="flex-grow mt-4 overflow-hidden">
          {isTaskView ? (
             <div className="flex flex-col h-full gap-4">
                <ScrollArea className="flex-grow pr-4">
                    <ProjectForm 
                        project={activeProject} 
                        onFormSubmit={handleProjectUpdate}
                        onCancel={() => setActiveProject(null)}
                        role={role}
                    />
                </ScrollArea>
                <div className="flex-shrink-0 h-[300px]">
                    <DataTable 
                        data={filteredProjects}
                        columns={columns}
                        sort={sort}
                        setSort={setSort}
                        onProjectUpdate={handleProjectUpdate}
                        onRowClick={handleRowClick}
                        activeProjectId={activeProject?.id}
                        isTaskView={true}
                    />
                </div>
            </div>
          ) : (
             <DataTable 
                data={filteredProjects}
                columns={columns}
                sort={sort}
                setSort={setSort}
                onProjectUpdate={handleProjectUpdate}
                isTaskView={false}
              />
          )}
        </TabsContent>
        {(role === 'Admin' || role === 'Manager') && (
            <TabsContent value="manager" className="space-y-4">
                <ManagerView />
            </TabsContent>
        )}
       </Tabs>
    </div>
  );
}
