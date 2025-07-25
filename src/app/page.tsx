
"use client";

import * as React from 'react';
import { DashboardWrapper } from '@/components/dashboard';
import type { User, Project } from '@/lib/data';
import { onAuthChanged } from '@/lib/auth';
import { getSession, logout } from '@/lib/auth-actions';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function convertTimestampsToDates(project: any): Project {
    const newProject: { [key: string]: any } = { ...project };
    for (const key in newProject) {
        if (newProject[key] instanceof Timestamp) {
            newProject[key] = newProject[key].toDate().toISOString().split('T')[0];
        }
    }
    return newProject as Project;
}


async function getProjectsForUser(user: User): Promise<Project[]> {
    const projectsCollection = collection(db, "projects");
    let projectsQuery;

    const highestRole = user.roles.sort((a, b) => {
        const roleOrder = ['Admin', 'Manager', 'QA', 'Case Manager', 'Processor'];
        return roleOrder.indexOf(a) - roleOrder.indexOf(b);
    })[0];

    if (highestRole === 'Admin' || highestRole === 'Manager') {
        projectsQuery = query(projectsCollection); // Admins/Managers get all projects
    } else if (highestRole === 'Processor') {
        projectsQuery = query(projectsCollection, where("processor", "==", user.name));
    } else if (highestRole === 'QA') {
        projectsQuery = query(projectsCollection, where("qa", "==", user.name));
    } else if (highestRole === 'Case Manager') {
        projectsQuery = query(projectsCollection, where("case_manager", "==", user.name));
    } else {
        projectsQuery = query(projectsCollection, where("id", "==", "null")); // No access
    }

    const projectSnapshot = await getDocs(projectsQuery);
    const projectList = projectSnapshot.docs.map(doc => {
        const data = doc.data();
        const projectWithConvertedDates = convertTimestampsToDates(data);
        return {
            id: doc.id,
            ...projectWithConvertedDates
        } as Project;
    });
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
          const projectData = await getProjectsForUser(sessionData.user);
          setProjects(projectData);
          setLoading(false);
        } else {
           console.error("Auth state changed, but no server session found. Logging out.");
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
