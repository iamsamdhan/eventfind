import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserPlus } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full shadow-lg border-slate-200/80 dark:border-slate-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
            <UserPlus className="h-6 w-6" />
          </div>
          <Badge variant="brand" className="mx-auto">Stage 3 Pipeline</Badge>
          <CardTitle className="text-2xl font-bold">Join EventFind</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            User registration with unique username validation and role assignment (Student & Organizer) will be activated in Stage 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Link href="/login">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Unified Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

