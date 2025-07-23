
"use client";

import * as React from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getSession, onAuthChanged } from '@/lib/auth';
import type { Project, Role, User } from '@/lib/data';
import { processorActionableStatuses, roleHierarchy, projects as mockProjects, clientNames, processes } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';

export async function generateStaticParams() {
    return mockProjects.map((project) => ({
        id: project.id,
    }));
}

async function getAllProjects(): Promise<Project[]> {
    return mockProjects;
}

async function getProject(id: string): Promise<Project | null> {
    const project = mockProjects.find(p => p.id === id);
    return project || null;
}

async function getProjectsForUser(user: User, activeRole: Role): Promise<Project[]> {
    let allProjects = await getAllProjects();
    let userProjects: Project[];

    if (activeRole === 'Processor') {
        userProjects = allProjects.filter(p => p.processor === user.name && p.workflowStatus === 'With Processor' && processorActionableStatuses.includes(p.processorStatus));
    } else if (activeRole === 'QA') {
        userProjects = allProjects.filter(p => p.qa === user.name && p.workflowStatus === 'With QA');
    } else {
        userProjects = allProjects;
    }
    
    userProjects.sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
    
    return JSON.parse(JSON.stringify(userProjects));
}

export default function TaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [project, setProject] = React.useState<Project | null>(null);
  const [userProjectList, setUserProjectList] = React.useState<Project[]>([]);
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  const [loading, setLoading] = React.useState(true);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const filteredIds = searchParams.get('filteredIds');
  
  React.useEffect(() => {
    const checkAuthAndLoadData = async (user: any) => {
      // Mock auth always provides a user
      const sessionData = await getSession();
      if (!sessionData) {
        console.error("Mock session not found");
        router.push('/login');
        setLoading(false);
        return;
      }
      setSession(sessionData);

      const getHighestRole = (roles: Role[]): Role => {
        for (const role of roleHierarchy) {
          if (roles.includes(role)) {
            return role;
          }
        }
        return roles[0] || 'Processor';
      };
      
      const urlRole = searchParams.get('role') as Role;
      const calculatedRole = urlRole && sessionData.user.roles.includes(urlRole)
        ? urlRole
        : getHighestRole(sessionData.user.roles);
      setActiveRole(calculatedRole);

      const allProjectsForRole = await getProjectsForUser(sessionData.user, calculatedRole);

      let projectList: Project[];
      if (filteredIds) {
        const filteredIdSet = new Set(filteredIds.split(','));
        projectList = allProjectsForRole.filter(p => filteredIdSet.has(p.id));
      } else {
        projectList = allProjectsForRole;
      }
      setUserProjectList(projectList);

      const currentProject = await getProject(id);
      if (currentProject) {
        setProject(currentProject);
      } else {
        // Handle case where project is not found, maybe redirect
        router.push('/');
      }
      setLoading(false);
    };

    const unsubscribe = onAuthChanged((user) => {
        if (user) {
            checkAuthAndLoadData(user);
        } else {
            router.push('/login');
        }
    });
    return () => unsubscribe();
  }, [id, router, searchParams, filteredIds]);

  if (loading || !session || !project || !activeRole) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  const currentProjectIndex = userProjectList.findIndex(p => p.id === id);
  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';

  if (currentProjectIndex === -1 && !isManagerOr-Admin) {
    // If project is not in the user's filtered list and they are not a manager,
    // they shouldn't see it. However, managers can see any project by direct link.
    // We already loaded the project, so just show a message.
     if (!loading) {
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
     return null; // Still loading, show nothing
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
                filteredIds: filteredIds || undefined,
            }}
        />
        <main className="flex-1 h-full overflow-y-auto p-4 md:p-6">
            <ProjectForm project={project} userRole={activeRole} nextProjectId={nextProjectId} filteredIds={filteredIds || undefined}/>
        </main>
    </div>
  );
}
