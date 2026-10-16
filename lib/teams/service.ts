import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { 
  TeamItem, 
  TeamMemberItem, 
  TeamInvitationItem, 
  CreateTeamInput, 
  TeamRole, 
  InvitationStatus 
} from "@/types/team";
import { findUserByUsername, findUserById, checkDatabaseAvailability, isFallbackPermitted, AuthPersistenceError } from "@/lib/auth/store";
import { getEventBySlugOrId } from "@/lib/events/service";

// In-process fallback storage for development and automated tests
const inMemoryTeams: Map<string, {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  creatorId: string;
  eventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}> = new Map();

const inMemoryMembers: Map<string, {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
}> = new Map();

const inMemoryInvitations: Map<string, {
  id: string;
  teamId: string;
  inviterId: string;
  inviteeId: string;
  status: InvitationStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}> = new Map();

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base || "team"}-${suffix}`;
}

async function getPersistenceMode(): Promise<"DB" | "FALLBACK"> {
  const isDb = await checkDatabaseAvailability();
  if (isDb) return "DB";

  if (!isFallbackPermitted()) {
    throw new AuthPersistenceError(
      "Database persistence failure. In-memory team fallback is disabled in production."
    );
  }

  return "FALLBACK";
}

/**
 * Creates a new team and registers the creator as LEADER
 */
export async function createTeam(creatorId: string, input: CreateTeamInput): Promise<TeamItem> {
  const creator = await findUserById(creatorId);
  if (!creator) {
    throw new Error("Authenticated user not found.");
  }

  // If associated with an event, validate event rules
  let eventSummary = null;
  if (input.eventId && input.eventId.trim()) {
    const event = await getEventBySlugOrId(input.eventId.trim());
    if (!event) {
      throw new Error(`Event "${input.eventId}" was not found.`);
    }
    if (!event.isTeamEvent) {
      throw new Error(`Event "${event.title}" is an individual event and does not support team formations.`);
    }
    eventSummary = {
      id: event.id,
      slug: event.slug,
      title: event.title,
      minTeamSize: event.minTeamSize,
      maxTeamSize: event.maxTeamSize,
    };
  }

  const slug = generateSlug(input.name);
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const team = await prisma.$transaction(async (tx) => {
        const createdTeam = await tx.team.create({
          data: {
            name: input.name.trim(),
            slug,
            description: input.description?.trim() || null,
            creatorId,
            eventId: eventSummary ? eventSummary.slug : (input.eventId?.trim() || null),
          },
        });

        await tx.teamMember.create({
          data: {
            teamId: createdTeam.id,
            userId: creatorId,
            role: "LEADER",
          },
        });

        return createdTeam;
      });

      return (await getTeamByIdOrSlug(team.id))!;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to persist team in PostgreSQL database in production.");
      }
    }
  }

  // Fallback / Test Store
  const teamId = `team_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date();
  const newTeam = {
    id: teamId,
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || null,
    creatorId,
    eventId: eventSummary ? eventSummary.slug : (input.eventId?.trim() || null),
    createdAt: now,
    updatedAt: now,
  };

  inMemoryTeams.set(teamId, newTeam);

  const memberId = `mem_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  inMemoryMembers.set(memberId, {
    id: memberId,
    teamId,
    userId: creatorId,
    role: "LEADER",
    joinedAt: now,
  });

  return (await getTeamByIdOrSlug(teamId))!;
}

/**
 * Retrieves a single team by its ID or unique slug
 */
export async function getTeamByIdOrSlug(idOrSlug: string): Promise<TeamItem | null> {
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const team = await prisma.team.findFirst({
        where: {
          OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        },
        include: {
          members: {
            include: { user: true },
          },
        },
      });

      if (!team) return null;

      let eventSummary = null;
      if (team.eventId) {
        const ev = await getEventBySlugOrId(team.eventId);
        if (ev) {
          eventSummary = {
            id: ev.id,
            slug: ev.slug,
            title: ev.title,
            minTeamSize: ev.minTeamSize,
            maxTeamSize: ev.maxTeamSize,
          };
        }
      }

      const members: TeamMemberItem[] = team.members.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        role: m.role as TeamRole,
        joinedAt: m.joinedAt,
        user: {
          id: m.user.id,
          username: m.user.username,
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          college: m.user.college,
        },
      }));

      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        creatorId: team.creatorId,
        eventId: team.eventId,
        event: eventSummary,
        members,
        memberCount: members.length,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      };
    } catch {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to lookup team in PostgreSQL database in production.");
      }
    }
  }

  // Fallback search
  let teamRecord = null;
  for (const t of inMemoryTeams.values()) {
    if (t.id === idOrSlug || t.slug === idOrSlug) {
      teamRecord = t;
      break;
    }
  }

  if (!teamRecord) return null;

  const members: TeamMemberItem[] = [];
  for (const m of inMemoryMembers.values()) {
    if (m.teamId === teamRecord.id) {
      const user = await findUserById(m.userId);
      if (user) {
        members.push({
          id: m.id,
          teamId: m.teamId,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            college: user.college,
          },
        });
      }
    }
  }

  let eventSummary = null;
  if (teamRecord.eventId) {
    const ev = await getEventBySlugOrId(teamRecord.eventId);
    if (ev) {
      eventSummary = {
        id: ev.id,
        slug: ev.slug,
        title: ev.title,
        minTeamSize: ev.minTeamSize,
        maxTeamSize: ev.maxTeamSize,
      };
    }
  }

  return {
    id: teamRecord.id,
    name: teamRecord.name,
    slug: teamRecord.slug,
    description: teamRecord.description,
    creatorId: teamRecord.creatorId,
    eventId: teamRecord.eventId,
    event: eventSummary,
    members,
    memberCount: members.length,
    createdAt: teamRecord.createdAt,
    updatedAt: teamRecord.updatedAt,
  };
}

/**
 * Retrieves all teams that a user belongs to (as Leader or Member)
 */
export async function getUserTeams(userId: string): Promise<TeamItem[]> {
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const memberships = await prisma.teamMember.findMany({
        where: { userId },
        include: {
          team: {
            include: {
              members: { include: { user: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      });

      const teams: TeamItem[] = [];
      for (const m of memberships) {
        let eventSummary = null;
        if (m.team.eventId) {
          const ev = await getEventBySlugOrId(m.team.eventId);
          if (ev) {
            eventSummary = {
              id: ev.id,
              slug: ev.slug,
              title: ev.title,
              minTeamSize: ev.minTeamSize,
              maxTeamSize: ev.maxTeamSize,
            };
          }
        }

        teams.push({
          id: m.team.id,
          name: m.team.name,
          slug: m.team.slug,
          description: m.team.description,
          creatorId: m.team.creatorId,
          eventId: m.team.eventId,
          event: eventSummary,
          members: m.team.members.map((tm) => ({
            id: tm.id,
            teamId: tm.teamId,
            userId: tm.userId,
            role: tm.role as TeamRole,
            joinedAt: tm.joinedAt,
            user: {
              id: tm.user.id,
              username: tm.user.username,
              name: tm.user.name,
              email: tm.user.email,
              avatarUrl: tm.user.avatarUrl,
              college: tm.user.college,
            },
          })),
          memberCount: m.team.members.length,
          createdAt: m.team.createdAt,
          updatedAt: m.team.updatedAt,
        });
      }

      return teams;
    } catch {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to lookup user teams in PostgreSQL database in production.");
      }
    }
  }

  // Fallback search
  const userTeamIds = new Set<string>();
  for (const m of inMemoryMembers.values()) {
    if (m.userId === userId) {
      userTeamIds.add(m.teamId);
    }
  }

  const teams: TeamItem[] = [];
  for (const teamId of userTeamIds) {
    const t = await getTeamByIdOrSlug(teamId);
    if (t) teams.push(t);
  }

  return teams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Creates and dispatches an invitation to a target username
 */
export async function inviteUserByUsername(
  teamId: string,
  inviterId: string,
  targetUsername: string
): Promise<TeamInvitationItem> {
  const team = await getTeamByIdOrSlug(teamId);
  if (!team) {
    throw new Error("Team not found.");
  }

  // Authorization: Only team LEADER can invite
  const inviterMembership = team.members.find((m) => m.userId === inviterId);
  if (!inviterMembership || inviterMembership.role !== "LEADER") {
    throw new Error("Forbidden: Only team leaders are authorized to invite new members.");
  }

  // Lookup target invitee by username
  const cleanUsername = targetUsername.trim().toLowerCase();
  const invitee = await findUserByUsername(cleanUsername);
  if (!invitee) {
    throw new Error(`User with username "@${cleanUsername}" was not found.`);
  }

  // Safeguard: Cannot invite self
  if (invitee.id === inviterId) {
    throw new Error("You cannot invite yourself to your own team.");
  }

  // Safeguard: Cannot invite existing member
  const alreadyMember = team.members.some((m) => m.userId === invitee.id);
  if (alreadyMember) {
    throw new Error(`@${invitee.username} is already an active member of this team.`);
  }

  // Safeguard: Cannot exceed event maximum team size
  if (team.event && team.members.length >= team.event.maxTeamSize) {
    throw new Error(
      `This team has reached the maximum allowed capacity (${team.event.maxTeamSize} members) for ${team.event.title}.`
    );
  }

  const mode = await getPersistenceMode();
  const now = new Date();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  if (mode === "DB") {
    try {
      // Check for active pending invitation
      const existingPending = await prisma.teamInvitation.findFirst({
        where: {
          teamId,
          inviteeId: invitee.id,
          status: "PENDING",
        },
      });

      if (existingPending) {
        throw new Error(`A pending invitation has already been sent to @${invitee.username}.`);
      }

      const inv = await prisma.teamInvitation.create({
        data: {
          teamId,
          inviterId,
          inviteeId: invitee.id,
          status: "PENDING",
          expiresAt,
        },
        include: {
          inviter: true,
          invitee: true,
          team: true,
        },
      });

      return {
        id: inv.id,
        teamId: inv.teamId,
        teamName: inv.team.name,
        teamSlug: inv.team.slug,
        inviterId: inv.inviterId,
        inviter: {
          id: inv.inviter.id,
          username: inv.inviter.username,
          name: inv.inviter.name,
        },
        inviteeId: inv.inviteeId,
        invitee: {
          id: inv.invitee.id,
          username: inv.invitee.username,
          name: inv.invitee.name,
          email: inv.invitee.email,
        },
        status: inv.status as InvitationStatus,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("pending invitation")) {
        throw err;
      }
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to issue invitation in PostgreSQL database in production.");
      }
    }
  }

  // Fallback Store
  for (const inv of inMemoryInvitations.values()) {
    if (inv.teamId === teamId && inv.inviteeId === invitee.id && inv.status === "PENDING") {
      throw new Error(`A pending invitation has already been sent to @${invitee.username}.`);
    }
  }

  const invId = `inv_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const newInvitation = {
    id: invId,
    teamId,
    inviterId,
    inviteeId: invitee.id,
    status: "PENDING" as InvitationStatus,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  inMemoryInvitations.set(invId, newInvitation);

  const inviter = await findUserById(inviterId);

  return {
    id: invId,
    teamId,
    teamName: team.name,
    teamSlug: team.slug,
    inviterId,
    inviter: {
      id: inviter!.id,
      username: inviter!.username,
      name: inviter!.name,
    },
    inviteeId: invitee.id,
    invitee: {
      id: invitee.id,
      username: invitee.username,
      name: invitee.name,
      email: invitee.email,
    },
    status: "PENDING",
    createdAt: now,
    expiresAt,
  };
}

