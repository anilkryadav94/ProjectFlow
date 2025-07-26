
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { User, Role } from '@/lib/data';
import { onAuthChanged, getSession, logout, getUsers } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';


export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
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
            setLoading(false);
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
  
  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Authenticating...</p>
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
        error={error}
      />
    </main>
  );
}
