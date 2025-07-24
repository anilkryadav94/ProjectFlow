
"use client";

import * as React from 'react';
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <LoginForm />
    </div>
  );
}
