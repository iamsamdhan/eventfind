"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ArrowRight, ShieldCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "";
  const { refreshUser } = useAuth();

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || "Invalid email/username or password.");
        setIsLoading(false);
        return;
      }

      // Refresh auth context so navbar updates immediately
      await refreshUser();

      // Determine redirect destination: honor safe returnUrl or use server-provided role dashboard
      let target = data.redirectTo || "/explore";
      if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
        target = returnUrl;
      }

      router.push(target);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected network error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <div className="relative h-12 w-48 mx-auto">
              <Image
                src="/logos/Blue and Black Minimalist Business Brand Logo.png"
                alt="EventFind"
                fill
                priority
                className="object-contain dark:brightness-110"
              />
            </div>
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Discover. Connect. Explore.
          </p>
        </div>

        {/* Single Unified Login Card */}
        <Card className="shadow-lg border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Unified sign-in for students, team leads, organizers, and administrators. Your role and permissions are resolved securely on the server.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {errorMessage && (
              <Alert variant="error" title="Authentication Error">
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Input
                  label="Username or Email"
                  type="text"
                  placeholder="e.g. alex_student or organizer@college.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-xs text-slate-600 dark:text-slate-400"
                >
                  Keep me signed in on this device
                </label>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 shadow-sm"
                isLoading={isLoading}
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-medium">
                  Server-Protected Access
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                Role-based routing (Student vs. Organizer) is resolved strictly from trusted server data. Zero browser role injection.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer link to signup */}
        <p className="text-center text-xs text-slate-600 dark:text-slate-400">
          New to EventFind?{" "}
          <Link
            href="/signup"
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-xs text-slate-400">Loading sign in...</div>}>
      <LoginForm />
    </React.Suspense>
  );
}
