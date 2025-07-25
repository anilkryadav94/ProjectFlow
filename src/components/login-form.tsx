
"use client";

import * as React from "react";
import { login } from "@/lib/auth";
import { createSession } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";

export function LoginForm() {
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;

    if (!email || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
      const user = getAuth().currentUser;
      if (user) {
        // CRITICAL FIX: Await the session creation before redirecting
        await createSession(user.uid);
      }
      // On successful login, redirect to the dashboard.
      // The router.push will trigger a refresh of the page component.
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login.');
    } finally {
      // Ensure loading is always set to false after the attempt.
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center gap-2 mb-4">
            <Workflow className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">ProjectFlow</h1>
        </div>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="m@example.com" required ref={emailRef} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required ref={passwordRef} />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
