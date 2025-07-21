
import * as React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TaskViewLayout } from '@/components/task-view-layout';

export default async function TaskPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <main>
      <TaskViewLayout 
        user={session.user} 
        projectId={params.id}
      />
    </main>
  );
}
