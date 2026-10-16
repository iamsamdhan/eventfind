import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarPlus, ArrowLeft } from "lucide-react";

export default function NewEventPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Card className="text-center p-8 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
          <CalendarPlus className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Host an Event</CardTitle>
        <CardDescription className="text-sm max-w-md mx-auto leading-relaxed">
          The event creation wizard, registration window management, and capacity settings will be built in Stage 6 (Organizer Dashboard).
        </CardDescription>
        <div className="pt-2">
          <Link href="/organizer/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Organizer Hub
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

