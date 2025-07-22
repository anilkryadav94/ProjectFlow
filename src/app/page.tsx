
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { Project, User } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { projects as mockProjects, users as mockUsers } from '@/lib/data';
import { getSession, onAuthChanged } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

async function seedDatabase() {
    const projectsCollection = collection(db, "projects");
    const usersCollection = collection(db, "users");
    const projectsSnapshot = await getDocs(projectsCollection);
    const usersSnapshot = await getDocs(usersCollection);

    if (projectsSnapshot.empty) {
        const batch = writeBatch(db);
        mockProjects.forEach((project) => {
            const { id, ...projectData } = project;
            const projectRef = doc(projectsCollection, id);
            batch.set(projectRef, projectData);
        });
        await batch.commit();
        console.log("Projects seeded successfully.");
    }
    
    if (usersSnapshot.empty) {
         const batch = writeBatch(db);
         mockUsers.forEach((user) => {
            const { id, ...userData } = user;
            // Use email as doc id for simplicity in this version
            const userRef = doc(usersCollection, userData.email);
            batch.set(userRef, userData);
        });
        await batch.commit();
        console.log("Users seeded successfully.");
    }
}

async function getProjects(): Promise<Project[]> {
    await seedDatabase();
    
    const projectsCollection = collection(db, "projects");
    const projectsSnapshot = await getDocs(projectsCollection);
    const projectsList = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    return projectsList;
}

export default function Home() {
  const [session, setSession] = React.useState<{ user: User } | null>(null);
  const [initialProjects, setInitialProjects] = React.useState<Project[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const checkAuthAndLoadData = async (user: any) => {
      if (user) {
        const sessionData = await getSession();
        setSession(sessionData);
        if (sessionData) {
          const projects = await getProjects();
          setInitialProjects(projects);
        } else {
            router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    };

    const unsubscribe = onAuthChanged(checkAuthAndLoadData);
    return () => unsubscribe();
  }, [router]);

  if (loading || !session || !initialProjects) {
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
        initialProjects={initialProjects}
      />
    </main>
  );
}
