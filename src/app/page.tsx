
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { User, Project } from '@/lib/data';
import { onAuthChanged, getSession, logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { seedDatabase } from '@/lib/data';

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

          // Seed database if it's empty
          const projectsCollection = collection(db, 'projects');
          const projectsSnapshot = await getDocs(projectsCollection);
          if (projectsSnapshot.empty) {
            console.log('Projects collection is empty, seeding database...');
            await seedDatabase();
          }

          const projectData = await getProjects();
          setProjects(projectData);
          setLoading(false);
        } else {
           console.error("User authenticated but no session data found in Firestore. Logging out.");
           await logout();
           router.push('/login');
        }
      } else {
        router.push('/login');
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
