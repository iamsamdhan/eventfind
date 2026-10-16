import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { SafeUser } from "@/types/auth";
import { 
  OrganizerDashboardData, 
  OrganizerEventSummary, 
  OrganizerAttendeeItem, 
  CreateEventInput, 
  UpdateEventInput,
  EventDomainStatus 
} from "@/types/organizer";
import { EventItem } from "@/types/event";
import { checkDatabaseAvailability, isFallbackPermitted, AuthPersistenceError } from "@/lib/auth/store";
import { syncSeedEventsToDatabase } from "@/lib/events/sync";

// In-memory store for fallback environments
const inMemoryOrganizerEvents: Map<string, any> = new Map();

async function getPersistenceMode(): Promise<"DB" | "FALLBACK"> {
  const isDb = await checkDatabaseAvailability();
  if (isDb) return "DB";

  if (!isFallbackPermitted()) {
    throw new AuthPersistenceError(
      "Database persistence failure. In-memory organizer fallback is disabled in production."
    );
  }

  return "FALLBACK";
}

export function computeDomainStatus(event: {
  published: boolean;
  isClosed?: boolean;
  registrationDeadline: Date | string;
  endDate: Date | string;
}): EventDomainStatus {
  if (!event.published) {
    return "DRAFT";
  }

  const now = new Date();
  const endDate = new Date(event.endDate);
  const deadline = new Date(event.registrationDeadline);

  if (endDate.getTime() < now.getTime()) {
    return "COMPLETED";
  }

  if (event.isClosed || deadline.getTime() < now.getTime()) {
    return "CLOSED";
  }

  return "PUBLISHED";
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base || "event"}-${suffix}`;
}

/**
 * Asserts event ownership: caller must be event creator/organizer, or ADMIN
 */
export async function verifyEventOwnership(
  eventIdOrSlug: string,
  organizerUserId: string,
  userRole: string
): Promise<any> {
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    await syncSeedEventsToDatabase();

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: eventIdOrSlug }, { slug: eventIdOrSlug }],
      },
    });

    if (!event) {
      throw new Error("Event not found.");
    }

    if (userRole !== "ADMIN" && event.organizerId !== organizerUserId) {
      throw new Error("Forbidden: You do not have permission to manage this event.");
    }

    return event;
  }

  // Fallback
  for (const ev of inMemoryOrganizerEvents.values()) {
    if (ev.id === eventIdOrSlug || ev.slug === eventIdOrSlug) {
      if (userRole !== "ADMIN" && ev.organizerId !== organizerUserId) {
        throw new Error("Forbidden: You do not have permission to manage this event.");
      }
      return ev;
    }
  }

  throw new Error("Event not found.");
}

/**
 * Retrieves the organizer's events and aggregate dashboard statistics
 */
export async function getOrganizerDashboardData(
  organizerUserId: string,
  userRole: string
): Promise<OrganizerDashboardData> {
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    await syncSeedEventsToDatabase();

    // Query events owned by organizer (or all if ADMIN)
    const whereClause: any = userRole === "ADMIN" ? {} : { organizerId: organizerUserId };

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        registrations: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const summaries: OrganizerEventSummary[] = events.map((ev) => {
      const confirmed = ev.registrations.filter((r) => r.status === "CONFIRMED");
      const waitlisted = ev.registrations.filter((r) => r.status === "WAITLISTED");
      const cancelled = ev.registrations.filter((r) => r.status === "CANCELLED");
      const teamRegs = ev.registrations.filter((r) => r.type === "TEAM" && r.status === "CONFIRMED");

      const domainStatus = computeDomainStatus({
        published: ev.published,
        isClosed: ev.isClosed,
        registrationDeadline: ev.registrationDeadline,
        endDate: ev.endDate,
      });

      return {
        id: ev.id,
        slug: ev.slug,
        title: ev.title,
        tagline: ev.tagline,
        category: ev.category as any,
        format: ev.format as any,
        location: ev.location,
        city: ev.city,
        venue: ev.venue,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate.toISOString(),
        registrationDeadline: ev.registrationDeadline.toISOString(),
        capacity: ev.capacity,
        registeredCount: ev.registeredCount,
        availableSpots: Math.max(0, ev.capacity - ev.registeredCount),
        isTeamEvent: ev.isTeamEvent,
        minTeamSize: ev.minTeamSize,
        maxTeamSize: ev.maxTeamSize,
        eligibility: ev.eligibility,
        published: ev.published,
        isClosed: ev.isClosed,
        domainStatus,
        confirmedCount: confirmed.length,
        waitlistedCount: waitlisted.length,
        cancelledCount: cancelled.length,
        teamRegistrationCount: teamRegs.length,
        bannerGradient: ev.bannerGradient,
        createdAt: ev.createdAt.toISOString(),
        updatedAt: ev.updatedAt.toISOString(),
      };
    });

    const totalEvents = summaries.length;
    const activeEvents = summaries.filter(
      (e) => e.domainStatus === "PUBLISHED" || e.domainStatus === "CLOSED"
    ).length;
    const totalAttendees = summaries.reduce((acc, curr) => acc + curr.registeredCount, 0);
    const totalTeams = summaries.reduce((acc, curr) => acc + curr.teamRegistrationCount, 0);

    return {
      events: summaries,
      stats: {
        totalEvents,
        activeEvents,
        totalAttendees,
        totalTeams,
      },
    };
  }

  // Fallback
  const list: OrganizerEventSummary[] = [];
  for (const ev of inMemoryOrganizerEvents.values()) {
    if (userRole === "ADMIN" || ev.organizerId === organizerUserId) {
      list.push(ev);
    }
  }

  return {
    events: list,
    stats: {
      totalEvents: list.length,
      activeEvents: list.filter((e) => e.domainStatus === "PUBLISHED").length,
      totalAttendees: list.reduce((acc, curr) => acc + curr.registeredCount, 0),
      totalTeams: list.reduce((acc, curr) => acc + curr.teamRegistrationCount, 0),
    },
  };
}

/**
 * Creates an event owned by the authenticated organizer
 */
export async function createOrganizerEvent(
  organizerUser: SafeUser,
  input: CreateEventInput
): Promise<OrganizerEventSummary> {
  const mode = await getPersistenceMode();

  let slug = input.slug?.trim() || "";
  if (!slug) {
    slug = generateSlug(input.title);
  }

  const isTeam = Boolean(input.isTeamEvent);
  const minTeam = isTeam ? Math.max(1, input.minTeamSize || 1) : 1;
  const maxTeam = isTeam ? Math.max(minTeam, input.maxTeamSize || 1) : 1;

  if (mode === "DB") {
    await syncSeedEventsToDatabase();

    // Check slug uniqueness
    const existing = await prisma.event.findUnique({
      where: { slug },
    });
    if (existing) {
      slug = `${slug}-${crypto.randomBytes(2).toString("hex")}`;
    }

    const created = await prisma.event.create({
      data: {
        slug,
        title: input.title.trim(),
        tagline: input.tagline.trim(),
        description: input.description.trim(),
        category: input.category,
        format: input.format,
        location: input.location.trim(),
        city: input.city.trim(),
        venue: input.venue?.trim() || null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        registrationDeadline: new Date(input.registrationDeadline),
        capacity: input.capacity,
        registeredCount: 0,
        isTeamEvent: isTeam,
        minTeamSize: minTeam,
        maxTeamSize: maxTeam,
        eligibility: input.eligibility?.trim() || "Open to all enrolled students with valid student ID.",
        tags: input.tags || [],
        prizes: input.prizes || [],
        published: input.published ?? true,
        isClosed: input.isClosed ?? false,
        bannerGradient: input.bannerGradient || "from-blue-600 via-indigo-600 to-purple-700",
        imageUrl: input.imageUrl?.trim() || null,
        organizerId: organizerUser.id,
        organizerName: organizerUser.name,
        organizerOrg: organizerUser.organization || "Independent Organizer",
        organizerEmail: organizerUser.email,
      },
    });

    const domainStatus = computeDomainStatus({
      published: created.published,
      isClosed: created.isClosed,
      registrationDeadline: created.registrationDeadline,
      endDate: created.endDate,
    });

    return {
      id: created.id,
      slug: created.slug,
      title: created.title,
      tagline: created.tagline,
      category: created.category as any,
      format: created.format as any,
      location: created.location,
      city: created.city,
      venue: created.venue,
      startDate: created.startDate.toISOString(),
      endDate: created.endDate.toISOString(),
      registrationDeadline: created.registrationDeadline.toISOString(),
      capacity: created.capacity,
      registeredCount: 0,
      availableSpots: created.capacity,
      isTeamEvent: created.isTeamEvent,
      minTeamSize: created.minTeamSize,
      maxTeamSize: created.maxTeamSize,
      eligibility: created.eligibility,
      published: created.published,
      isClosed: created.isClosed,
      domainStatus,
      confirmedCount: 0,
      waitlistedCount: 0,
      cancelledCount: 0,
      teamRegistrationCount: 0,
      bannerGradient: created.bannerGradient,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  // Fallback
  const id = `evt_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date();
  const domainStatus = computeDomainStatus({
    published: input.published ?? true,
    isClosed: input.isClosed ?? false,
    registrationDeadline: input.registrationDeadline,
    endDate: input.endDate,
  });

  const eventItem: OrganizerEventSummary = {
    id,
    slug,
    title: input.title.trim(),
    tagline: input.tagline.trim(),
    category: input.category,
    format: input.format,
    location: input.location.trim(),
    city: input.city.trim(),
    venue: input.venue?.trim() || null,
    startDate: input.startDate,
    endDate: input.endDate,
    registrationDeadline: input.registrationDeadline,
    capacity: input.capacity,
    registeredCount: 0,
    availableSpots: input.capacity,
    isTeamEvent: isTeam,
    minTeamSize: minTeam,
    maxTeamSize: maxTeam,
    eligibility: input.eligibility || "Open to all enrolled students with valid student ID.",
    published: input.published ?? true,
    isClosed: input.isClosed ?? false,
    domainStatus,
    confirmedCount: 0,
    waitlistedCount: 0,
    cancelledCount: 0,
    teamRegistrationCount: 0,
    bannerGradient: input.bannerGradient || "from-blue-600 via-indigo-600 to-purple-700",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  inMemoryOrganizerEvents.set(id, {
    ...eventItem,
    organizerId: organizerUser.id,
    organizerName: organizerUser.name,
    organizerOrg: organizerUser.organization || "Independent Organizer",
    organizerEmail: organizerUser.email,
  });

  return eventItem;
}

