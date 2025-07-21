
import * as React from 'react';
import Dashboard from '@/components/dashboard';
import { redirect } from 'next/navigation';
import { getSession, getUsers } from '@/lib/auth';
import type { Project } from '@/lib/data';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function toISOString(date: Date | string | Timestamp | null | undefined): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date instanceof Timestamp) return date.toDate().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
}

async function getProjects(): Promise<Project[]> {
    const projectsCol = collection(db, "projects");
    const q = query(projectsCol, orderBy("allocationDate", "desc"));
    const projectSnapshot = await getDocs(q);
    const projectList = projectSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            emailDate: toISOString(data.emailDate)!,
            allocationDate: toISOString(data.allocationDate)!,
            processingDate: toISOString(data.processingDate),
            qaDate: toISOString(data.qaDate),
        } as Project;
    });
    return projectList;
}

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const initialProjects = await getProjects();
  
  return (
    <main>
      <Dashboard 
        user={session.user} 
        initialProjects={initialProjects}
      />
    </main>
  );
}
