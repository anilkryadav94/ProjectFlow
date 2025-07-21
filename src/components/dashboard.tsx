
"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, type User, roleHierarchy } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { UserManagementTable } from './user-management-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProjectForm } from './project-form';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';

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
  const [isNewProjectFormOpen, setIsNewProjectFormOpen] = React.useState(false);
  
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
  }, [search, searchColumn, activeRole, user.name, projects, sort]);


  if (!activeRole) {
    return null;
  }

  const showNewProjectButton = activeRole === 'Manager' || activeRole === 'Admin';
  const showFilters = activeRole === 'Manager' || activeRole === 'Processor' || activeRole === 'QA' || activeRole === 'Admin';

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
            handleDownload={handleDownload}
            isDownloadDisabled={dashboardProjects.length === 0}
            showFilters={showFilters}
        />
        <div className="flex flex-col flex-grow overflow-hidden p-4 gap-4">
            {activeRole === 'Admin' ? (
                <UserManagementTable sessionUser={user} />
            ) : (
                <>
                    {showNewProjectButton && (
                        <div className="flex justify-end">
                            <Button onClick={() => setIsNewProjectFormOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New Project
                            </Button>
                        </div>
                    )}
                    <DataTable 
                        data={dashboardProjects}
                        columns={columns}
                        sort={sort}
                        setSort={setSort}
                    />
                </>
            )}
        </div>
        <Dialog open={isNewProjectFormOpen} onOpenChange={setIsNewProjectFormOpen}>
            <DialogContent className="sm:max-w-[75vw] h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ProjectForm 
                        onFormSubmit={handleProjectUpdate} 
                        setOpen={setIsNewProjectFormOpen}
                        role={activeRole}
                    />
                </div>
            </DialogContent>
      </Dialog>
    </div>
  );
}
