
"use client";

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const LoginPageClient = dynamic(() => import('@/components/login-page-client').then(mod => mod.LoginPageClient), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
});

export default function LoginPage() {
  return <LoginPageClient />;
}
