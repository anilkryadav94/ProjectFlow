
import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import type { Project } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { projects as mockProjects, users as mockUsers } from '@/lib/data';

// One-time data seeding function
async function seedDatabase() {
    const projectsCollection = collection(db, "projects");
    const usersCollection = collection(db, "users");
    const projectsSnapshot = await getDocs(projectsCollection);
    const usersSnapshot = await getDocs(usersCollection);

    // Only seed if collections are empty
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
            const userRef = doc(usersCollection, id);
            batch.set(userRef, userData);
        });
        await batch.commit();
        console.log("Users seeded successfully.");
    }
}

async function getProjects(): Promise<Project[]> {
    await seedDatabase(); // Run seeding check on every load (it will only run once if data is empty)
    
    const projectsCollection = collection(db, "projects");
    const projectsSnapshot = await getDocs(projectsCollection);
    const projectsList = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    return projectsList;
}

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const initialProjects = await getProjects();
  
  return (
    <main>
      <DashboardWrapper 
        user={session.user} 
        initialProjects={initialProjects}
      />
    </main>
  );
}
