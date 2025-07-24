import * as React from 'react';
import type { Project } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSession } from '@/lib/auth';
import { Header } from '@/components/header';
import { clientNames, processes } from '@/lib/data';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EditProjectDialog } from '@/components/edit-project-dialog';

// This function is no longer for static generation, but can help with types.
// It could be used for generating a sitemap in the future.
export async function generateStaticParams() {
    const projectsCollection = collection(db, "projects");
    const projectSnapshot = await getDocs(projectsCollection);
    return projectSnapshot.docs.map((doc) => ({
        id: doc.id,
    }));
}

async function getProjectById(id: string): Promise<Project | undefined> {
    const projectDoc = await getDoc(doc(db, 'projects', id));
    if (projectDoc.exists()) {
        return { id: projectDoc.id, ...projectDoc.data() } as Project;
    }
    return undefined;
}

// This is the server component.
export default async function TaskPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const project = await getProjectById(params.id);

  if (!session || !project) {
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

  // Since we are moving to a fully dynamic app, we can no longer rely on
  // a separate client component. The page itself will be interactive.
  // We can pass the initial project data to a client component that contains the dialog.
  
  // A better approach for a fully dynamic page would be to fetch the data client-side
  // in a useEffect hook. But for now, we pass it from the server component.

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
                <div>
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>{project.id}</CardTitle>
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
                {/* The dialog should be triggered from the main dashboard, not here */}
            </main>
        </div>
  );
}
