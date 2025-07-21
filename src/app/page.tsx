
"use client";

import * as React from 'react';
import Dashboard from '@/components/dashboard';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import type { Project, Role, ProcessType, User } from '@/lib/data';
import { projects as initialProjects } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  const [clientNameFilter, setClientNameFilter] = React.useState<string>('all');
  const [processFilter, setProcessFilter] = React.useState<ProcessType | 'all'>('all');
  const { toast } = useToast();

  React.useEffect(() => {
    async function fetchSession() {
      const sessionData = await getSession();
      if (!sessionData) {
        redirect('/login');
      } else {
        setSession(sessionData);
      }
      setIsLoading(false);
    }
    fetchSession();
  }, []);

  const handleProjectUpdate = (updatedProject: Project) => {
    let newProjects : Project[];
    const existingProjectIndex = projects.findIndex(p => p.id === updatedProject.id);

    if (existingProjectIndex > -1) {
        newProjects = [...projects];
        newProjects[existingProjectIndex] = updatedProject;
    } else {
        newProjects = [updatedProject, ...projects];
    }
    
    setProjects(newProjects);

    toast({
        title: "Project Saved",
        description: `Project ${updatedProject.refNumber} has been updated.`,
    })
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!session) {
    return null; // or a redirect, though useEffect already handles it
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
      />
    </main>
  );
}
