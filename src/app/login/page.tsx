
"use client";

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { LoginForm } from "@/components/login-form";
import { onAuthChanged } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    // Check initial auth state synchronously
    if (auth.currentUser) {
      router.replace('/');
      return;
    }

    const unsubscribe = onAuthChanged((user) => {
      if (user) {
        // If user is already logged in, redirect them to the dashboard
        router.replace('/');
      } else {
        // If no user, stop loading and show the login form
        setLoading(false);
      }
    });

    // In case the listener doesn't fire immediately for a non-logged-in user
    const timer = setTimeout(() => {
        setLoading(false);
    }, 1500); // Failsafe timer

    // Cleanup subscription and timer on unmount
    return () => {
        unsubscribe();
        clearTimeout(timer);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
     <div className="flex items-center justify-center min-h-screen bg-background">
      <LoginForm />
    </div>
  );
}
