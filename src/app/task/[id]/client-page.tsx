
"use client";

import * as React from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { onAuthChanged } from '@/lib/auth';
import type { Project, Role, User, ProcessType } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';

interface TaskPageClientProps {
    user: User;
    initialProject: Project;
    initialUserProjectList: Project[];
    initialActiveRole: Role;
    clientNames: string[];
    processes: ProcessType[];
}

export function TaskPageClient({ 
    user, 
    initialProject, 
    initialUserProjectList, 
    initialActiveRole,
    clientNames,
    processes
}: TaskPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  
  const [session, setSession] = React.useState<{ user: User } | null>({ user });
  const [project, setProject] = React.useState<Project>(initialProject);
  const [userProjectList, setUserProjectList] = React.useState<Project[]>(initialUserProjectList);
  const [activeRole, setActiveRole] = React.useState<Role>(initialActiveRole);
  const [loading, setLoading] = React.useState(false);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const filteredIds = searchParams.get('filteredIds');
  
  // This effect handles auth state changes after initial load
  React.useEffect(() => {
    const unsubscribe = onAuthChanged((authUser) => {
        if (!authUser) {
            router.push('/login');
        }
    });
    return () => unsubscribe();
  }, [router]);

  // This effect synchronizes state if props change (e.g., navigating between task pages)
  React.useEffect(() => {
    setProject(initialProject);
    setUserProjectList(initialUserProjectList);
    setActiveRole(initialActiveRole);
    setSession({user});
  }, [initialProject, initialUserProjectList, initialActiveRole, user]);


  if (loading || !session || !project || !activeRole) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  let projectListToUse = userProjectList;
  if (filteredIds) {
    const filteredIdSet = new Set(filteredIds.split(','));
    projectListToUse = userProjectList.filter(p => filteredIdSet.has(p.id));
  }
  
  const currentProjectIndex = projectListToUse.findIndex(p => p.id === id);
  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';
  
  // A manager can view any project by direct link, even if it's not in their "queue"
  const canViewProject = isManagerOrAdmin || currentProjectIndex !== -1;

  if (!canViewProject) {
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
  
  const nextProjectId = currentProjectIndex !== -1 && currentProjectIndex < projectListToUse.length - 1 ? projectListToUse[currentProjectIndex + 1].id : null;
  const prevProjectId = currentProjectIndex > 0 ? projectListToUse[currentProjectIndex - 1].id : null;

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
                total: projectListToUse.length,
                nextId: nextProjectId,
                prevId: prevProjectId,
                filteredIds: filteredIds || undefined,
            }}
        />
        <main className="flex-1 h-full overflow-y-auto p-4 md:p-6">
            <ProjectForm project={project} userRole={activeRole} nextProjectId={nextProjectId} filteredIds={filteredIds || undefined}/>
        </main>
    </div>
  );
}
