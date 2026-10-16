import { SEED_EVENTS } from './data';
import { EventItem, EventFilterParams, EventCategory } from '@/types/event';

/**
 * EventFind Event Data Access Service
 * 
 * Provides an asynchronous data-access interface for public event discovery.
 * Designed to seamlessly transition to Prisma ORM + PostgreSQL in Stage 5/6
 * without changing calling component signatures.
 */

export async function getEvents(params: EventFilterParams = {}): Promise<{
  events: EventItem[];
  total: number;
}> {
  // Simulate standard async data resolution
  await new Promise(resolve => setTimeout(resolve, 50));

  let filtered = [...SEED_EVENTS].filter(e => e.published);

  // 1. Text search (title, tagline, description, location, city, tags, organizer)
  if (params.query && params.query.trim() !== '') {
    const q = params.query.toLowerCase().trim();
    filtered = filtered.filter(event => 
      event.title.toLowerCase().includes(q) ||
      event.tagline.toLowerCase().includes(q) ||
      event.description.toLowerCase().includes(q) ||
      event.location.toLowerCase().includes(q) ||
      event.city.toLowerCase().includes(q) ||
      event.organizer.organization.toLowerCase().includes(q) ||
      event.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  // 2. Category filter
  if (params.category && params.category !== 'ALL') {
    filtered = filtered.filter(event => event.category === params.category);
  }

  // 3. Format filter
  if (params.format && params.format !== 'ALL') {
    filtered = filtered.filter(event => event.format === params.format);
  }

  // 4. Location filter
  if (params.location && params.location !== 'ALL' && params.location.trim() !== '') {
    const loc = params.location.toLowerCase();
    filtered = filtered.filter(event => 
      event.location.toLowerCase().includes(loc) ||
      event.city.toLowerCase().includes(loc)
    );
  }

  // 5. Sorting
  const sortBy = params.sortBy || 'upcoming';
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'deadline':
        return new Date(a.registrationDeadline).getTime() - new Date(b.registrationDeadline).getTime();
      case 'popular':
        return (b.registeredCount / b.capacity) - (a.registeredCount / a.capacity);
      case 'newest':
        return b.id.localeCompare(a.id);
      case 'upcoming':
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
  await new Promise(resolve => setTimeout(resolve, 30));
  const normalized = idOrSlug.toLowerCase().trim();
  const event = SEED_EVENTS.find(e => 
    e.id.toLowerCase() === normalized || 
    e.slug.toLowerCase() === normalized
  );
  return event || null;
}

export async function getFeaturedEvents(): Promise<EventItem[]> {
  await new Promise(resolve => setTimeout(resolve, 30));
  return SEED_EVENTS.filter(e => e.published && e.featured);
}

export function getEventCategoryMeta() {
  const categories: { category: EventCategory; label: string; count: number }[] = [
    { category: 'HACKATHON', label: 'Hackathons', count: SEED_EVENTS.filter(e => e.category === 'HACKATHON').length },
    { category: 'WORKSHOP', label: 'Workshops', count: SEED_EVENTS.filter(e => e.category === 'WORKSHOP').length },
    { category: 'FEST', label: 'College Fests', count: SEED_EVENTS.filter(e => e.category === 'FEST').length },
    { category: 'COMPETITION', label: 'Competitions', count: SEED_EVENTS.filter(e => e.category === 'COMPETITION').length },
  ];
  return categories;
}

export function getUniqueLocations(): string[] {
  const cities = new Set<string>();
  SEED_EVENTS.forEach(e => {
    if (e.city) cities.add(e.city);
  });
  return Array.from(cities).sort();
}

