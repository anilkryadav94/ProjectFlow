
import * as React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import type { Project } from '@/lib/data';
import { projects } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/header';

async function getProjectById(id: string): Promise<Project | undefined> {
    // In a real app, this would be a database call.
    return projects.find(p => p.id === id);
}

export default async function TaskPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const project = await getProjectById(params.id);

  if (!project) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Project Not Found</CardTitle>
                    <CardDescription>The project you are looking for does not exist or has been moved.</CardDescription>
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

  // A simple function to re-fetch projects, simulating a state update on the main page.
  // In a real app with a DB, this might not be needed if you use a state management library.
  const handleFormSubmit = async (updatedProject: Project) => {
    'use server';
    // This doesn't actually do anything server-side since we're navigating away,
    // but it demonstrates where you'd put a server action or API call.
    // For now, the `saveProject` action already updates the in-memory array.
    redirect('/');
  };

  return (
     <div className="flex flex-col h-screen bg-background w-full">
         <Header 
            user={session.user}
            activeRole={session.user.roles[0]} // Simplified for this context
            showFilters={false} // Don't show filters on the task page
         />
        <div className="flex-grow p-4">
           <ProjectForm 
                project={project} 
                onFormSubmit={handleFormSubmit} 
                role={session.user.roles[0]} // Simplified for this context
            />
        </div>
    </div>
  );
}
