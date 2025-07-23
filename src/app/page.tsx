
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { Project, User } from '@/lib/data';
import { projects as mockProjects, users as mockUsers } from '@/lib/data';
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
    const checkAuthAndLoadData = async (user: any) => {
      // In mock mode, we assume a user is always logged in.
      // The mock onAuthChanged will provide a user object.
      if (user) {
        const sessionData = await getSession();
        setSession(sessionData);
        if (sessionData) {
          const projects = await getProjects();
          setInitialProjects(projects);
        } else {
           // This case should not be hit in mock mode
           console.error("Mock session not found");
        }
      } else {
        // This case should not be hit in mock mode
         console.error("Mock user not found");
      }
      setLoading(false);
    };

    const unsubscribe = onAuthChanged(checkAuthAndLoadData);
    return () => unsubscribe();
  }, [router]);

  if (loading || !session || !initialProjects) {
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
