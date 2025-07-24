
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
        } else {
           // If session exists in auth but not firestore, something is wrong.
           // For now, we will treat this as a loading state, but in production,
           // this might require logging the user out.
           console.error("User authenticated but no session data found in Firestore.");
           // Not redirecting to login to prevent loops. Let it stay in loading state.
        }
      } else {
        // If onAuthChanged says no user, redirect to login.
        // This is the primary protection for this page.
        router.push('/login');
      }
      // Only set loading to false when we are sure about the state.
      // If sessionData is null after a user object exists, we might still be loading.
      // Let's ensure loading stops only when data is loaded or user is confirmed null.
      if (user && projects) {
        setLoading(false);
      }
       if (!user) {
         setLoading(false); // also stop loading if we know there is no user
       }
    });

    return () => unsubscribe();
  }, [router, projects]); // Add projects to dependency array

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
