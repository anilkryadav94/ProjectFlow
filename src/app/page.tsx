
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
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        // Step 1: Get user session data. Retry once if it fails initially.
        let sessionData = await getSession();
        if (!sessionData) {
            console.log("Initial session fetch failed, retrying in 1s...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            sessionData = await getSession();
        }

        if (sessionData) {
            // Successfully got session, set it.
            setSession(sessionData);

            // Step 2: Try to fetch project data, but don't fail the whole page if it errors.
            try {
                const projectData = await getProjectsForUser(sessionData.user.name, sessionData.user.roles);
                setProjects(projectData);
            } catch (err: any) {
                console.error("Error fetching projects:", err);
                // Set an error message to be displayed on the dashboard, but don't log the user out.
                setError("Could not load project data due to insufficient permissions or a network error.");
                setProjects([]); // Ensure projects is an empty array on error
            } finally {
                // We have a session, so stop the main loading spinner.
                setLoading(false);
            }
        } else {
           // If session is not found after retry, then it's a real issue.
           console.error("User authenticated but no session data found in Firestore after retry. Logging out.");
           setError("Your user profile is not configured correctly. Please contact an admin.");
           await logout();
           router.push('/login');
        }
      } else {
        // No user is signed in.
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);
  
  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Authenticating...</p>
            </div>
        </div>
    );
  }

  // User is authenticated, but there might be an error fetching data.
  // The DashboardWrapper is designed to handle this.
  if (!session) {
      // This case should ideally not be hit if the logic above is correct, but as a fallback:
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Finalizing session...</p>
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
