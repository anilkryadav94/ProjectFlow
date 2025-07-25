
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { User, Project } from '@/lib/data';
import { onAuthChanged, getSession, logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getProjectsForUser } from '@/app/actions';

export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        try {
            // Attempt to get session data, with a retry mechanism to handle race conditions
            let sessionData = await getSession();
            
            // If session data is not immediately available, wait a bit and try again.
            if (!sessionData) {
                console.log("Initial session fetch failed, retrying in 1s...");
                await new Promise(resolve => setTimeout(resolve, 1000));
                sessionData = await getSession();
            }

            if (sessionData) {
              setSession(sessionData);
              const projectData = await getProjectsForUser(sessionData.user.name, sessionData.user.roles);
              setProjects(projectData);
            } else {
               throw new Error("User authenticated but no session data found in Firestore after retry.");
            }
        } catch (err: any) {
            console.error("Error during data fetching after auth change:", err);
            setError(err.message || "An error occurred. Logging out.");
            await logout();
            router.push('/login');
        } finally {
            setLoading(false);
        }
      } else {
        setLoading(false);
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
                 {error && <p className="text-sm text-destructive">{error}</p>}
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
