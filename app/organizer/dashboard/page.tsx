import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LayoutDashboard, ShieldAlert, ArrowLeft } from "lucide-react";

export default function OrganizerDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <Badge variant="brand">Stage 6 Pipeline</Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Organizer Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Create, publish, and manage student events, monitor participant capacity, and view registration rosters.
        </p>
      </div>

      <Card className="text-center p-8">
        <CardContent className="space-y-4">
          <div className="inline-flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="w-3.5 h-3.5" />
            Protected Route Scaffold
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            In Stage 6, this dashboard will be protected by server-side authorization ensuring only users with the verified Organizer role can access and administer events.
          </p>
          <div>
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Return to Homepage
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
