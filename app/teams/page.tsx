import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, UserPlus, ArrowLeft } from "lucide-react";

export default function TeamsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
          <Users className="h-6 w-6" />
        </div>
        <Badge variant="brand">Stage 4 Pipeline</Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Team Management Hub
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Form teams for hackathons, invite members by unique usernames, and coordinate event registrations seamlessly.
        </p>
      </div>

      <Card className="text-center p-8">
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Team creation, username invites, invitation acceptance, and server-side membership validation will be implemented in Stage 4.
          </p>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Homepage
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
