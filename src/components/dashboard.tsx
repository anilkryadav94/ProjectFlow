
"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, ProcessType, type User, roleHierarchy, ProjectStatus, clientNames, processes, projectStatuses } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { UserManagementTable } from './user-management-table';
import type { DateRange } from 'react-day-picker';
import { DataTableRowActions } from './data-table-row-actions';

interface DashboardProps {
  user: User;
  initialProjects: Project[];
}

export type SearchableColumn = 'refNumber' | 'applicationNumber' | 'patentNumber' | 'subject';


export default function Dashboard({ 
  user, 
  initialProjects,
}: DashboardProps) {
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [search, setSearch] = React.useState('');
  const [searchColumn, setSearchColumn] = React.useState<SearchableColumn>('refNumber');
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  const [clientNameFilter, setClientNameFilter] = React.useState<string[]>([]);
  const [processFilter, setProcessFilter] = React.useState<string[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [emailDateFilter, setEmailDateFilter] = React.useState<DateRange | undefined>();
  const [allocationDateFilter, setAllocationDateFilter] = React.useState<DateRange | undefined>();
  
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
  };
  
  const resetFilters = () => {
    setSearch('');
    setClientNameFilter([]);
    setProcessFilter([]);
    setStatusFilter([]);
    setEmailDateFilter(undefined);
    setAllocationDateFilter(undefined);
    setSearchColumn('refNumber');
  }

  const handleDownload = () => {
    const csv = Papa.unparse(dashboardProjects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `projects_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dashboardProjects = React.useMemo(() => {
    let filteredProjects = [...projects];

    if (activeRole === 'Processor') {
      filteredProjects = filteredProjects.filter(p => p.processor === user.name);
    } else if (activeRole === 'QA') {
      filteredProjects = filteredProjects.filter(p => p.qa === user.name);
    }
    
    if (search && searchColumn) {
        filteredProjects = filteredProjects.filter(project => {
            const projectValue = project[searchColumn];
            if (typeof projectValue === 'string') {
                return projectValue.toLowerCase().includes(search.toLowerCase());
            }
            return false;
        });
    }
    
    if (clientNameFilter.length > 0) {
      filteredProjects = filteredProjects.filter(p => clientNameFilter.includes(p.clientName));
    }

    if (processFilter.length > 0) {
      filteredProjects = filteredProjects.filter(p => processFilter.includes(p.process));
    }

    if (statusFilter.length > 0) {
        filteredProjects = filteredProjects.filter(p => statusFilter.includes(p.status));
    }

    if (emailDateFilter?.from) {
        filteredProjects = filteredProjects.filter(p => new Date(p.emailDate) >= emailDateFilter.from!);
    }
    if (emailDateFilter?.to) {
        filteredProjects = filteredProjects.filter(p => new Date(p.emailDate) <= emailDateFilter.to!);
    }

    if (allocationDateFilter?.from) {
        filteredProjects = filteredProjects.filter(p => new Date(p.allocationDate) >= allocationDateFilter.from!);
    }
    if (allocationDateFilter?.to) {
        filteredProjects = filteredProjects.filter(p => new Date(p.allocationDate) <= allocationDateFilter.to!);
    }
    
    if (sort) {
      filteredProjects.sort((a, b) => {
        const valA = a[sort.key];
        const valB = b[sort.key];
        if (valA === null) return 1; if (valB === null) return -1;
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredProjects;
  }, [search, searchColumn, clientNameFilter, processFilter, statusFilter, emailDateFilter, allocationDateFilter, activeRole, user.name, projects, sort]);


  if (!activeRole) {
    return null;
  }

  return (
     <div className="flex flex-col h-screen bg-background w-full">
        <Header 
            user={user}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            search={search}
            setSearch={setSearch}
            searchColumn={searchColumn}
            setSearchColumn={setSearchColumn}
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
            onResetFilters={resetFilters}
            handleDownload={handleDownload}
            isDownloadDisabled={dashboardProjects.length === 0}
        />
        <div className="flex flex-col flex-grow overflow-hidden p-4 gap-4">
          {activeRole === 'Admin' ? (
            <UserManagementTable sessionUser={user} />
          ) : (
            <DataTable 
                data={dashboardProjects}
                columns={[
                  ...columns,
                  {
                    key: "actions",
                    header: "Actions",
                    render: (project: Project) => (
                      <DataTableRowActions project={project} onProjectUpdate={handleProjectUpdate} role={activeRole} />
                    ),
                  }
                ]}
                sort={sort}
                setSort={setSort}
            />
          )}
        </div>
    </div>
  );
}
