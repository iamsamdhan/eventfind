import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LayoutDashboard, ShieldCheck, ArrowLeft, PlusCircle, Users, Calendar } from "lucide-react";

export default async function OrganizerDashboardPage() {
  const user = await requireRole(["ORGANIZER", "ADMIN"], "/organizer/dashboard");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified Organizer Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user.organization || "Independent Organizer"} • Logged in as <span className="font-semibold text-slate-700 dark:text-slate-300">{user.role}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="outline" size="sm">
              My Profile
            </Button>
          </Link>
          <Link href="/organizer/events/new">
            <Button size="sm" className="gap-2 shadow-sm">
              <PlusCircle className="w-4 h-4" /> Create New Event
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2 border-slate-200/80 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Events</div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">3</div>
          <p className="text-xs text-slate-500">Live listings on EventFind discovery</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200/80 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Attendees</div>
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">692</div>
          <p className="text-xs text-slate-500">Registered across all tracks</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200/80 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Registrations</div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">148</div>
          <p className="text-xs text-slate-500">Active participating squads</p>
        </Card>
      </div>

      <Card className="p-8 text-center space-y-4 border-slate-200/80 dark:border-slate-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
          <Calendar className="h-6 w-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Organizer Event Management Console
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Full event creation wizard, roster exports, and attendee management will be configured in Stage 6.
          </p>
        </div>
      </Card>
    </div>
  );
}
