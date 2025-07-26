"use client";

import * as React from 'react';
import type { Project, Role, User, ProcessType } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/header';
import { getProjectById } from '@/services/project-service';
import { getUserDocument } from '@/services/user-service';
import { EditProjectDialog } from '@/components/edit-project-dialog';
import { onAuthChanged, getUsers } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface TaskPageProps {
    params: { id: string };
}


// This is a client component because of useEffect and useState
export default function TaskPage({ params }: TaskPageProps) {
  const [project, setProject] = React.useState<Project | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dropdownOptions, setDropdownOptions] = React.useState({
      clientNames: [] as string[],
      processors: [] as string[],
      qas: [] as string[],
      caseManagers: [] as string[],
      processes: [] as ProcessType[],
  });

  React.useEffect(() => {
    const fetchPageData = async (fbUser: import('firebase/auth').User) => {
        try {
             const [projectData, userData, allUsers] = await Promise.all([
                getProjectById(params.id),
                getUserDocument(fbUser.uid),
                getUsers()
            ]);
            
            if (projectData) setProject(projectData);
            if (userData && fbUser.email) {
                setUser({
                    id: fbUser.uid,
                    email: fbUser.email,
                    ...userData
                });
            }
            if (allUsers) {
                 setDropdownOptions({
                    clientNames: [...new Set(allUsers.map(u => u.name).filter(Boolean))].sort(),
                    processors: allUsers.filter(u => u.roles.includes('Processor')).map(u => u.name).sort(),
                    qas: allUsers.filter(u => u.roles.includes('QA')).map(u => u.name).sort(),
                    caseManagers: allUsers.filter(u => u.roles.includes('Case Manager')).map(u => u.name).sort(),
                    processes: ['Patent', 'TM', 'IDS', 'Project'] as ProcessType[],
                });
            }

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
                clientNames={dropdownOptions.clientNames}
                processes={dropdownOptions.processes}
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
                clientNames={dropdownOptions.clientNames}
                processes={dropdownOptions.processes}
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
            </main>
        </div>
  );
}
