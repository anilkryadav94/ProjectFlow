
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { User, Project } from '@/lib/data';
import { onAuthChanged, getSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function getProjects(): Promise<Project[]> {
    const projectsCollection = collection(db, "projects");
    const projectSnapshot = await getDocs(projectsCollection);
    const projectList = projectSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Project[];
    return projectList;
}

export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        const sessionData = await getSession();
        if (sessionData) {
          setSession(sessionData);
          const projectData = await getProjects();
          setProjects(projectData);
          setLoading(false);
        } else {
           // If session exists in auth but not firestore, something is wrong.
           // We stay in loading state, but won't redirect. Middleware handles unauth users.
           console.error("User authenticated but no session data found in Firestore.");
        }
      } else {
        // Middleware is responsible for redirecting to login.
        // This component should not handle redirection to prevent loops.
        // If no user, we can just stop loading and let middleware handle it.
        // For a logged-out user, they shouldn't even reach this page if middleware is correct.
        // Setting loading to false here might be risky if middleware fails, but
        // for now we assume middleware works. Let's keep it loading if no user.
        router.push('/login'); // This is the safe fallback if middleware fails.
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading || !session || !projects) {
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
        initialProjects={projects} 
      />
    </main>
  );
}
