
import * as React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import type { Project, Role } from '@/lib/data';
import { projects, roleHierarchy, clientNames, processes } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/header';

// This function simulates fetching and filtering projects based on role and filters,
// similar to how the dashboard does it.
async function getFilteredProjectsForUser(user: any, role: Role, searchParams: { [key: string]: string | string[] | undefined }): Promise<Project[]> {
    let allProjects: Project[] = JSON.parse(JSON.stringify(projects));
    
    // Filter by role
    if (role === 'Processor') {
      allProjects = allProjects.filter(p => p.processor === user.name);
    } else if (role === 'QA') {
      allProjects = allProjects.filter(p => p.qa === user.name);
    }

    // Apply other filters from searchParams if they exist
    const { search, searchColumn, clientName, process } = searchParams;
    
    if (search && searchColumn) {
        allProjects = allProjects.filter(p => 
            (p[searchColumn as keyof Project] as string)?.toLowerCase().includes((search as string).toLowerCase())
        );
    }
    if (clientName && clientName !== 'all') {
        allProjects = allProjects.filter(p => p.clientName === clientName);
    }
    if (process && process !== 'all') {
        allProjects = allProjects.filter(p => p.process === process);
    }
    
    // Sort like the dashboard
    allProjects.sort((a, b) => {
        const valA = a['allocationDate'];
        const valB = b['allocationDate'];
        if (valA < valB) return 1;
        if (valA > valB) return -1;
        return 0;
    });

    return allProjects;
}


export default async function TaskPage({ params, searchParams }: { params: { id: string }, searchParams: { [key: string]: string | string[] | undefined } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Determine active role from URL or fall back to user's highest role
  const urlRole = searchParams.role as Role;
  const activeRole = urlRole && session.user.roles.includes(urlRole) 
    ? urlRole 
    : roleHierarchy.find(role => session.user.roles.includes(role)) || session.user.roles[0];
  
  // Fetch the filtered and sorted list of projects for the current user and role
  const userProjects = await getFilteredProjectsForUser(session.user, activeRole, searchParams);
  
  const projectIndex = userProjects.findIndex(p => p.id === params.id);

  if (projectIndex === -1) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Project Not Found</CardTitle>
                    <CardDescription>The project you are looking for does not exist in your current filtered list or has been moved.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Return to Dashboard
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  const project = userProjects[projectIndex];
  const previousProject = projectIndex > 0 ? userProjects[projectIndex - 1] : null;
  const nextProject = projectIndex < userProjects.length - 1 ? userProjects[projectIndex + 1] : null;

  const handleFormSubmit = async (updatedProject: Project) => {
    'use server';
    redirect('/');
  };
  
  // Reconstruct the search params for the pagination links to maintain context
  const navigationSearchParams = new URLSearchParams();
  if (searchParams.search) navigationSearchParams.set('search', searchParams.search as string);
  if (searchParams.searchColumn) navigationSearchParams.set('searchColumn', searchParams.searchColumn as string);
  if (searchParams.clientName) navigationSearchParams.set('clientName', searchParams.clientName as string);
  if (searchParams.process) navigationSearchParams.set('process', searchParams.process as string);
  navigationSearchParams.set('role', activeRole);
  const queryString = navigationSearchParams.toString();


  return (
     <div className="flex flex-col h-screen bg-background w-full">
         <Header 
            user={session.user}
            activeRole={activeRole}
            isManagerOrAdmin={false}
            hasSearchResults={false}
            clientNames={clientNames}
            processes={processes}
         >
             <div className="flex items-center gap-4 text-sm font-medium">
                 <span>{`Result ${projectIndex + 1} of ${userProjects.length}`}</span>
                 <div className="flex items-center gap-1">
                    <Button asChild variant="outline" size="icon" className="h-8 w-8 text-foreground" disabled={!previousProject}>
                         <Link href={previousProject ? `/task/${previousProject.id}?${queryString}` : '#'}>
                            <ChevronLeft className="h-4 w-4" />
                         </Link>
                    </Button>
                     <Button asChild variant="outline" size="icon" className="h-8 w-8 text-foreground" disabled={!nextProject}>
                         <Link href={nextProject ? `/task/${nextProject.id}?${queryString}` : '#'}>
                             <ChevronRight className="h-4 w-4" />
                         </Link>
                    </Button>
                 </div>
             </div>
         </Header>
        <div className="flex-grow p-4">
           <ProjectForm 
                project={project} 
                onFormSubmit={handleFormSubmit} 
                role={activeRole}
            />
        </div>
    </div>
  );
}
