
import * as React from 'react';
import Dashboard, { DashboardWrapper } from '@/components/dashboard';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import type { Project } from '@/lib/data';
import { projects } from '@/lib/data';

async function getProjects(): Promise<Project[]> {
    // In a real app, this would be a database call.
    return JSON.parse(JSON.stringify(projects));
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
