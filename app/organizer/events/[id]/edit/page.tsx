import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { verifyEventOwnership, computeDomainStatus } from "@/lib/organizer/service";
import { OrganizerEventForm } from "@/components/organizer/OrganizerEventForm";
import { OrganizerEventSummary } from "@/types/organizer";

export const metadata: Metadata = {
  title: "Edit Event — EventFind",
  description: "Update event schedule, format, and capacity limits.",
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["ORGANIZER", "ADMIN"], "/organizer/dashboard");
  const { id } = await params;

  let event: any = null;
  try {
    event = await verifyEventOwnership(id, user.id, user.role);
  } catch {
    notFound();
  }

  if (!event) {
    notFound();
  }

  const domainStatus = computeDomainStatus({
    published: event.published,
    isClosed: event.isClosed,
    registrationDeadline: event.registrationDeadline,
    endDate: event.endDate,
  });

  const summary: OrganizerEventSummary = {
    id: event.id,
    slug: event.slug,
    title: event.title,
    tagline: event.tagline,
    category: event.category,
    format: event.format,
    location: event.location,
    city: event.city,
    venue: event.venue,
    startDate: event.startDate.toISOString ? event.startDate.toISOString() : String(event.startDate),
    endDate: event.endDate.toISOString ? event.endDate.toISOString() : String(event.endDate),
    registrationDeadline: event.registrationDeadline.toISOString
      ? event.registrationDeadline.toISOString()
      : String(event.registrationDeadline),
    capacity: event.capacity,
    registeredCount: event.registeredCount,
    availableSpots: Math.max(0, event.capacity - event.registeredCount),
    isTeamEvent: event.isTeamEvent,
    minTeamSize: event.minTeamSize,
    maxTeamSize: event.maxTeamSize,
    eligibility: event.eligibility,
    published: event.published,
    isClosed: event.isClosed,
    domainStatus,
    confirmedCount: event.registeredCount,
    waitlistedCount: 0,
    cancelledCount: 0,
    teamRegistrationCount: 0,
    bannerGradient: event.bannerGradient,
    createdAt: event.createdAt.toISOString ? event.createdAt.toISOString() : String(event.createdAt),
    updatedAt: event.updatedAt.toISOString ? event.updatedAt.toISOString() : String(event.updatedAt),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Edit Event: {event.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Modify event parameters safely. Capacity floor is enforced to protect confirmed attendees.
        </p>
      </div>

      <OrganizerEventForm mode="edit" initialEvent={summary} />
    </div>
  );
}
