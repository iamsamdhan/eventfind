"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SafeUser } from "@/types/auth";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { 
  User, 
  Mail, 
  Calendar, 
  GraduationCap, 
  Building2, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  LogOut,
  FileText
} from "lucide-react";

export interface ProfileEditorProps {
  initialUser: SafeUser;
}

export function ProfileEditor({ initialUser }: ProfileEditorProps) {
  const router = useRouter();
  const { refreshUser, logout } = useAuth();

  const [name, setName] = React.useState(initialUser.name);
  const [username, setUsername] = React.useState(initialUser.username);
  const [bio, setBio] = React.useState(initialUser.bio || "");
  const [college, setCollege] = React.useState(initialUser.college || "");
  const [organization, setOrganization] = React.useState(initialUser.organization || "");

  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const formattedDate = new Date(initialUser.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          bio,
          college: initialUser.role === "STUDENT" ? college : undefined,
          organization: initialUser.role === "ORGANIZER" ? organization : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to update profile.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Profile updated successfully!");
      await refreshUser();
      router.refresh();
      setIsLoading(false);
    } catch {
      setErrorMessage("An unexpected network error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Overview Card */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Cover gradient */}
        <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex items-end">
          <div className="flex items-center gap-4 translate-y-10">
            <div className="h-20 w-20 rounded-2xl bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold text-2xl uppercase">
              {initialUser.name.charAt(0)}
            </div>
          </div>
        </div>

        <CardContent className="pt-14 pb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {initialUser.name}
                </h1>
                <Badge variant={initialUser.role === "ORGANIZER" ? "warning" : "brand"}>
                  {initialUser.role}
                </Badge>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                @{initialUser.username}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="gap-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{initialUser.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Joined {formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              {initialUser.role === "ORGANIZER" ? (
                <>
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{initialUser.organization || "Independent Organizer"}</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{initialUser.college || "University Student"}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form Card */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg font-bold">Edit Profile Information</CardTitle>
          <CardDescription className="text-xs">
            Update your display name, username, bio, and affiliations. Changes take effect across your event participation and team rosters.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {successMessage && (
            <Alert variant="success" title="Success">
              {successMessage}
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="error" title="Error">
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Input
                  label="Display Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <Input
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  helperText="Unique handle across EventFind"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email & Role (Read-only / Protected) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="h-10 px-3.5 flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 cursor-not-allowed">
                  {initialUser.email}
                </div>
                <p className="text-[11px] text-slate-400">Email is verified for authentication.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Role
                </label>
                <div className="h-10 px-3.5 flex items-center justify-between bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 cursor-not-allowed">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{initialUser.role}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-400">Server-enforced role assignment.</p>
              </div>
            </div>

            {/* Role-Specific Affiliation Field */}
            {initialUser.role === "STUDENT" ? (
              <div className="space-y-1">
                <Input
                  label="College / University"
                  type="text"
                  placeholder="e.g. Metropolitan University"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  label="Organization / Student Club"
                  type="text"
                  placeholder="e.g. HackPulse Collective"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Bio Field */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                Bio / About You
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your interests, skills, or what you build..."
                maxLength={500}
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 text-right">{bio.length}/500 characters</p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" size="md" className="gap-2 shadow-sm" isLoading={isLoading}>
                <Save className="w-4 h-4" /> Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