/**
 * Updates an event, ensuring strict capacity floor protection and ownership
 */
export async function updateOrganizerEvent(
  eventIdOrSlug: string,
  organizerUserId: string,
  userRole: string,
  input: UpdateEventInput
): Promise<OrganizerEventSummary> {
  const existingEvent = await verifyEventOwnership(eventIdOrSlug, organizerUserId, userRole);

  // Safety rule: Capacity reductions below confirmed occupancy are rejected
  if (input.capacity !== undefined && input.capacity < existingEvent.registeredCount) {
    throw new Error(
      `Cannot reduce event capacity to ${input.capacity}. Current confirmed attendance is ${existingEvent.registeredCount}.`
    );
  }

  const mode = await getPersistenceMode();

  if (mode === "DB") {
    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.tagline !== undefined) updateData.tagline = input.tagline.trim();
    if (input.description !== undefined) updateData.description = input.description.trim();
    if (input.category !== undefined) updateData.category = input.category;
    if (input.format !== undefined) updateData.format = input.format;
    if (input.location !== undefined) updateData.location = input.location.trim();
    if (input.city !== undefined) updateData.city = input.city.trim();
    if (input.venue !== undefined) updateData.venue = input.venue?.trim() || null;
    if (input.startDate !== undefined) updateData.startDate = new Date(input.startDate);
    if (input.endDate !== undefined) updateData.endDate = new Date(input.endDate);
    if (input.registrationDeadline !== undefined)
      updateData.registrationDeadline = new Date(input.registrationDeadline);
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.isTeamEvent !== undefined) {
      updateData.isTeamEvent = input.isTeamEvent;
      if (!input.isTeamEvent) {
        updateData.minTeamSize = 1;
        updateData.maxTeamSize = 1;
      }
    }
    if (input.minTeamSize !== undefined) updateData.minTeamSize = input.minTeamSize;
    if (input.maxTeamSize !== undefined) updateData.maxTeamSize = input.maxTeamSize;
    if (input.eligibility !== undefined) updateData.eligibility = input.eligibility.trim();
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.prizes !== undefined) updateData.prizes = input.prizes;
    if (input.published !== undefined) updateData.published = input.published;
    if (input.isClosed !== undefined) updateData.isClosed = input.isClosed;
    if (input.bannerGradient !== undefined) updateData.bannerGradient = input.bannerGradient;
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl?.trim() || null;

    const updated = await prisma.event.update({
      where: { id: existingEvent.id },
      data: updateData,
      include: { registrations: true },
    });

    const confirmed = updated.registrations.filter((r) => r.status === "CONFIRMED");
    const waitlisted = updated.registrations.filter((r) => r.status === "WAITLISTED");
    const cancelled = updated.registrations.filter((r) => r.status === "CANCELLED");
    const teamRegs = updated.registrations.filter((r) => r.type === "TEAM" && r.status === "CONFIRMED");

    const domainStatus = computeDomainStatus({
      published: updated.published,
      isClosed: updated.isClosed,
      registrationDeadline: updated.registrationDeadline,
      endDate: updated.endDate,
    });

    return {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      tagline: updated.tagline,
      category: updated.category as any,
      format: updated.format as any,
      location: updated.location,
      city: updated.city,
      venue: updated.venue,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      registrationDeadline: updated.registrationDeadline.toISOString(),
      capacity: updated.capacity,
      registeredCount: updated.registeredCount,
      availableSpots: Math.max(0, updated.capacity - updated.registeredCount),
      isTeamEvent: updated.isTeamEvent,
      minTeamSize: updated.minTeamSize,
      maxTeamSize: updated.maxTeamSize,
      eligibility: updated.eligibility,
      published: updated.published,
      isClosed: updated.isClosed,
      domainStatus,
      confirmedCount: confirmed.length,
      waitlistedCount: waitlisted.length,
      cancelledCount: cancelled.length,
      teamRegistrationCount: teamRegs.length,
      bannerGradient: updated.bannerGradient,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // Fallback
  Object.assign(existingEvent, input, { updatedAt: new Date().toISOString() });
  return existingEvent;
}

