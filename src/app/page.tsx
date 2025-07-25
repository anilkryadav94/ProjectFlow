
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { User, Project } from '@/lib/data';
import { onAuthChanged, logout } from '@/lib/auth';
import { getProjectsForUser } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function getSessionData(firebaseUser: import('firebase/auth').User): Promise<{ user: User } | null> {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    // This initial read is CRITICAL. It forces the Firestore SDK to initialize
    // its connection with the correct authentication state from the Auth SDK.
    // Without this, subsequent calls in server actions might fail with "permission-denied"
    // due to a race condition.
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as Omit<User, 'id' | 'email'>;
        return {
            user: {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                ...userData
            }
        };
    }
    return null;
}


export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        try {
            const sessionData = await getSessionData(user);
            if (sessionData) {
              setSession(sessionData);
              const projectData = await getProjectsForUser(sessionData.user.name, sessionData.user.roles);
              setProjects(projectData);
            } else {
              console.error("User is authenticated but no user document found in Firestore. Logging out.");
              await logout();
              router.push('/login');
            }
        } catch (error) {
            console.error("Error fetching session or project data:", error);
            await logout();
            router.push('/login');
        } finally {
             setLoading(false);
        }
      } else {
        // User is not signed in
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
