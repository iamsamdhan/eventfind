import { prisma } from "@/lib/db/prisma";
import { SEED_EVENTS } from "./data";
import { EventItem } from "@/types/event";
import { checkDatabaseAvailability } from "@/lib/auth/store";

let eventsSynced = false;

/**
 * Ensures baseline development seed events are populated in PostgreSQL
 * during non-production testing or when explicitly enabled.
 * In production, mock records are prevented from polluting a fresh database,
 * and existing database events are never overwritten.
 */
export async function syncSeedEventsToDatabase(): Promise<void> {
  if (eventsSynced) return;

  // In production, prevent injecting development seed mock records into the live database
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_SEED_EVENTS !== "true") {
    eventsSynced = true;
    return;
  }

  const isDb = await checkDatabaseAvailability();
  if (!isDb) return;

  try {
    for (const seed of SEED_EVENTS) {
      await prisma.event.upsert({
        where: { slug: seed.slug },
        create: {
          id: seed.id,
          slug: seed.slug,
          title: seed.title,
          tagline: seed.tagline,
          description: seed.description,
          category: seed.category as any,
          format: seed.format as any,
          location: seed.location,
          city: seed.city,
          venue: seed.venue || null,
          startDate: new Date(seed.startDate),
          endDate: new Date(seed.endDate),
          registrationDeadline: new Date(seed.registrationDeadline),
          capacity: seed.capacity,
          registeredCount: seed.registeredCount,
          isTeamEvent: seed.isTeamEvent,
          minTeamSize: seed.minTeamSize,
          maxTeamSize: seed.maxTeamSize,
          eligibility: seed.eligibility,
          tags: seed.tags,
          prizes: seed.prizes || [],
          featured: seed.featured,
          published: seed.published,
          bannerGradient: seed.bannerGradient,
          imageUrl: seed.imageUrl || null,
          organizerId: seed.organizer.id,
          organizerName: seed.organizer.name,
          organizerOrg: seed.organizer.organization,
          organizerEmail: seed.organizer.contactEmail,
        },
        update: {}, // Never overwrite organizer-managed event data in the database
      });
    }

    eventsSynced = true;
  } catch (err) {
    console.warn("Could not sync seed events to database:", err);
  }
}

/**
 * Looks up an event from PostgreSQL or seed fallback
 */
export async function getDbEventBySlugOrId(idOrSlug: string): Promise<EventItem | null> {
  const isDb = await checkDatabaseAvailability();
  if (isDb) {
    await syncSeedEventsToDatabase();
    try {
      const ev = await prisma.event.findFirst({
        where: {
          OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        },
      });

      if (ev) {
        return {
          id: ev.id,
          slug: ev.slug,
          title: ev.title,
          tagline: ev.tagline,
          description: ev.description,
          category: ev.category as any,
          format: ev.format as any,
          location: ev.location,
          city: ev.city,
          venue: ev.venue || undefined,
          startDate: ev.startDate.toISOString(),
          endDate: ev.endDate.toISOString(),
          registrationDeadline: ev.registrationDeadline.toISOString(),
          capacity: ev.capacity,
          registeredCount: ev.registeredCount,
          isTeamEvent: ev.isTeamEvent,
          minTeamSize: ev.minTeamSize,
          maxTeamSize: ev.maxTeamSize,
          eligibility: ev.eligibility,
          tags: ev.tags,
          prizes: ev.prizes,
          featured: ev.featured,
          published: ev.published,
          isClosed: ev.isClosed,
          bannerGradient: ev.bannerGradient,
          imageUrl: ev.imageUrl || undefined,
          organizer: {
            id: ev.organizerId || "org_default",
            name: ev.organizerName,
            organization: ev.organizerOrg,
            contactEmail: ev.organizerEmail,
          },
        };
      }
    } catch {
      // Fallback below
    }
  }

  // In production, an event not found in the database does not exist
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  // Non-production fallback to static seed for local development/testing
  const normalized = idOrSlug.toLowerCase().trim();
  const found = SEED_EVENTS.find(
    (e) => e.id.toLowerCase() === normalized || e.slug.toLowerCase() === normalized
  );
  return found || null;
}
