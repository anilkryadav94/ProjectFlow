
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
        // User is logged in according to Firebase Auth.
        // Let's try to get our custom session data from Firestore.
        const sessionData = await getSession();
        if (sessionData) {
          setSession(sessionData);
        } else {
           // This can happen if the user exists in Auth but not in our 'users' collection.
           // In this case, we treat them as not fully logged in.
           // The middleware will handle the redirect to /login.
           setSession(null);
           router.push('/login');
        }
      } else {
        // User is not logged in.
        setSession(null);
        router.push('/login');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
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
  // If not, the user will be redirected by the middleware or the effect above.
  // A brief loader is shown to prevent flashing content during redirection.
  if (!session) {
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
