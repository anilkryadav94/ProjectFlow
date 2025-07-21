
"use client";

import * as React from 'react';
import { type Project, type Role, ProcessType, type User, users as allUsers } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { ProjectForm } from './project-form';
import { ScrollArea } from './ui/scroll-area';
import { UserManagementTable } from './user-management-table';

interface DashboardProps {
  user: User;
  projects: Project[];
  search: string;
  setSearch: (search: string) => void;
  sort: { key: keyof Project; direction: 'asc' | 'desc' } | null;
  setSort: (sort: { key: keyof Project; direction: 'asc' | 'desc' } | null) => void;
  clientNameFilter: string;
  setClientNameFilter: (client: string) => void;
  processFilter: ProcessType | 'all';
  setProcessFilter: (process: ProcessType | 'all') => void;
  onProjectUpdate: (project: Project) => void;
  activeRole: Role;
  setActiveRole: (role: Role) => void;
}

export default function Dashboard({ 
  user, 
  projects,
  search,
  setSearch,
  sort,
  setSort,
  clientNameFilter,
  setClientNameFilter,
  processFilter,
  setProcessFilter,
  onProjectUpdate,
  activeRole,
  setActiveRole
}: DashboardProps) {
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);

  const filteredProjects = React.useMemo(() => {
    let userProjects = [...projects];
    // Role-based filtering
    if (activeRole === 'Processor') {
      userProjects = userProjects.filter(p => p.processor === user.name && (p.status === 'Processing' || p.status === 'Pending' || p.status === 'On Hold'));
    } else if (activeRole === 'QA') {
        userProjects = userProjects.filter(p => p.qa === user.name && p.status === 'QA');
    } else if (activeRole === 'Manager' || activeRole === 'Admin') {
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

  const isTaskView = activeRole === 'Processor' || activeRole === 'QA';
  const isAdminView = activeRole === 'Admin';


  return (
    <div className="flex flex-col h-screen p-4 md:p-8 pt-6">
        <Header 
          search={search}
          setSearch={setSearch}
          user={user}
          clientNameFilter={clientNameFilter}
          setClientNameFilter={setClientNameFilter}
          processFilter={processFilter}
          setProcessFilter={setProcessFilter}
          onProjectUpdate={onProjectUpdate}
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          projectsToDownload={filteredProjects}
        />
        <div className="flex-grow mt-4 overflow-hidden">
          {isAdminView ? (
            <UserManagementTable users={allUsers} />
          ) : isTaskView ? (
             <div className="flex flex-col h-full space-y-4">
                <div className="h-[60%] flex-shrink-0">
                    <ProjectForm 
                        project={activeProject} 
                        onFormSubmit={onProjectUpdate}
                        onCancel={() => setActiveProject(null)}
                        role={activeRole}
                    />
                </div>
                <div className="h-[40%] flex-grow">
                    <DataTable 
                        data={filteredProjects}
                        columns={columns}
                        sort={sort}
                        setSort={setSort}
                        onProjectUpdate={onProjectUpdate}
                        onRowClick={handleRowClick}
                        activeProjectId={activeProject?.id}
                        isTaskView={true}
                    />
                </div>
            </div>
          ) : ( // Manager view
             <DataTable 
                data={filteredProjects}
                columns={columns}
                sort={sort}
                setSort={setSort}
                onProjectUpdate={onProjectUpdate}
                isTaskView={false}
              />
          )}
        </div>
    </div>
  );
}

    