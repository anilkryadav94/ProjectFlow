
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { User } from '@/lib/data';
import { onAuthChanged, getSession } from '@/lib/auth';
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
        try {
            const sessionData = await getSession();
            if (sessionData) {
                setSession(sessionData);
            } else {
               throw new Error("User authenticated but no session data found in Firestore.");
            }
        } catch(err) {
            console.error(err);
            setError("Your user profile is not configured correctly. Please contact an admin.");
            router.push('/login'); // Redirect to login on session error
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
    // This case should ideally not be hit if logic is correct, but as a fallback
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Redirecting to login...</p>
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

    