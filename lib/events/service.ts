import { SEED_EVENTS } from "./data";
import { EventItem, EventFilterParams, EventCategory } from "@/types/event";
import { prisma } from "@/lib/db/prisma";
import { checkDatabaseAvailability } from "@/lib/auth/store";
import { syncSeedEventsToDatabase, getDbEventBySlugOrId } from "./sync";

/**
 * EventFind Event Data Access Service
 * 
 * Provides an asynchronous data-access interface for public event discovery,
 * backed by PostgreSQL via Prisma with graceful development fallback.
 */

export async function getEvents(params: EventFilterParams = {}): Promise<{
  events: EventItem[];
  total: number;
}> {
  let allEvents: EventItem[] = [];

  const isDb = await checkDatabaseAvailability();
  if (isDb) {
    try {
      await syncSeedEventsToDatabase();
      const dbEvents = await prisma.event.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
      });

      allEvents = dbEvents.map((ev) => ({
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
      }));
    } catch {
      allEvents = [...SEED_EVENTS].filter((e) => e.published);
    }
  } else {
    allEvents = [...SEED_EVENTS].filter((e) => e.published);
  }

  let filtered = allEvents;

  // 1. Text search (title, tagline, description, location, city, tags, organizer)
  if (params.query && params.query.trim() !== "") {
    const q = params.query.toLowerCase().trim();
    filtered = filtered.filter(
      (event) =>
        event.title.toLowerCase().includes(q) ||
        event.tagline.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        event.location.toLowerCase().includes(q) ||
        event.city.toLowerCase().includes(q) ||
        event.organizer.organization.toLowerCase().includes(q) ||
        event.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  // 2. Category filter
  if (params.category && params.category !== "ALL") {
    filtered = filtered.filter((event) => event.category === params.category);
  }

  // 3. Format filter
  if (params.format && params.format !== "ALL") {
    filtered = filtered.filter((event) => event.format === params.format);
  }

  // 4. Location filter
  if (params.location && params.location !== "ALL" && params.location.trim() !== "") {
    const loc = params.location.toLowerCase();
    filtered = filtered.filter(
      (event) =>
        event.location.toLowerCase().includes(loc) ||
        event.city.toLowerCase().includes(loc)
    );
  }

  // 5. Sorting
  const sortBy = params.sortBy || "upcoming";
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "deadline":
        return new Date(a.registrationDeadline).getTime() - new Date(b.registrationDeadline).getTime();
      case "popular":
        return b.registeredCount / b.capacity - a.registeredCount / a.capacity;
      case "newest":
        return b.id.localeCompare(a.id);
      case "upcoming":
      default:
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    }
  });

  return {
    events: filtered,
    total: filtered.length,
  };
}

export async function getEventBySlugOrId(idOrSlug: string): Promise<EventItem | null> {
  return await getDbEventBySlugOrId(idOrSlug);
}

export async function getFeaturedEvents(): Promise<EventItem[]> {
  const { events } = await getEvents();
  return events.filter((e) => e.featured);
}

export function getEventCategoryMeta() {
  const categories: { category: EventCategory; label: string; count: number }[] = [
    { category: "HACKATHON", label: "Hackathons", count: SEED_EVENTS.filter((e) => e.category === "HACKATHON").length },
    { category: "WORKSHOP", label: "Workshops", count: SEED_EVENTS.filter((e) => e.category === "WORKSHOP").length },
    { category: "FEST", label: "College Fests", count: SEED_EVENTS.filter((e) => e.category === "FEST").length },
    { category: "COMPETITION", label: "Competitions", count: SEED_EVENTS.filter((e) => e.category === "COMPETITION").length },
  ];
  return categories;
}

export function getUniqueLocations(): string[] {
  const cities = new Set<string>();
  SEED_EVENTS.forEach((e) => {
    if (e.city) cities.add(e.city);
  });
  return Array.from(cities).sort();
}
