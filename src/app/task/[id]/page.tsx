
import { redirect } from 'next/navigation';
import { getSession, getUsers } from '@/lib/auth';
import type { Project, Role } from '@/lib/data';
import { processorActionableStatuses, roleHierarchy } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { Header } from '@/components/header';
import { clientNames, processes } from '@/lib/data';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';

async function getAllProjects(): Promise<Project[]> {
    const projectsCollection = collection(db, "projects");
    const projectsSnapshot = await getDocs(projectsCollection);
    const projectsList = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    return projectsList;
}

async function getProject(id: string): Promise<Project | null> {
    const projectRef = doc(db, "projects", id);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
        return null;
    }
    return { id: projectSnap.id, ...projectSnap.data() } as Project;
}

async function getProjectsForUser(user: { name: string; roles: Role[], id: string, email: string }, activeRole: Role): Promise<Project[]> {
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

  const project = await getProject(params.id);

  if (!project) {
    return <div>Project not found in your queue or does not exist.</div>;
  }
  
  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';
  
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
