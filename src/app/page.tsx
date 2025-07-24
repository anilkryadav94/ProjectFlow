
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
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        const sessionData = await getSession();
        if (sessionData) {
          setSession(sessionData);
        } else {
           // This state is unlikely if onAuthChanged(user) is true, but as a safeguard:
           setSession(null); 
        }
      } else {
        setSession(null);
        // Middleware handles the redirect, no need to push here.
      }
       // Only stop loading after we have a definitive auth state.
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

  // If there's a session, show the dashboard.
  // The middleware (`src/middleware.ts`) is responsible for redirecting to /login if there's no session.
  if (!session) {
    // This can be shown briefly while the middleware redirects.
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
      />
    </main>
  );
}
