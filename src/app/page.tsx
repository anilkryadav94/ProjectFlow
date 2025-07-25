
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { User, Project, Role, ProcessType } from '@/lib/data';
import { onAuthChanged, getSession, logout, getUsers } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getProjectsForUser } from '@/app/actions';

interface DashboardData {
    projects: Project[];
    clientNames: string[];
    processors: string[];
    qas: string[];
    caseManagers: string[];
    processes: ProcessType[];
}

async function getDashboardData(userName: string, roles: Role[]): Promise<DashboardData> {
    const [projects, allUsers] = await Promise.all([
        getProjectsForUser(userName, roles),
        getUsers()
    ]);

    const clientNames = [...new Set(projects.map(p => p.client_name).filter(Boolean))].sort();
    const processes = [...new Set(projects.map(p => p.process).filter(Boolean))].sort() as ProcessType[];

    // Filter users by role for dropdowns
    const processors = allUsers.filter(u => u.roles.includes('Processor')).map(u => u.name).sort();
    const qas = allUsers.filter(u => u.roles.includes('QA')).map(u => u.name).sort();
    const caseManagers = allUsers.filter(u => u.roles.includes('Case Manager')).map(u => u.name).sort();

    return { projects, clientNames, processors, qas, caseManagers, processes };
}


export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        let sessionData = await getSession();
        if (!sessionData) {
            console.log("Initial session fetch failed, retrying in 1s...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            sessionData = await getSession();
        }

        if (sessionData) {
            setSession(sessionData);
            try {
                const data = await getDashboardData(sessionData.user.name, sessionData.user.roles);
                setDashboardData(data);
            } catch (err: any) {
                console.error("Error fetching dashboard data:", err);
                setError("Could not load project data due to insufficient permissions or a network error.");
                setDashboardData({ projects: [], clientNames: [], processors: [], qas: [], caseManagers: [], processes: [] });
            } finally {
                setLoading(false);
            }
        } else {
           console.error("User authenticated but no session data found in Firestore after retry. Logging out.");
           setError("Your user profile is not configured correctly. Please contact an admin.");
           await logout();
           router.push('/login');
        }
      } else {
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);
  
  if (loading || !dashboardData) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Authenticating & Loading Data...</p>
                 {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        </div>
    );
  }

  if (!session) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Finalizing session...</p>
            </div>
        </div>
    );
  }

  return (
    <main>
      <DashboardWrapper 
        user={session.user} 
        initialProjects={dashboardData.projects}
        clientNames={dashboardData.clientNames}
        processors={dashboardData.processors}
        qas={dashboardData.qas}
        caseManagers={dashboardData.caseManagers}
        processes={dashboardData.processes}
        error={error}
      />
    </main>
  );
}
