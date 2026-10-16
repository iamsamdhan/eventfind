import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { 
  RegistrationItem, 
  RegisterEventInput, 
  RegistrationType, 
  RegistrationStatus 
} from "@/types/registration";
import { 
  findUserById, 
  checkDatabaseAvailability, 
  isFallbackPermitted, 
  AuthPersistenceError 
} from "@/lib/auth/store";
import { syncSeedEventsToDatabase, getDbEventBySlugOrId } from "@/lib/events/sync";
import { getTeamByIdOrSlug } from "@/lib/teams/service";

// In-process fallback store for environments without database
const inMemoryRegistrations: Map<string, {
  id: string;
  eventId: string;
  userId: string;
  teamId: string | null;
  type: RegistrationType;
  status: RegistrationStatus;
  spots: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}> = new Map();

async function getPersistenceMode(): Promise<"DB" | "FALLBACK"> {
  const isDb = await checkDatabaseAvailability();
  if (isDb) return "DB";

  if (!isFallbackPermitted()) {
    throw new AuthPersistenceError(
      "Database persistence failure. In-memory registration fallback is disabled in production."
    );
  }

  return "FALLBACK";
}

/**
 * Executes a transactional event registration (individual or team)
 */
export async function registerForEvent(
  userId: string,
  input: RegisterEventInput
): Promise<RegistrationItem> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("Authenticated user not found.");
  }

  // 1. Authorization: Only STUDENT role can register as attendee
  if (user.role !== "STUDENT") {
    throw new Error("Forbidden: Only students are eligible to register as event attendees.");
  }

  // 2. Event Lookup & Availability Validation
  const event = await getDbEventBySlugOrId(input.eventId);
  if (!event) {
    throw new Error(`Event "${input.eventId}" not found.`);
  }

  if (!event.published) {
    throw new Error("This event is not open for public registration.");
  }

  const now = new Date();
  if (now > new Date(event.registrationDeadline)) {
    throw new Error(
      `Registration closed: The deadline (${new Date(event.registrationDeadline).toLocaleDateString()}) has passed.`
    );
  }

  // 3. Participation Type & Team Rules Validation
  let teamRecord = null;
  let spots = 1;

  if (input.type === "TEAM") {
    if (!event.isTeamEvent) {
      throw new Error(`Event "${event.title}" is an individual event and does not support team registration.`);
    }

    if (!input.teamId || !input.teamId.trim()) {
      throw new Error("A valid teamId must be provided for team registration.");
    }

    teamRecord = await getTeamByIdOrSlug(input.teamId.trim());
    if (!teamRecord) {
      throw new Error("Team not found.");
    }

    // Permission: Only team LEADER can register the team
    const leaderMembership = teamRecord.members.find(
      (m) => m.userId === userId && m.role === "LEADER"
    );
    if (!leaderMembership) {
      throw new Error("Forbidden: Only the team leader is authorized to register the team for an event.");
    }

    // Team size validation against event constraints
    if (teamRecord.members.length < event.minTeamSize) {
      throw new Error(
        `Team has ${teamRecord.members.length} members, but this event requires a minimum of ${event.minTeamSize} members.`
      );
    }

    if (teamRecord.members.length > event.maxTeamSize) {
      throw new Error(
        `Team has ${teamRecord.members.length} members, exceeding the event maximum capacity of ${event.maxTeamSize} members.`
      );
    }

    spots = teamRecord.members.length;
  } else {
    // INDIVIDUAL REGISTRATION
    if (event.isTeamEvent && event.minTeamSize > 1) {
      throw new Error(
        `Event "${event.title}" requires team participation (minimum ${event.minTeamSize} members). Individual registration is not permitted.`
      );
    }
    spots = 1;
  }

  const mode = await getPersistenceMode();

  // 4. PostgreSQL Database Execution with Row-Level Lock & Transaction
  if (mode === "DB") {
    await syncSeedEventsToDatabase();

    try {
      return await prisma.$transaction(async (tx) => {
        // Find DB event record
        const dbEvent = await tx.event.findFirst({
          where: { OR: [{ id: event.id }, { slug: event.slug }] },
        });

        if (!dbEvent) {
          throw new Error("Event record not found in database.");
        }

        // Row-Level Lock: acquire an exclusive lock on the event row during the transaction
        await tx.$queryRaw`SELECT id FROM events WHERE id = ${dbEvent.id} FOR UPDATE;`;

        // Refresh event data under row lock
        const lockedEvent = await tx.event.findUnique({
          where: { id: dbEvent.id },
        });

        if (!lockedEvent) {
          throw new Error("Failed to lock event record.");
        }

        // Duplicate checks
        if (input.type === "INDIVIDUAL") {
          // Check if user has an active registration
          const existingUserReg = await tx.registration.findFirst({
            where: {
              eventId: lockedEvent.id,
              userId,
              status: { in: ["CONFIRMED", "WAITLISTED"] },
            },
          });

          if (existingUserReg) {
            throw new Error(`You already have an active registration for ${lockedEvent.title}.`);
          }

          // Check if user is part of a team registered for this event
          const userTeams = await tx.teamMember.findMany({
            where: { userId },
            select: { teamId: true },
          });
          const userTeamIds = userTeams.map((t) => t.teamId);

          if (userTeamIds.length > 0) {
            const teamReg = await tx.registration.findFirst({
              where: {
                eventId: lockedEvent.id,
                teamId: { in: userTeamIds },
                status: { in: ["CONFIRMED", "WAITLISTED"] },
              },
              include: { team: true },
            });

            if (teamReg) {
              throw new Error(
                `You are already participating in this event as part of team "${teamReg.team?.name}".`
              );
            }
          }
        } else if (input.type === "TEAM" && teamRecord) {
          // Check if this team is already registered
          const existingTeamReg = await tx.registration.findFirst({
            where: {
              eventId: lockedEvent.id,
              teamId: teamRecord.id,
              status: { in: ["CONFIRMED", "WAITLISTED"] },
            },
          });

          if (existingTeamReg) {
            throw new Error(`Team "${teamRecord.name}" is already registered for this event.`);
          }

          // Check each member of the team for cross-registration
          const memberUserIds = teamRecord.members.map((m) => m.userId);
          for (const mem of teamRecord.members) {
            // Check individual registration
            const indivReg = await tx.registration.findFirst({
              where: {
                eventId: lockedEvent.id,
                userId: mem.userId,
                status: { in: ["CONFIRMED", "WAITLISTED"] },
              },
            });

            if (indivReg) {
              throw new Error(
                `Member @${mem.user.username} is already registered individually for this event.`
              );
            }

            // Check if member is registered with another team
            const otherTeamReg = await tx.registration.findFirst({
              where: {
                eventId: lockedEvent.id,
                teamId: { not: teamRecord.id },
                status: { in: ["CONFIRMED", "WAITLISTED"] },
                team: {
                  members: {
                    some: { userId: mem.userId },
                  },
                },
              },
              include: { team: true },
            });

            if (otherTeamReg) {
              throw new Error(
                `Member @${mem.user.username} is already registered with another squad ("${otherTeamReg.team?.name}").`
              );
            }
          }
        }

        // Capacity and Status Decision
        const remainingCapacity = lockedEvent.capacity - lockedEvent.registeredCount;
        const willConfirm = spots <= remainingCapacity;
        const assignedStatus: RegistrationStatus = willConfirm ? "CONFIRMED" : "WAITLISTED";

        if (willConfirm) {
          // Atomically consume spots
          await tx.event.update({
            where: { id: lockedEvent.id },
            data: { registeredCount: { increment: spots } },
          });
        }

        // Upsert registration record (re-using row if previously CANCELLED)
        const registration = await tx.registration.upsert({
          where: {
            eventId_userId: {
              eventId: lockedEvent.id,
              userId,
            },
          },
          create: {
            eventId: lockedEvent.id,
            userId,
            teamId: teamRecord ? teamRecord.id : null,
            type: input.type,
            status: assignedStatus,
            spots,
            notes: input.notes?.trim() || null,
          },
          update: {
            teamId: teamRecord ? teamRecord.id : null,
            type: input.type,
            status: assignedStatus,
            spots,
            notes: input.notes?.trim() || null,
          },
          include: {
            event: true,
            user: true,
            team: {
              include: {
                members: { include: { user: true } },
              },
            },
          },
        });

        return {
          id: registration.id,
          eventId: registration.eventId,
          event: {
            id: registration.event.id,
            slug: registration.event.slug,
            title: registration.event.title,
            category: registration.event.category,
            format: registration.event.format,
            location: registration.event.location,
            startDate: registration.event.startDate.toISOString(),
            endDate: registration.event.endDate.toISOString(),
            registrationDeadline: registration.event.registrationDeadline.toISOString(),
            capacity: registration.event.capacity,
            registeredCount: willConfirm ? lockedEvent.registeredCount + spots : lockedEvent.registeredCount,
            isTeamEvent: registration.event.isTeamEvent,
            minTeamSize: registration.event.minTeamSize,
            maxTeamSize: registration.event.maxTeamSize,
          },
          userId: registration.userId,
          user: {
            id: registration.user.id,
            username: registration.user.username,
            name: registration.user.name,
            email: registration.user.email,
            college: registration.user.college,
          },
          teamId: registration.teamId,
          team: registration.team
            ? {
                id: registration.team.id,
                name: registration.team.name,
                slug: registration.team.slug,
                members: registration.team.members.map((m) => ({
                  userId: m.userId,
                  username: m.user.username,
                  name: m.user.name,
                  role: m.role,
                })),
              }
            : null,
          type: registration.type as RegistrationType,
          status: registration.status as RegistrationStatus,
          spots: registration.spots,
          notes: registration.notes,
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt,
        };
      });
    } catch (err: unknown) {
      if (err instanceof Error) throw err;
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to persist event registration in PostgreSQL database.");
      }
    }
  }

  // 5. Fallback / Test Store Execution
  // Check duplicate
  for (const reg of inMemoryRegistrations.values()) {
    if (reg.eventId === event.id && (reg.status === "CONFIRMED" || reg.status === "WAITLISTED")) {
      if (input.type === "INDIVIDUAL" && reg.userId === userId) {
        throw new Error(`You already have an active registration for ${event.title}.`);
      }
      if (input.type === "TEAM" && teamRecord && reg.teamId === teamRecord.id) {
        throw new Error(`Team "${teamRecord.name}" is already registered for this event.`);
      }
    }
  }

  // Count current fallback confirmed spots
  let confirmedSpots = event.registeredCount;
  for (const reg of inMemoryRegistrations.values()) {
    if (reg.eventId === event.id && reg.status === "CONFIRMED") {
      confirmedSpots += reg.spots;
    }
  }

  const remaining = event.capacity - confirmedSpots;
  const willConfirm = spots <= remaining;
  const status: RegistrationStatus = willConfirm ? "CONFIRMED" : "WAITLISTED";

  const regId = `reg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const nowTime = new Date();

  const fallbackReg = {
    id: regId,
    eventId: event.id,
    userId,
    teamId: teamRecord ? teamRecord.id : null,
    type: input.type,
    status,
    spots,
    notes: input.notes?.trim() || null,
    createdAt: nowTime,
    updatedAt: nowTime,
  };

  inMemoryRegistrations.set(regId, fallbackReg);

  return {
    id: regId,
    eventId: event.id,
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      category: event.category,
      format: event.format,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      capacity: event.capacity,
      registeredCount: willConfirm ? confirmedSpots + spots : confirmedSpots,
      isTeamEvent: event.isTeamEvent,
      minTeamSize: event.minTeamSize,
      maxTeamSize: event.maxTeamSize,
    },
    userId,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      college: user.college,
    },
    teamId: teamRecord ? teamRecord.id : null,
    team: teamRecord
      ? {
          id: teamRecord.id,
          name: teamRecord.name,
          slug: teamRecord.slug,
          members: teamRecord.members.map((m) => ({
            userId: m.userId,
            username: m.user.username,
            name: m.user.name,
            role: m.role,
          })),
        }
      : null,
    type: input.type,
    status,
    spots,
    notes: fallbackReg.notes,
    createdAt: nowTime,
    updatedAt: nowTime,
  };
}

/**
 * Retrieves all registrations for a user (or filters by event)
 */
export async function getUserRegistrations(
  userId: string,
  eventIdOrSlug?: string
): Promise<RegistrationItem[]> {
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    await syncSeedEventsToDatabase();

    try {
      const whereClause: any = {
        OR: [
          { userId },
          {
            team: {
              members: {
                some: { userId },
              },
            },
          },
        ],
      };

      if (eventIdOrSlug) {
        whereClause.event = {
          OR: [{ id: eventIdOrSlug }, { slug: eventIdOrSlug }],
        };
      }

      const list = await prisma.registration.findMany({
        where: whereClause,
        include: {
          event: true,
          user: true,
          team: {
            include: {
              members: { include: { user: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return list.map((reg) => ({
        id: reg.id,
        eventId: reg.eventId,
        event: {
          id: reg.event.id,
          slug: reg.event.slug,
          title: reg.event.title,
          category: reg.event.category,
          format: reg.event.format,
          location: reg.event.location,
          startDate: reg.event.startDate.toISOString(),
          endDate: reg.event.endDate.toISOString(),
          registrationDeadline: reg.event.registrationDeadline.toISOString(),
          capacity: reg.event.capacity,
          registeredCount: reg.event.registeredCount,
          isTeamEvent: reg.event.isTeamEvent,
          minTeamSize: reg.event.minTeamSize,
          maxTeamSize: reg.event.maxTeamSize,
        },
        userId: reg.userId,
        user: {
          id: reg.user.id,
          username: reg.user.username,
          name: reg.user.name,
          email: reg.user.email,
          college: reg.user.college,
        },
        teamId: reg.teamId,
        team: reg.team
          ? {
              id: reg.team.id,
              name: reg.team.name,
              slug: reg.team.slug,
              members: reg.team.members.map((m) => ({
                userId: m.userId,
                username: m.user.username,
                name: m.user.name,
                role: m.role,
              })),
            }
          : null,
        type: reg.type as RegistrationType,
        status: reg.status as RegistrationStatus,
        spots: reg.spots,
        notes: reg.notes,
        createdAt: reg.createdAt,
        updatedAt: reg.updatedAt,
      }));
    } catch {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to lookup registrations in database.");
      }
    }
  }

  // Fallback
  const results: RegistrationItem[] = [];
  for (const reg of inMemoryRegistrations.values()) {
    let isUserMatch = reg.userId === userId;
    let teamData: any = null;

    if (reg.teamId) {
      const team = await getTeamByIdOrSlug(reg.teamId);
      if (team) {
        teamData = {
          id: team.id,
          name: team.name,
          slug: team.slug,
          members: team.members.map((m) => ({
            userId: m.userId,
            username: m.user.username,
            name: m.user.name,
            role: m.role,
          })),
        };
        if (team.members.some((m) => m.userId === userId)) {
          isUserMatch = true;
        }
      }
    }

    if (isUserMatch) {
      if (!eventIdOrSlug || reg.eventId === eventIdOrSlug) {
        const ev = await getDbEventBySlugOrId(reg.eventId);
        const user = await findUserById(reg.userId);
        if (ev && user) {
          results.push({
            id: reg.id,
            eventId: reg.eventId,
            event: {
              id: ev.id,
              slug: ev.slug,
              title: ev.title,
              category: ev.category,
              format: ev.format,
              location: ev.location,
              startDate: ev.startDate,
              endDate: ev.endDate,
              registrationDeadline: ev.registrationDeadline,
              capacity: ev.capacity,
              registeredCount: ev.registeredCount,
              isTeamEvent: ev.isTeamEvent,
              minTeamSize: ev.minTeamSize,
              maxTeamSize: ev.maxTeamSize,
            },
            userId: reg.userId,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              college: user.college,
            },
            teamId: reg.teamId,
            team: teamData,
            type: reg.type,
            status: reg.status,
            spots: reg.spots,
            notes: reg.notes,
            createdAt: reg.createdAt,
            updatedAt: reg.updatedAt,
          });
        }
      }
    }
  }

  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Cancels a registration, releases event capacity, and promotes the next waitlisted registration
 */
export async function cancelRegistration(
  registrationId: string,
  userId: string
): Promise<{ success: boolean; message: string; promotedRegistrationId?: string }> {
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      return await prisma.$transaction(async (tx) => {
        const reg = await tx.registration.findUnique({
          where: { id: registrationId },
          include: {
            event: true,
            team: { include: { members: true } },
          },
        });

        if (!reg) {
          throw new Error("Registration record not found.");
        }

        if (reg.status === "CANCELLED") {
          throw new Error("This registration has already been cancelled.");
        }

        // Authorization: Must be registrant or team leader
        const isIndividual = reg.userId === userId;
        const isTeamLeader = reg.team?.members.some(
          (m) => m.userId === userId && m.role === "LEADER"
        );

        if (!isIndividual && !isTeamLeader) {
          throw new Error("Forbidden: You are not authorized to cancel this registration.");
        }

        const wasConfirmed = reg.status === "CONFIRMED";

        // Mark registration as CANCELLED
        await tx.registration.update({
          where: { id: registrationId },
          data: { status: "CANCELLED" },
        });

        let promotedId = undefined;

        if (wasConfirmed) {
          // Release capacity
          await tx.event.update({
            where: { id: reg.eventId },
            data: { registeredCount: { decrement: reg.spots } },
          });

          // Check if any waitlisted registrations can be promoted
          const lockedEvent = await tx.event.findUnique({
            where: { id: reg.eventId },
          });

          if (lockedEvent) {
            const availableCapacity = lockedEvent.capacity - lockedEvent.registeredCount;

            const waitlistedCandidates = await tx.registration.findMany({
              where: {
                eventId: reg.eventId,
                status: "WAITLISTED",
              },
              orderBy: { createdAt: "asc" },
            });

            for (const candidate of waitlistedCandidates) {
              if (candidate.spots <= availableCapacity) {
                // Promote candidate to CONFIRMED
                await tx.registration.update({
                  where: { id: candidate.id },
                  data: { status: "CONFIRMED" },
                });

                await tx.event.update({
                  where: { id: reg.eventId },
                  data: { registeredCount: { increment: candidate.spots } },
                });

                promotedId = candidate.id;
                break;
              }
            }
          }
        }

        return {
          success: true,
          message: "Registration cancelled successfully.",
          promotedRegistrationId: promotedId,
        };
      });
    } catch (err: unknown) {
      if (err instanceof Error) throw err;
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to cancel registration in database.");
      }
    }
  }

  // Fallback
  const reg = inMemoryRegistrations.get(registrationId);
  if (!reg) throw new Error("Registration record not found.");
  if (reg.status === "CANCELLED") throw new Error("This registration has already been cancelled.");

  if (reg.userId !== userId) {
    throw new Error("Forbidden: You are not authorized to cancel this registration.");
  }

  reg.status = "CANCELLED";
  reg.updatedAt = new Date();

  return {
    success: true,
    message: "Registration cancelled successfully.",
  };
}

/**
 * Reset helper for testing
 */
export function __resetRegistrationTestStore() {
  inMemoryRegistrations.clear();
}
