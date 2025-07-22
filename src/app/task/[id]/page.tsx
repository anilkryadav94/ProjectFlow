
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import type { Project, Role } from '@/lib/data';
import { projects, processorActionableStatuses, roleHierarchy } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { Header } from '@/components/header';
import { clientNames, processes } from '@/lib/data';

async function getProjectsForUser(user: { name: string; roles: Role[] }, activeRole: Role): Promise<Project[]> {
    let userProjects: Project[];

    if (activeRole === 'Processor') {
        userProjects = projects.filter(p => p.processor === user.name && p.workflowStatus === 'With Processor' && processorActionableStatuses.includes(p.processorStatus));
    } else if (activeRole === 'QA') {
        userProjects = projects.filter(p => p.qa === user.name && p.workflowStatus === 'With QA');
    } else {
        // For Manager/Admin, we show all projects, but pagination context will be based on the role view they came from.
        // If they navigate directly, it uses their highest role.
        userProjects = projects;
    }
    
    // Sort by allocation date
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
  
  // Prioritize role from URL, then fall back to user's highest role
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

  const project = projects.find(p => p.id === params.id);

  if (!project) {
    return <div>Project not found in your queue or does not exist.</div>;
  }
  
  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';
  
  // If the project exists but is not in the user's specific queue, show a message.
  // This check is not for managers/admins.
  if (currentProjectIndex === -1 && !isManagerOrAdmin) {
    return <div>Project not found in your current "{activeRole}" queue.</div>;
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

