import Dashboard from '@/components/dashboard';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  
  return (
    <main>
      <Dashboard user={session.user} />
    </main>
  );
}
