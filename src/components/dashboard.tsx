"use client";

import * as React from 'react';
import { useToast } from "@/hooks/use-toast"
import { type Project, projects as initialProjects, type Role } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { ManagerView } from '@/components/manager-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectForm } from './project-form';

export default function Dashboard() {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [filteredProjects, setFilteredProjects] = React.useState<Project[]>(initialProjects);
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);

  const [search, setSearch] = React.useState('');
  const [role, setRole] = React.useState<Role>('Processor'); // Default to processor for demo
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  const { toast } = useToast();

  const userQueue = React.useMemo(() => {
    let userProjects = [...projects];
    // Role-based filtering
    if (role === 'Processor') {
      // For demo, let's assume the processor is 'Alice'
      // Show projects that are 'Pending' or 'Processing' and assigned to Alice
      userProjects = userProjects.filter(p => p.processor === 'Alice' && (p.status === 'Processing' || p.status === 'Pending' || p.status === 'On Hold'));
    } else if (role === 'QA') {
        // For demo, let's assume the QA is 'Anil'
        // Show projects that are in 'QA' status and assigned to Anil
        userProjects = userProjects.filter(p => p.qa === 'Anil' && p.status === 'QA');
    } else if (role === 'Manager' || role === 'Admin') {
      // No filter, show all
    }

    // Search filtering
    if (search) {
        userProjects = userProjects.filter(project =>
        project.applicationNumber.toLowerCase().includes(search.toLowerCase()) ||
        project.patentNumber.toLowerCase().includes(search.toLowerCase()) ||
        project.refNumber.toLowerCase().includes(search.toLowerCase())
      );
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
  }, [search, sort, projects, role]);

  React.useEffect(() => {
    setFilteredProjects(userQueue);
  }, [userQueue]);

  React.useEffect(() => {
    // If there's no active project, and the queue has items, set the first one as active.
    if (!activeProject && userQueue.length > 0) {
      if(role === 'Processor' || role === 'QA') {
        const firstRelevantTask = userQueue.find(p => p.status === (role === 'Processor' ? 'Processing' : 'QA'));
        setActiveProject(firstRelevantTask || userQueue[0]);
      }
    }
  }, [userQueue, activeProject, role]);

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
    
    // Logic to move to next task
    if (updatedProject.status === 'QA' || updatedProject.status === 'Complete') {
        const nextProject = userQueue.find(p => p.id !== updatedProject.id);
        setActiveProject(nextProject || null);
    } else {
        setActiveProject(updatedProject);
    }

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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <Tabs defaultValue="projects" className="space-y-4">
        <Header 
          search={search}
          setSearch={setSearch}
          role={role}
          setRole={setRole}
          onProjectUpdate={handleProjectUpdate}
        />
        <TabsContent value="projects" className="space-y-4">
          {isTaskView && (
            <div className="mb-8">
              <ProjectForm 
                project={activeProject} 
                onFormSubmit={handleProjectUpdate}
                onCancel={() => setActiveProject(null)}
                role={role}
              />
            </div>
          )}
          <DataTable 
            data={filteredProjects}
            columns={columns}
            sort={sort}
            setSort={setSort}
            onProjectUpdate={handleProjectUpdate}
            onRowClick={isTaskView ? handleRowClick : undefined}
            activeProjectId={activeProject?.id}
          />
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
