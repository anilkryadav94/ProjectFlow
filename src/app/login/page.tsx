
"use client";

import * as React from 'react';
import { LoginForm } from "@/components/login-form";
import { onAuthChanged } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  // This effect will check if the user is already logged in.
  // If so, it redirects them. Otherwise, it shows the login form.
  React.useEffect(() => {
    const unsubscribe = onAuthChanged((user) => {
      if (user) {
        // User is logged in, redirect to dashboard.
        // The loading state will remain true, so the user sees a brief spinner
        // instead of a flash of the login form.
        router.replace('/');
      } else {
        // No user is logged in, stop loading and show the form.
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
