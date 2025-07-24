
"use client";

import * as React from 'react';
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      {isClient ? <LoginForm /> : null}
    </div>
  );
}
