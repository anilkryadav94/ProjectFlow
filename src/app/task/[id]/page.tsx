
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import type { Project, Role } from '@/lib/data';
import { projects } from '@/lib/data';
import { ProjectForm } from '@/components/project-form';
import { TaskSidebar } from '@/components/task-sidebar';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";

async function getProject(id: string): Promise<Project | undefined> {
  // In a real app, this would be a database call.
  return projects.find(p => p.id === id);
}

export default async function TaskPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const project = await getProject(params.id);

  if (!project) {
    return <div>Project not found</div>;
  }
  
  const userRole = (session.user.roles.includes('QA') ? 'QA' : 'Processor') as Role;


  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
         <Sidebar>
            <TaskSidebar project={project} userRole={userRole}/>
         </Sidebar>
          <SidebarInset>
            <main className="flex-1 h-full overflow-y-auto p-4 md:p-6">
                <ProjectForm project={project} userRole={userRole} />
            </main>
          </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
