
// app/login/page.tsx
"use client";

import { LoginForm } from "@/components/login-form";
import { useRouter } from "next/navigation";
import * as React from 'react';

export default function LoginPage() {
  const router = useRouter();

  React.useEffect(() => {
    // In a fully mocked app, we often redirect away from login since it's not needed.
    // Uncomment the line below to automatically redirect to the dashboard.
    // router.push('/');
  }, [router]);

  // The login form can remain for UI testing, but it will use the mocked auth functions.
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <LoginForm />
    </div>
  );
}
