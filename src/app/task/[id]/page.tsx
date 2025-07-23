
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import type { Project, Role, User } from '@/lib/data';
import { projects as mockProjects, processorActionableStatuses, roleHierarchy, clientNames, processes } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { Header } from '@/components/header';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
    return mockProjects.map((project) => ({
        id: project.id,
    }));
}

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

export default async function TaskPage({ params, searchParams }: { params: { id: string }, searchParams: { role?: Role, filteredIds?: string } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  
  const getHighestRole = (roles: Role[]): Role => {
    for (const role of roleHierarchy) {
      if (roles.includes(role)) {
        return role;
      }
    }
    return roles[0] || 'Processor';
  };
  
  const urlRole = searchParams.role;
  const activeRole = urlRole && session.user.roles.includes(urlRole)
    ? urlRole
    : getHighestRole(session.user.roles);
  
  const allProjectsForRole = await getProjectsForUser(session.user, activeRole);

  let userProjectList: Project[];
  
  if (searchParams.filteredIds) {
    const filteredIdSet = new Set(searchParams.filteredIds.split(','));
    userProjectList = allProjectsForRole.filter(p => filteredIdSet.has(p.id));
  } else {
    userProjectList = allProjectsForRole;
  }
  
  const currentProjectIndex = userProjectList.findIndex(p => p.id === params.id);

  const project = mockProjects.find(p => p.id === params.id);

  if (!project) {
    notFound();
  }
  
  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';
  
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
                filteredIds: searchParams.filteredIds,
            }}
        />
        <main className="flex-1 h-full overflow-y-auto p-4 md:p-6">
            <ProjectForm project={project} userRole={activeRole} nextProjectId={nextProjectId} filteredIds={searchParams.filteredIds}/>
        </main>
    </div>
  );
}
