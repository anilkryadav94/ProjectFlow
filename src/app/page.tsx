
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { Project, User } from '@/lib/data';
import { projects as mockProjects } from '@/lib/data';
import { getSession, onAuthChanged } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

async function getProjects(): Promise<Project[]> {
    // Return mock projects directly
    return mockProjects;
}

export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [initialProjects, setInitialProjects] = React.useState<Project[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        const sessionData = await getSession();
        if (sessionData) {
          setSession(sessionData);
          const projects = await getProjects();
          setInitialProjects(projects);
        } else {
            // This case might be hit if session is invalid
           setSession(null);
           router.push('/login');
        }
      } else {
        setSession(null);
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  if (!session || !initialProjects) {
    // This state is briefly hit before redirect, or if data fails to load.
    // The redirect in useEffect will handle moving to /login.
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  return (
    <main>
      <DashboardWrapper 
        user={session.user} 
        initialProjects={initialProjects}
      />
    </main>
  );
}
