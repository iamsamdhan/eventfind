import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getOrganizerEventRegistrations } from "@/lib/organizer/service";
import { OrganizerRegistrationsView } from "@/components/organizer/OrganizerRegistrationsView";

export const metadata: Metadata = {
  title: "Attendee Roster — EventFind",
  description: "View and export confirmed attendees and waitlists for your hosted event.",
};

export default async function EventRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["ORGANIZER", "ADMIN"], "/organizer/dashboard");
  const { id } = await params;

  try {
    const data = await getOrganizerEventRegistrations(id, user.id, user.role);

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <OrganizerRegistrationsView event={data.event} initialAttendees={data.attendees} />
      </div>
    );
  } catch (err: unknown) {
    notFound();
  }
}