/**
 * Retrieves pending incoming invitations for a user
 */
export async function getUserReceivedInvitations(userId: string): Promise<TeamInvitationItem[]> {
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const invs = await prisma.teamInvitation.findMany({
        where: {
          inviteeId: userId,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        include: {
          team: true,
          inviter: true,
          invitee: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return invs.map((i) => ({
        id: i.id,
        teamId: i.teamId,
        teamName: i.team.name,
        teamSlug: i.team.slug,
        inviterId: i.inviterId,
        inviter: {
          id: i.inviter.id,
          username: i.inviter.username,
          name: i.inviter.name,
        },
        inviteeId: i.inviteeId,
        invitee: {
          id: i.invitee.id,
          username: i.invitee.username,
          name: i.invitee.name,
          email: i.invitee.email,
        },
        status: i.status as InvitationStatus,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
      }));
    } catch {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to lookup received invitations in production.");
      }
    }
  }

  // Fallback
  const list: TeamInvitationItem[] = [];
  const now = new Date();

  for (const i of inMemoryInvitations.values()) {
    if (i.inviteeId === userId && i.status === "PENDING" && i.expiresAt > now) {
      const team = await getTeamByIdOrSlug(i.teamId);
      const inviter = await findUserById(i.inviterId);
      const invitee = await findUserById(i.inviteeId);

      if (team && inviter && invitee) {
        list.push({
          id: i.id,
          teamId: i.teamId,
          teamName: team.name,
          teamSlug: team.slug,
          inviterId: i.inviterId,
          inviter: {
            id: inviter.id,
            username: inviter.username,
            name: inviter.name,
          },
          inviteeId: i.inviteeId,
          invitee: {
            id: invitee.id,
            username: invitee.username,
            name: invitee.name,
            email: invitee.email,
          },
          status: i.status,
          createdAt: i.createdAt,
          expiresAt: i.expiresAt,
        });
      }
    }
  }

  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Retrieves outgoing sent invitations for a team (caller must be team member)
 */
export async function getTeamSentInvitations(teamId: string, requesterId: string): Promise<TeamInvitationItem[]> {
  const team = await getTeamByIdOrSlug(teamId);
  if (!team) throw new Error("Team not found.");

  const isMember = team.members.some((m) => m.userId === requesterId);
  if (!isMember) throw new Error("Forbidden: You are not a member of this team.");

  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const invs = await prisma.teamInvitation.findMany({
        where: {
          teamId,
          status: "PENDING",
        },
        include: {
          team: true,
          inviter: true,
          invitee: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return invs.map((i) => ({
        id: i.id,
        teamId: i.teamId,
        teamName: i.team.name,
        teamSlug: i.team.slug,
        inviterId: i.inviterId,
        inviter: {
          id: i.inviter.id,
          username: i.inviter.username,
          name: i.inviter.name,
        },
        inviteeId: i.inviteeId,
        invitee: {
          id: i.invitee.id,
          username: i.invitee.username,
          name: i.invitee.name,
          email: i.invitee.email,
        },
        status: i.status as InvitationStatus,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
      }));
    } catch {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to lookup sent invitations in production.");
      }
    }
  }

  // Fallback
  const list: TeamInvitationItem[] = [];
  for (const i of inMemoryInvitations.values()) {
    if (i.teamId === teamId && i.status === "PENDING") {
      const inviter = await findUserById(i.inviterId);
      const invitee = await findUserById(i.inviteeId);
      if (inviter && invitee) {
        list.push({
          id: i.id,
          teamId: i.teamId,
          teamName: team.name,
          teamSlug: team.slug,
          inviterId: i.inviterId,
          inviter: {
            id: inviter.id,
            username: inviter.username,
            name: inviter.name,
          },
          inviteeId: i.inviteeId,
          invitee: {
            id: invitee.id,
            username: invitee.username,
            name: invitee.name,
            email: invitee.email,
          },
          status: i.status,
          createdAt: i.createdAt,
          expiresAt: i.expiresAt,
        });
      }
    }
  }

  return list;
}

/**
 * Responds to an invitation: ACCEPT or DECLINE
 * Enforces that only the designated invitee can respond.
 */
export async function respondToInvitation(
  invitationId: string,
  userId: string,
  action: "ACCEPT" | "DECLINE"
): Promise<{ success: boolean; teamId: string }> {
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      return await prisma.$transaction(async (tx) => {
        const inv = await tx.teamInvitation.findUnique({
          where: { id: invitationId },
          include: { team: { include: { members: true } } },
        });

        if (!inv) {
          throw new Error("Invitation not found.");
        }
        if (inv.status !== "PENDING") {
          throw new Error("This invitation is no longer pending.");
        }

        // Security check: Must be the designated invitee!
        if (inv.inviteeId !== userId) {
          throw new Error("Forbidden: You cannot respond to an invitation sent to another user.");
        }

        if (inv.expiresAt < new Date()) {
          await tx.teamInvitation.update({
            where: { id: invitationId },
            data: { status: "CANCELLED" },
          });
          throw new Error("This invitation has expired.");
        }

        if (action === "DECLINE") {
          await tx.teamInvitation.update({
            where: { id: invitationId },
            data: { status: "DECLINED" },
          });
          return { success: true, teamId: inv.teamId };
        }

        // Action is ACCEPT: Check maximum team size if event-associated
        if (inv.team.eventId) {
          const ev = await getEventBySlugOrId(inv.team.eventId);
          if (ev && inv.team.members.length >= ev.maxTeamSize) {
            throw new Error(`This team has reached the maximum size (${ev.maxTeamSize}) for ${ev.title}.`);
          }
        }

        // Update invitation status
        await tx.teamInvitation.update({
          where: { id: invitationId },
          data: { status: "ACCEPTED" },
        });

        // Add member (or ignore if already exists)
        await tx.teamMember.upsert({
          where: {
            teamId_userId: {
              teamId: inv.teamId,
              userId,
            },
          },
          create: {
            teamId: inv.teamId,
            userId,
            role: "MEMBER",
          },
          update: {},
        });

        return { success: true, teamId: inv.teamId };
      });
    } catch (err: unknown) {
      if (err instanceof Error) throw err;
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to process invitation acceptance in PostgreSQL.");
      }
    }
  }

  // Fallback
  const inv = inMemoryInvitations.get(invitationId);
  if (!inv) {
    throw new Error("Invitation not found.");
  }
  if (inv.status !== "PENDING") {
    throw new Error("This invitation is no longer pending.");
  }

  if (inv.inviteeId !== userId) {
    throw new Error("Forbidden: You cannot respond to an invitation sent to another user.");
  }

  if (inv.expiresAt < new Date()) {
    inv.status = "CANCELLED";
    throw new Error("This invitation has expired.");
  }

  if (action === "DECLINE") {
    inv.status = "DECLINED";
    return { success: true, teamId: inv.teamId };
  }

  const team = await getTeamByIdOrSlug(inv.teamId);
  if (!team) throw new Error("Team not found.");

  if (team.event && team.members.length >= team.event.maxTeamSize) {
    throw new Error(`This team has reached the maximum size (${team.event.maxTeamSize}) for ${team.event.title}.`);
  }

  inv.status = "ACCEPTED";

  // Check if already in members
  let existingMember = false;
  for (const m of inMemoryMembers.values()) {
    if (m.teamId === inv.teamId && m.userId === userId) {
      existingMember = true;
      break;
    }
  }

  if (!existingMember) {
    const memId = `mem_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    inMemoryMembers.set(memId, {
      id: memId,
      teamId: inv.teamId,
      userId,
      role: "MEMBER",
      joinedAt: new Date(),
    });
  }

  return { success: true, teamId: inv.teamId };
}

/**
 * Cancels a pending invitation
 * Requester must be LEADER of the team or the original inviter.
 */
export async function cancelInvitation(invitationId: string, requesterId: string): Promise<boolean> {
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const inv = await prisma.teamInvitation.findUnique({
        where: { id: invitationId },
        include: { team: { include: { members: true } } },
      });

      if (!inv) {
        throw new Error("Invitation not found.");
      }
      if (inv.status !== "PENDING") {
        throw new Error("This invitation is no longer pending.");
      }

      const isLeader = inv.team.members.some((m) => m.userId === requesterId && m.role === "LEADER");
      if (inv.inviterId !== requesterId && !isLeader) {
        throw new Error("Forbidden: Only the inviter or team leader can cancel this invitation.");
      }

      await prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { status: "CANCELLED" },
      });

      return true;
    } catch (err) {
      if (err instanceof Error) throw err;
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to cancel invitation in production database.");
      }
    }
  }

  const inv = inMemoryInvitations.get(invitationId);
  if (!inv) {
    throw new Error("Invitation not found.");
  }
  if (inv.status !== "PENDING") {
    throw new Error("This invitation is no longer pending.");
  }

  const team = await getTeamByIdOrSlug(inv.teamId);
  const isLeader = team?.members.some((m) => m.userId === requesterId && m.role === "LEADER");

  if (inv.inviterId !== requesterId && !isLeader) {
    throw new Error("Forbidden: Only the inviter or team leader can cancel this invitation.");
  }

  inv.status = "CANCELLED";
  return true;
}

/**
 * Removes a member from a team or allows a member to leave
 */
export async function removeTeamMember(teamId: string, targetUserId: string, requesterId: string): Promise<boolean> {
  const team = await getTeamByIdOrSlug(teamId);
  if (!team) throw new Error("Team not found.");

  const requesterMember = team.members.find((m) => m.userId === requesterId);
  if (!requesterMember) throw new Error("Forbidden: You are not a member of this team.");

  const isSelf = requesterId === targetUserId;
  const isLeader = requesterMember.role === "LEADER";

  if (!isSelf && !isLeader) {
    throw new Error("Forbidden: Only team leaders can remove other members.");
  }

  const targetMember = team.members.find((m) => m.userId === targetUserId);
  if (!targetMember) throw new Error("Member not found in team.");

  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      await prisma.$transaction(async (tx) => {
        // If the leader is leaving
        if (targetMember.role === "LEADER") {
          const otherMembers = team.members.filter((m) => m.userId !== targetUserId);
          if (otherMembers.length > 0) {
            // Promote next member to leader
            await tx.teamMember.update({
              where: { id: otherMembers[0].id },
              data: { role: "LEADER" },
            });
          } else {
            // Last member leaving: delete team
            await tx.team.delete({ where: { id: teamId } });
            return;
          }
        }

        await tx.teamMember.delete({
          where: {
            teamId_userId: {
              teamId,
              userId: targetUserId,
            },
          },
        });
      });

      return true;
    } catch {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to remove member in PostgreSQL.");
      }
    }
  }

  // Fallback
  if (targetMember.role === "LEADER") {
    const otherMembers = team.members.filter((m) => m.userId !== targetUserId);
    if (otherMembers.length > 0) {
      const nextMem = inMemoryMembers.get(otherMembers[0].id);
      if (nextMem) nextMem.role = "LEADER";
    } else {
      inMemoryTeams.delete(teamId);
    }
  }

  inMemoryMembers.delete(targetMember.id);
  return true;
}

/**
 * Reset test store helper for automated test isolation
 */
export function __resetTeamTestStore() {
  inMemoryTeams.clear();
  inMemoryMembers.clear();
  inMemoryInvitations.clear();
}

