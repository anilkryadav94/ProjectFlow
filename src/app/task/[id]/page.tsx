
import * as React from 'react';
import { projects as mockProjects } from '@/lib/data';
import { TaskPageClient } from '@/components/task-page-client';

// This function is required for static export with dynamic routes.
// It tells Next.js which pages to generate at build time.
export async function generateStaticParams() {
    return mockProjects.map((project) => ({
        id: project.id,
    }));
}

// This is the server component. It's kept simple.
// It receives params and passes them down to the client component.
export default function TaskPage({ params }: { params: { id: string } }) {
  // All the interactive logic, data fetching based on session, and state
  // management is now handled inside TaskPageClient.
  return <TaskPageClient params={params} />;
}
