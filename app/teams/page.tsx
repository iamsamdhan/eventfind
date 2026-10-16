import { Metadata } from "next";
import { requireAuth } from "@/lib/auth/session";
import { getUserTeams, getUserReceivedInvitations } from "@/lib/teams/service";
import { getEvents } from "@/lib/events/service";
import { TeamManager } from "@/components/teams/TeamManager";

export const metadata: Metadata = {
  title: "Team Hub — EventFind",
  description: "Manage collegiate squads, invite teammates by username, and prepare team rosters for hackathons.",
};

export default async function TeamsPage() {
  const user = await requireAuth("/teams");

  const [initialTeams, initialInvitations, eventsResult] = await Promise.all([
    getUserTeams(user.id),
    getUserReceivedInvitations(user.id),
    getEvents(),
  ]);

  const teamEvents = eventsResult.events
    .filter((e) => e.isTeamEvent)
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      minTeamSize: e.minTeamSize,
      maxTeamSize: e.maxTeamSize,
    }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <TeamManager
        currentUser={user}
        initialTeams={initialTeams}
        initialInvitations={initialInvitations}
        teamEvents={teamEvents}
      />
    </div>
  );
}
