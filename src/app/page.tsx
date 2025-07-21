
"use client";

import * as React from 'react';
import Dashboard from '@/components/dashboard';
import { redirect } from 'next/navigation';
import { getSession, getUsers } from '@/lib/auth';
import type { Project, Role, ProcessType, User } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { collection, getDocs, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const roleHierarchy: Role[] = ['Admin', 'Manager', 'QA', 'Processor'];

function toISOString(date: Date | string | Timestamp | null | undefined): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date instanceof Timestamp) return date.toDate().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
}

async function getProjects(): Promise<Project[]> {
    const projectsCol = collection(db, "projects");
    const q = query(projectsCol, orderBy("allocationDate", "desc"));
    const projectSnapshot = await getDocs(q);
    const projectList = projectSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            emailDate: toISOString(data.emailDate)!,
            allocationDate: toISOString(data.allocationDate)!,
            processingDate: toISOString(data.processingDate),
            qaDate: toISOString(data.qaDate),
        } as Project;
    });
    return projectList;
}

export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  const [clientNameFilter, setClientNameFilter] = React.useState<string>('all');
  const [processFilter, setProcessFilter] = React.useState<ProcessType | 'all'>('all');
  const { toast } = useToast();

  React.useEffect(() => {
    async function fetchInitialData() {
      setIsLoading(true);
      const sessionData = await getSession();
      if (!sessionData) {
        redirect('/login');
        return;
      }
      
      setSession(sessionData);
      if (sessionData.user?.roles?.length > 0) {
        for (const role of roleHierarchy) {
            if (sessionData.user.roles.includes(role)) {
                setActiveRole(role);
                break;
            }
        }
      }

      const initialProjects = await getProjects();
      setProjects(initialProjects);
      setIsLoading(false);
    }
    fetchInitialData();

    // Set up real-time listener for projects
    const q = query(collection(db, "projects"), orderBy("allocationDate", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const updatedProjects = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                emailDate: toISOString(data.emailDate)!,
                allocationDate: toISOString(data.allocationDate)!,
                processingDate: toISOString(data.processingDate),
                qaDate: toISOString(data.qaDate),
            } as Project;
        });
        setProjects(updatedProjects);
    });

    return () => unsubscribe();
  }, []);

  const handleProjectUpdate = (updatedProject: Project) => {
    // With real-time listener, local state updates are less critical,
    // but can be useful for immediate UI feedback.
    const existingProjectIndex = projects.findIndex(p => p.id === updatedProject.id);

    if (existingProjectIndex > -1) {
        const newProjects = [...projects];
        newProjects[existingProjectIndex] = updatedProject;
        setProjects(newProjects);
    } else {
        setProjects(prev => [updatedProject, ...prev]);
    }
    
    toast({
        title: "Project Saved",
        description: `Project ${updatedProject.refNumber} has been updated.`,
    });
  };

  if (isLoading || !activeRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!session) {
    return null; 
  }
  
  return (
    <main>
      <Dashboard 
        user={session.user} 
        projects={projects}
        search={search}
        setSearch={setSearch}
        sort={sort}
        setSort={setSort}
        clientNameFilter={clientNameFilter}
        setClientNameFilter={setClientNameFilter}
        processFilter={processFilter}
        setProcessFilter={setProcessFilter}
        onProjectUpdate={handleProjectUpdate}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
      />
    </main>
  );
}
