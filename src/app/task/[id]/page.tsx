
import * as React from 'react';
import { projects } from '@/lib/data';
import type { Project } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Header } from '@/components/header';
import { clientNames, processes } from '@/lib/data';

// This function is required for static export with dynamic routes.
// It tells Next.js which pages to generate at build time.
export async function generateStaticParams() {
    return projects.map((project) => ({
        id: project.id,
    }));
}

async function getProjectById(id: string): Promise<Project | undefined> {
    return projects.find(p => p.id === id);
}

// This is the server component.
export default async function TaskPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const project = await getProjectById(params.id);

  if (!session || !project) {
    // If no session or project, we can handle it appropriately.
    // For a static export, redirecting isn't ideal on the server.
    // Client-side logic will handle redirects if the user is not logged in.
    // If project is not found, we render a not found message.
    return (
        <div className="flex flex-col h-screen bg-background w-full">
            <Header 
                user={session?.user || {name: 'Guest', email: '', roles: []}}
                activeRole={session?.user?.roles[0] || 'Processor'}
                isManagerOrAdmin={false}
                clientNames={clientNames}
                processes={processes}
            />
            <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 flex items-center justify-center">
                <p>Project not found or you do not have access.</p>
            </main>
        </div>
    )
  }
  
  const isManagerOrAdmin = session.user.roles.includes('Manager') || session.user.roles.includes('Admin');


  // All the interactive logic, data fetching based on session, and state
  // management is now handled inside TaskPageClient.
  return (
     <div className="flex flex-col h-screen bg-background w-full">
            <Header 
                user={session.user}
                activeRole={session.user.roles[0]}
                isManagerOrAdmin={isManagerOrAdmin}
                clientNames={clientNames}
                processes={processes}
            />
            <main className="flex-1 h-full overflow-y-auto p-4 md:p-6">
                <div className="animated-border">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>{project.ref_number}</CardTitle>
                                <Badge variant="outline">{project.workflowStatus}</Badge>
                            </div>
                            <CardDescription>{project.subject_line}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                           <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Client Name</p>
                                <p className="text-base font-semibold">{project.client_name}</p>
                           </div>
                           <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Process</p>
                                <p className="text-base font-semibold">{project.process}</p>
                           </div>
                           <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Processor</p>
                                <p className="text-base font-semibold">{project.processor}</p>
                           </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">QA</p>
                                <p className="text-base font-semibold">{project.qa}</p>
                           </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Allocation Date</p>
                                <p className="text-base font-semibold">{project.allocation_date}</p>
                           </div>
                           <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Email Date</p>
                                <p className="text-base font-semibold">{project.received_date}</p>
                           </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
  );
}
