import { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getOrganizerDashboardData } from "@/lib/organizer/service";
import { OrganizerDashboardView } from "@/components/organizer/OrganizerDashboardView";

export const metadata: Metadata = {
  title: "Organizer Hub — EventFind",
  description: "Manage hosted events, attendee rosters, and capacity limits on EventFind.",
};

export default async function OrganizerDashboardPage() {
  const user = await requireRole(["ORGANIZER", "ADMIN"], "/organizer/dashboard");
  const dashboardData = await getOrganizerDashboardData(user.id, user.role);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <OrganizerDashboardView initialData={dashboardData} currentUser={user} />
    </div>
  );
}
