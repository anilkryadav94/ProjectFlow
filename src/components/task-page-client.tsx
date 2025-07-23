
"use client";

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, onAuthChanged } from '@/lib/auth';
import type { Project, Role, User } from '@/lib/data';
import { projects as mockProjects, roleHierarchy, clientNames, processes } from '@/lib/data';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

function getProjectById(id: string): Project | undefined {
    return mockProjects.find(p => p.id === id);
}

export function TaskPageClient({ params }: { params: { id: string }}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [session, setSession] = React.useState<{ user: User } | null>(null);
    const [project, setProject] = React.useState<Project | null | undefined>(undefined);
    const [loading, setLoading] = React.useState(true);
    const [activeRole, setActiveRole] = React.useState<Role | null>(null);

    const id = params.id;
    const urlRole = searchParams.get('role') as Role | null;

    React.useEffect(() => {
        const unsubscribe = onAuthChanged(async (user) => {
            if (user) {
                const sessionData = await getSession();
                if (sessionData) {
                    setSession(sessionData);
                    const highestRole = roleHierarchy.find(role => sessionData.user.roles.includes(role)) || sessionData.user.roles[0];
                    const currentRole = urlRole && sessionData.user.roles.includes(urlRole) ? urlRole : highestRole;
                    setActiveRole(currentRole);
                    
                    const foundProject = getProjectById(id);
                    setProject(foundProject);
                } else {
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id, urlRole, router]);

    if (loading || project === undefined) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const roleForHeader = activeRole || session?.user?.roles[0] || 'Processor';
    const isManagerOrAdmin = roleForHeader === 'Manager' || roleForHeader === 'Admin';
    
    if (!session) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!project) {
        return (
             <div className="flex flex-col h-screen bg-background w-full">
                <Header 
                    user={session.user}
                    activeRole={roleForHeader}
                    isManagerOrAdmin={isManagerOrAdmin}
                    clientNames={clientNames}
                    processes={processes}
                />
                <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 flex items-center justify-center">
                    <p>Project not found or you do not have access.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background w-full">
            <Header 
                user={session.user}
                activeRole={roleForHeader}
                isManagerOrAdmin={isManagerOrAdmin}
                clientNames={clientNames}
                processes={processes}
            />
            <main className="flex-1 h-full overflow-y-auto p-4 md:p-6">
                <div className="animated-border">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>{project.refNumber}</CardTitle>
                                <Badge variant="outline">{project.workflowStatus}</Badge>
                            </div>
                            <CardDescription>{project.subject}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                           <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Client Name</p>
                                <p className="text-base font-semibold">{project.clientName}</p>
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
                                <p className="text-base font-semibold">{project.allocationDate}</p>
                           </div>
                           <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Email Date</p>
                                <p className="text-base font-semibold">{project.emailDate}</p>
                           </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
