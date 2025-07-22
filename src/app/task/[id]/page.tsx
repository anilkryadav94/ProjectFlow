
import * as React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import type { Project, Role } from '@/lib/data';
import { projects, roleHierarchy, clientNames, processes, processorActionableStatuses } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/header';

// This function simulates fetching and filtering projects based on role and filters,
// similar to how the dashboard does it.
async function getFilteredProjectsForUser(user: any, role: Role): Promise<Project[]> {
    let allProjects: Project[] = JSON.parse(JSON.stringify(projects));
    
    if (role === 'Processor') {
      allProjects = allProjects.filter(p => p.processor === user.name && p.workflowStatus === 'With Processor' && processorActionableStatuses.includes(p.processorStatus));
    } else if (role === 'QA') {
      allProjects = allProjects.filter(p => p.qa === user.name && p.workflowStatus === 'With QA');
    }
    
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
  const userProjects = await getFilteredProjectsForUser(session.user, activeRole);
  
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
    // This handler is now mostly for client-side state updates if needed,
    // as redirection is handled in the server action.
  };
  
  // Reconstruct the search params for the pagination links to maintain context
  const navigationSearchParams = new URLSearchParams();
  navigationSearchParams.set('role', activeRole);
  const queryString = navigationSearchParams.toString();


  return (
     <div className="flex flex-col h-screen bg-background w-full">
         <Header 
            user={session.user}
            activeRole={activeRole}
            setActiveRole={(role) => {
                const newUrl = `/?role=${role}`;
                router.push(newUrl);
            }}
            isManagerOrAdmin={false}
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
                nextProjectId={nextProject?.id}
            />
        </div>
    </div>
  );
}
