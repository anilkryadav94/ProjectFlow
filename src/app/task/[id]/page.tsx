
import * as React from 'react';
import { getSession } from '@/lib/auth';
import type { Project, Role, User } from '@/lib/data';
import { roleHierarchy, projects as mockProjects, clientNames, processes, processorActionableStatuses } from '@/lib/data';
import { TaskPageClient } from './client-page';
import { notFound } from 'next/navigation';


export async function generateStaticParams() {
    return mockProjects.map((project) => ({
        id: project.id,
    }));
}

async function getAllProjects(): Promise<Project[]> {
    return mockProjects;
}

async function getProject(id: string): Promise<Project | null> {
    const project = mockProjects.find(p => p.id === id);
    return project || null;
}

async function getProjectsForUser(user: User, activeRole: Role): Promise<Project[]> {
    let allProjects = await getAllProjects();
    let userProjects: Project[];

    if (activeRole === 'Processor') {
        userProjects = allProjects.filter(p => p.processor === user.name && p.workflowStatus === 'With Processor' && processorActionableStatuses.includes(p.processorStatus));
    } else if (activeRole === 'QA') {
        userProjects = allProjects.filter(p => p.qa === user.name && p.workflowStatus === 'With QA');
    } else {
        userProjects = allProjects;
    }
    
    userProjects.sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
    
    return JSON.parse(JSON.stringify(userProjects));
}


interface TaskPageProps {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
}


export default async function TaskPage({ params, searchParams }: TaskPageProps) {
    const session = await getSession();

    if (!session) {
        // In a real app with server-side redirects, you'd do:
        // redirect('/login');
        // For static export, we rely on client-side routing in root page.
        // Or show an unauthorized message. For now, we'll assume auth is handled client-side before navigation.
        // This page shouldn't be accessible without a session anyway.
        return null;
    }

    const project = await getProject(params.id);

    if (!project) {
        notFound();
    }
    
    const getHighestRole = (roles: Role[]): Role => {
        for (const role of roleHierarchy) {
          if (roles.includes(role)) {
            return role;
          }
        }
        return roles[0] || 'Processor';
    };
    
    const urlRole = searchParams.role as Role | undefined;
    const activeRole = urlRole && session.user.roles.includes(urlRole)
        ? urlRole
        : getHighestRole(session.user.roles);

    const userProjectList = await getProjectsForUser(session.user, activeRole);

    return (
       <TaskPageClient
            user={session.user}
            initialProject={project}
            initialUserProjectList={userProjectList}
            initialActiveRole={activeRole}
            clientNames={clientNames}
            processes={processes}
       />
    );
}
