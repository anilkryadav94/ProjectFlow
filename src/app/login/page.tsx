
"use client";

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { LoginForm } from "@/components/login-form";
import { onAuthChanged } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthChanged((user) => {
      if (user) {
        // If user is already logged in, redirect them to the dashboard
        router.replace('/');
      } else {
        // If no user, stop loading and show the login form
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <LoginForm />
  );
}
