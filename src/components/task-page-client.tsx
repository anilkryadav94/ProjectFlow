
"use client";

import * as React from 'react';
import { useRouter, useSearchParams, notFound } from 'next/navigation';
import { getSession, onAuthChanged } from '@/lib/auth';
import type { Project, Role, User } from '@/lib/data';
import { projects as mockProjects, processorActionableStatuses, roleHierarchy, clientNames, processes } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';

async function getProjectsForUser(user: User, activeRole: Role): Promise<Project[]> {
    let userProjects: Project[];

    if (activeRole === 'Processor') {
        userProjects = mockProjects.filter(p => p.processor === user.name && p.workflowStatus === 'With Processor' && processorActionableStatuses.includes(p.processorStatus));
    } else if (activeRole === 'QA') {
        userProjects = mockProjects.filter(p => p.qa === user.name && p.workflowStatus === 'With QA');
    } else {
        userProjects = mockProjects;
    }
    
    userProjects.sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
    
    return JSON.parse(JSON.stringify(userProjects));
}

export function TaskPageClient({ params }: { params: { id: string }}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [session, setSession] = React.useState<{ user: User } | null>(null);
    const [projectData, setProjectData] = React.useState<{
        project: Project;
        userProjectList: Project[];
        activeRole: Role;
    } | null>(null);
    const [loading, setLoading] = React.useState(true);

    const id = params.id;
    const urlRole = searchParams.get('role') as Role | null;
    const filteredIdsParam = searchParams.get('filteredIds');

    React.useEffect(() => {
        const unsubscribe = onAuthChanged(async (user) => {
            if (user) {
                const sessionData = await getSession();
                if (sessionData) {
                    setSession(sessionData);

                    const getHighestRole = (roles: Role[]): Role => {
                        for (const role of roleHierarchy) {
                            if (roles.includes(role)) return role;
                        }
                        return roles[0] || 'Processor';
                    };

                    const activeRole = urlRole && sessionData.user.roles.includes(urlRole)
                        ? urlRole
                        : getHighestRole(sessionData.user.roles);
                    
                    const allProjectsForRole = await getProjectsForUser(sessionData.user, activeRole);

                    let userProjectList: Project[];
                    if (filteredIdsParam) {
                        const filteredIdSet = new Set(filteredIdsParam.split(','));
                        userProjectList = allProjectsForRole.filter(p => filteredIdSet.has(p.id));
                    } else {
                        userProjectList = allProjectsForRole;
                    }

                    const project = mockProjects.find(p => p.id === id);
                    if (project) {
                        setProjectData({ project, userProjectList, activeRole });
                    } else {
                        setProjectData(null); 
                    }
                } else {
                    setSession(null);
                    router.push('/login');
                }
            } else {
                setSession(null);
                router.push('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id, urlRole, filteredIdsParam, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!session || !projectData) {
        // This will be caught by the error boundary or show a message.
        // notFound() can be used in server components, but here we'll just show a message.
        return (
             <div className="flex flex-col h-screen bg-background w-full">
                <Header 
                    user={session?.user || {id: '', email: '', name: 'Guest', roles: []}}
                    activeRole={searchParams.get('role') as Role || 'Processor'}
                    isManagerOrAdmin={false}
                    clientNames={clientNames}
                    processes={processes}
                />
                <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 flex items-center justify-center">
                    <p>Project not found or you do not have access.</p>
                </main>
            </div>
        );
    }
    
    const { project, userProjectList, activeRole } = projectData;

    const currentProjectIndex = userProjectList.findIndex(p => p.id === project.id);
    const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';
    
    // This check is now more robust.
    if (currentProjectIndex === -1 && !isManagerOrAdmin) {
       return (
          <div className="flex flex-col h-screen bg-background w-full">
              <Header 
                  user={session.user}
                  activeRole={activeRole}
                  isManagerOrAdmin={isManagerOrAdmin}
                  clientNames={clientNames}
                  processes={processes}
              />
              <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 flex items-center justify-center">
                  <p>Project not found in your current "{activeRole}" queue.</p>
              </main>
          </div>
      );
    }
  
    const nextProjectId = currentProjectIndex !== -1 && currentProjectIndex < userProjectList.length - 1 ? userProjectList[currentProjectIndex + 1].id : null;
    const prevProjectId = currentProjectIndex > 0 ? userProjectList[currentProjectIndex - 1].id : null;

    return (
        <div className="flex flex-col h-screen bg-background w-full">
            <Header 
                user={session.user}
                activeRole={activeRole}
                isManagerOrAdmin={isManagerOrAdmin}
                clientNames={clientNames}
                processes={processes}
                taskPagination={{
                    currentIndex: currentProjectIndex === -1 ? 0 : currentProjectIndex,
                    total: userProjectList.length,
                    nextId: nextProjectId,
                    prevId: prevProjectId,
                    filteredIds: filteredIdsParam ?? undefined,
                }}
            />
            <main className="flex-1 h-full overflow-y-auto p-4 md:p-6">
                <ProjectForm project={project} userRole={activeRole} nextProjectId={nextProjectId} filteredIds={filteredIdsParam ?? undefined}/>
            </main>
        </div>
    );
}
