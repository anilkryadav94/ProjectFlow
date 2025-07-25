
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { User, Project } from '@/lib/data';
import { onAuthChanged } from '@/lib/auth';
import { getSession, logout } from '@/lib/auth-actions';
import { getProjectsForUser } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        // First, verify the server-side session from the cookie
        const sessionData = await getSession();
        if (sessionData) {
          setSession(sessionData);
          // Now, fetch projects using the server action, which runs with auth context
          const projectData = await getProjectsForUser();
          setProjects(projectData);
          setLoading(false);
        } else {
           console.error("Auth state changed, but no server session found. This can happen in a race condition. Logging out.");
           await logout();
           router.push('/login');
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);
  
  if (loading || !session || !projects) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Loading Dashboard...</p>
            </div>
        </div>
    );
  }

  return (
    <main>
      <DashboardWrapper 
        user={session.user} 
        initialProjects={projects} 
      />
    </main>
  );
}
