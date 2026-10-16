"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { GraduationCap, Building2, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { UserRole } from "@/types/auth";

export default function SignupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [role, setRole] = React.useState<"STUDENT" | "ORGANIZER">("STUDENT");
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [college, setCollege] = React.useState("");
  const [organization, setOrganization] = React.useState("");

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          email,
          password,
          role,
          college: role === "STUDENT" ? college : undefined,
          organization: role === "ORGANIZER" ? organization : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || "Failed to create account. Please try again.");
        if (data.issues) {
          const errs: Record<string, string> = {};
          data.issues.forEach((issue: { path: string[]; message: string }) => {
            if (issue.path[0]) errs[issue.path[0]] = issue.message;
          });
          setFieldErrors(errs);
        }
        setIsLoading(false);
        return;
      }

      await refreshUser();
      const target = data.redirectTo || (role === "ORGANIZER" ? "/organizer/dashboard" : "/explore");
      router.push(target);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected network error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8">
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

        {/* Signup Card */}
        <Card className="shadow-lg border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Join thousands of students and organizers discovering hackathons, workshops, and college festivals.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {errorMessage && (
              <Alert variant="error" title="Registration Error">
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role Selector: Student vs Organizer (Strictly no admin option) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                  I want to join as a
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("STUDENT")}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all ${
                      role === "STUDENT"
                        ? "border-blue-600 bg-blue-50/80 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <GraduationCap className={`w-5 h-5 ${role === "STUDENT" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                    <div>
                      <p className="text-xs font-bold">Student / Attendee</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Discover events & join teams</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("ORGANIZER")}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all ${
                      role === "ORGANIZER"
                        ? "border-blue-600 bg-blue-50/80 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <Building2 className={`w-5 h-5 ${role === "ORGANIZER" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                    <div>
                      <p className="text-xs font-bold">Event Organizer</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Host & manage student events</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={fieldErrors.name}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Username & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Input
                    label="Username"
                    type="text"
                    placeholder="e.g. alex_student"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    error={fieldErrors.username}
                    helperText="Letters, numbers, underscores"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="alex@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={fieldErrors.email}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  placeholder="At least 8 characters (letters & numbers)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldErrors.password}
                  helperText="Minimum 8 characters with at least one letter and one number"
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              {/* Role-Specific Affiliation Field */}
              {role === "STUDENT" ? (
                <div className="space-y-1">
                  <Input
                    label="College / University"
                    type="text"
                    placeholder="e.g. Metropolitan University"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    error={fieldErrors.college}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    label="Organization / Student Club"
                    type="text"
                    placeholder="e.g. ACM Student Chapter / Tech Club"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    error={fieldErrors.organization}
                    disabled={isLoading}
                  />
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 shadow-sm"
                isLoading={isLoading}
              >
                <Sparkles className="w-4 h-4" />
                Create {role === "ORGANIZER" ? "Organizer" : "Student"} Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer link to login */}
        <p className="text-center text-xs text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
