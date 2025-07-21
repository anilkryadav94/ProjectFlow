
"use client";

import * as React from 'react';
import { type Project, type Role, ProcessType, type User, users as allUsers } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { ProjectForm } from './project-form';
import { ScrollArea } from './ui/scroll-area';
import { UserManagementTable } from './user-management-table';

// Role hierarchy for determining dashboard view
const roleHierarchy: Role[] = ['Admin', 'Manager', 'QA', 'Processor'];

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
  onProjectUpdate 
}: DashboardProps) {
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);

  // Determine the primary role for the user based on the hierarchy
  const primaryRole = React.useMemo(() => {
    for (const role of roleHierarchy) {
      if (user.roles.includes(role)) {
        return role;
      }
    }
    return user.roles[0] || 'Processor'; // Fallback
  }, [user.roles]);

  const filteredProjects = React.useMemo(() => {
    let userProjects = [...projects];
    // Role-based filtering
    if (primaryRole === 'Processor') {
      userProjects = userProjects.filter(p => p.processor === user.name && (p.status === 'Processing' || p.status === 'Pending' || p.status === 'On Hold'));
    } else if (primaryRole === 'QA') {
        userProjects = userProjects.filter(p => p.qa === user.name && p.status === 'QA');
    } else if (primaryRole === 'Manager' || primaryRole === 'Admin') {
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
  }, [search, sort, projects, primaryRole, user.name, clientNameFilter, processFilter]);

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

  const isTaskView = primaryRole === 'Processor' || primaryRole === 'QA';
  const isAdminView = primaryRole === 'Admin';


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
        />
        <div className="flex-grow mt-4 overflow-hidden">
          {isAdminView ? (
            <UserManagementTable users={allUsers} />
          ) : isTaskView ? (
             <div className="flex flex-col h-full gap-4">
                <ScrollArea className="flex-grow pr-4 h-[calc(100%-320px)]">
                    <ProjectForm 
                        project={activeProject} 
                        onFormSubmit={onProjectUpdate}
                        onCancel={() => setActiveProject(null)}
                        role={primaryRole}
                    />
                </ScrollArea>
                <div className="flex-shrink-0 h-[300px]">
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
