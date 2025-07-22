import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import type { Project, Role } from '@/lib/data';
import { projects, processorActionableStatuses } from '@/lib/data';
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

  const userRole = (session.user.roles.includes('QA') ? 'QA' : session.user.roles.includes('Processor') ? 'Processor' : 'Manager') as Role;
  
  const userProjectList = await getProjectsForUser(session.user, userRole);
  
  const currentProjectIndex = userProjectList.findIndex(p => p.id === params.id);

  if (currentProjectIndex === -1) {
    return <div>Project not found in your queue or does not exist.</div>;
  }
  
  const project = userProjectList[currentProjectIndex];
  const nextProjectId = currentProjectIndex < userProjectList.length - 1 ? userProjectList[currentProjectIndex + 1].id : null;
  const prevProjectId = currentProjectIndex > 0 ? userProjectList[currentProjectIndex - 1].id : null;


  return (
    <div className="flex flex-col h-screen bg-background w-full">
        <Header 
            user={session.user}
            activeRole={userRole}
            isManagerOrAdmin={false}
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
            <ProjectForm project={project} userRole={userRole} nextProjectId={nextProjectId}/>
        </main>
    </div>
  );
}
