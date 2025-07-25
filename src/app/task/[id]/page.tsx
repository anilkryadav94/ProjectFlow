
import * as React from 'react';
import type { Project } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/header';
import { clientNames, processes } from '@/lib/data';
import { doc, getDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EditProjectDialog } from '@/components/edit-project-dialog';
import { onAuthChanged } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/data';

interface TaskPageProps {
    params: { id: string };
}

async function getProjectById(id: string): Promise<Project | undefined> {
    const projectDoc = await getDoc(doc(db, 'projects', id));
    if (projectDoc.exists()) {
        const data = projectDoc.data();
        // Convert Timestamps to ISO strings
        Object.keys(data).forEach(key => {
            if (data[key] instanceof Timestamp) {
                data[key] = data[key].toDate().toISOString().split('T')[0];
            }
        });
        return { id: projectDoc.id, ...data } as Project;
    }
    return undefined;
}

async function getUser(firebaseUser: import('firebase/auth').User): Promise<User | null> {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        return {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            ...userDocSnap.data()
        } as User;
    }
    return null;
}

// This is a client component because of useEffect and useState
export default function TaskPage({ params }: TaskPageProps) {
  const [project, setProject] = React.useState<Project | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPageData = async (fbUser: import('firebase/auth').User) => {
        try {
            const [projectData, userData] = await Promise.all([
                getProjectById(params.id),
                getUser(fbUser)
            ]);
            
            if (projectData) setProject(projectData);
            if (userData) setUser(userData);

        } catch (error) {
            console.error("Error fetching task page data:", error);
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = onAuthChanged(fbUser => {
        if (fbUser) {
            fetchPageData(fbUser);
        } else {
            // Handle not logged in case
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, [params.id]);


  if (loading) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!user || !project) {
    return (
        <div className="flex flex-col h-screen bg-background w-full">
            <Header 
                user={user || {id: '', name: 'Guest', email: '', roles: []}}
                activeRole={user?.roles[0] || 'Processor'}
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
  
  const isManagerOrAdmin = user.roles.includes('Manager') || user.roles.includes('Admin');

  return (
     <div className="flex flex-col h-screen bg-background w-full">
            <Header 
                user={user}
                activeRole={user.roles[0]}
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
