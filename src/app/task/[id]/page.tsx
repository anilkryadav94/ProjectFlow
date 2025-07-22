
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
        // For Manager/Admin, for now, let's just use all projects for pagination context
        userProjects = projects;
    }
    
    // Sort by allocation date
    userProjects.sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
    
    return userProjects;
}


export default async function TaskPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Determine active role based on URL search param or user's highest role.
  const searchParams = new URLSearchParams(''); // dummy for server component
  const urlRole = searchParams.get('role') as Role | null;

  const getHighestRole = (roles: Role[]): Role => {
    for (const role of roleHierarchy) {
      if (roles.includes(role)) {
        return role;
      }
    }
    return roles[0] || 'Processor';
  }

  const activeRole = urlRole && session.user.roles.includes(urlRole)
    ? urlRole
    : getHighestRole(session.user.roles);
  
  const userProjectList = await getProjectsForUser(session.user, activeRole);
  
  const currentProjectIndex = userProjectList.findIndex(p => p.id === params.id);

  const project = projects.find(p => p.id === params.id);

  if (!project) {
    return <div>Project with ID {params.id} does not exist.</div>;
  }
  
  // If the project exists but is not in the user's current queue, show a message.
  if (currentProjectIndex === -1 && (activeRole === 'Processor' || activeRole === 'QA')) {
    return <div>Project not found in your current "{activeRole}" queue.</div>;
  }
  
  const nextProjectId = currentProjectIndex < userProjectList.length - 1 ? userProjectList[currentProjectIndex + 1].id : null;
  const prevProjectId = currentProjectIndex > 0 ? userProjectList[currentProjectIndex - 1].id : null;

  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';


  return (
    <div className="flex flex-col h-screen bg-background w-full">
        <Header 
            user={session.user}
            activeRole={activeRole}
            isManagerOrAdmin={isManagerOrAdmin}
            clientNames={clientNames}
            processes={processes}
            taskPagination={{
                currentIndex: currentProjectIndex,
                total: userProjectList.length,
                nextId: nextProjectId,
                prevId: prevProjectId,
            }}
        />
        <main className="flex-1 h-full overflow-y-auto p-4 md:p-6">
            <ProjectForm project={project} userRole={activeRole} nextProjectId={nextProjectId}/>
        </main>
    </div>
  );
}


    