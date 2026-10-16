import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { KeyRound, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <Card className="max-w-md w-full shadow-lg border-slate-200/80 dark:border-slate-800 text-center p-8 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Password Recovery</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Password reset workflow will be activated alongside the authentication backend in Stage 3.
        </CardDescription>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Login
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

