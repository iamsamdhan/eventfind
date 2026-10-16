import { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { OrganizerEventForm } from "@/components/organizer/OrganizerEventForm";

export const metadata: Metadata = {
  title: "Host a New Event — EventFind",
  description: "Create and publish collegiate events, hackathons, and workshops on EventFind.",
};

export default async function NewEventPage() {
  await requireRole(["ORGANIZER", "ADMIN"], "/organizer/events/new");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Host a New Event
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create an event listing with custom dates, team rules, capacity caps, and instant publication options.
        </p>
      </div>

      <OrganizerEventForm mode="create" />
    </div>
  );
}