/**
 * Toggles publication state (Draft vs Published)
 */
export async function togglePublishEvent(
  eventIdOrSlug: string,
  organizerUserId: string,
  userRole: string,
  published: boolean
): Promise<{ success: boolean; published: boolean }> {
  const event = await verifyEventOwnership(eventIdOrSlug, organizerUserId, userRole);
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    await prisma.event.update({
      where: { id: event.id },
      data: { published },
    });
    return { success: true, published };
  }

  event.published = published;
  return { success: true, published };
}

/**
 * Toggles manual registration closure
 */
export async function toggleCloseEvent(
  eventIdOrSlug: string,
  organizerUserId: string,
  userRole: string,
  isClosed: boolean
): Promise<{ success: boolean; isClosed: boolean }> {
  const event = await verifyEventOwnership(eventIdOrSlug, organizerUserId, userRole);
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    await prisma.event.update({
      where: { id: event.id },
      data: { isClosed },
    });
    return { success: true, isClosed };
  }

  event.isClosed = isClosed;
  return { success: true, isClosed };
}

/**
 * Retrieves the attendee roster for an event with strict ownership verification
 */
export async function getOrganizerEventRegistrations(
  eventIdOrSlug: string,
  organizerUserId: string,
  userRole: string,
  filter?: { status?: string; type?: string; query?: string }
): Promise<{ event: OrganizerEventSummary; attendees: OrganizerAttendeeItem[] }> {
  const event = await verifyEventOwnership(eventIdOrSlug, organizerUserId, userRole);
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    const whereClause: any = { eventId: event.id };
    if (filter?.status && filter.status !== "ALL") {
      whereClause.status = filter.status;
    }
    if (filter?.type && filter.type !== "ALL") {
      whereClause.type = filter.type;
    }

    const registrations = await prisma.registration.findMany({
      where: whereClause,
      include: {
        user: true,
        team: {
          include: {
            members: { include: { user: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let attendees: OrganizerAttendeeItem[] = registrations.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      type: r.type as any,
      status: r.status as any,
      spots: r.spots,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        username: r.user.username,
        name: r.user.name,
        email: r.user.email,
        college: r.user.college,
      },
      team: r.team
        ? {
            id: r.team.id,
            name: r.team.name,
            slug: r.team.slug,
            members: r.team.members.map((m) => ({
              userId: m.userId,
              username: m.user.username,
              name: m.user.name,
              role: m.role,
            })),
          }
        : null,
    }));

    // Text search filter
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      attendees = attendees.filter(
        (a) =>
          a.user.name.toLowerCase().includes(q) ||
          a.user.username.toLowerCase().includes(q) ||
          a.user.email.toLowerCase().includes(q) ||
          (a.team && a.team.name.toLowerCase().includes(q))
      );
    }

    const domainStatus = computeDomainStatus({
      published: event.published,
      isClosed: event.isClosed,
      registrationDeadline: event.registrationDeadline,
      endDate: event.endDate,
    });

    const eventSummary: OrganizerEventSummary = {
      id: event.id,
      slug: event.slug,
      title: event.title,
      tagline: event.tagline,
      category: event.category,
      format: event.format,
      location: event.location,
      city: event.city,
      venue: event.venue,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      registrationDeadline: event.registrationDeadline.toISOString(),
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
      confirmedCount: attendees.filter((a) => a.status === "CONFIRMED").length,
      waitlistedCount: attendees.filter((a) => a.status === "WAITLISTED").length,
      cancelledCount: attendees.filter((a) => a.status === "CANCELLED").length,
      teamRegistrationCount: attendees.filter((a) => a.type === "TEAM" && a.status === "CONFIRMED").length,
      bannerGradient: event.bannerGradient,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };

    return { event: eventSummary, attendees };
  }

  // Fallback
  return {
    event,
    attendees: [],
  };
}

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates an authorized CSV export of event registrations, omitting all passwords and tokens
 */
export async function exportOrganizerRegistrationsCsv(
  eventIdOrSlug: string,
  organizerUserId: string,
  userRole: string
): Promise<{ filename: string; csv: string }> {
  const { event, attendees } = await getOrganizerEventRegistrations(
    eventIdOrSlug,
    organizerUserId,
    userRole
  );

  const headers = [
    "Registration ID",
    "Participation Type",
    "Status",
    "Attendee Name",
    "Username",
    "Email",
    "College",
    "Team Name",
    "Team Members",
    "Spots Reserved",
    "Registered At",
    "Notes",
  ];

  const rows = attendees.map((a) => {
    const teamMembersStr = a.team
      ? a.team.members.map((m) => `${m.name} (@${m.username}, ${m.role})`).join("; ")
      : "N/A";

    return [
      escapeCsvField(a.id),
      escapeCsvField(a.type),
      escapeCsvField(a.status),
      escapeCsvField(a.user.name),
      escapeCsvField(a.user.username),
      escapeCsvField(a.user.email),
      escapeCsvField(a.user.college || "N/A"),
      escapeCsvField(a.team?.name || "N/A"),
      escapeCsvField(teamMembersStr),
      escapeCsvField(a.spots),
      escapeCsvField(new Date(a.createdAt).toLocaleString("en-US")),
      escapeCsvField(a.notes || ""),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const filename = `${event.slug}-attendees-${new Date().toISOString().slice(0, 10)}.csv`;

  return { filename, csv: csvContent };
}
