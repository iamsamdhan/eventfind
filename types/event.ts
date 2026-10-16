export type EventCategory = 'HACKATHON' | 'WORKSHOP' | 'FEST' | 'COMPETITION';

export type EventFormat = 'ONLINE' | 'IN_PERSON' | 'HYBRID';

export type EventSortOption = 'upcoming' | 'deadline' | 'popular' | 'newest';

export interface EventOrganizer {
  id: string;
  name: string;
  organization: string;
  contactEmail: string;
  avatarUrl?: string;
}

export interface EventScheduleItem {
  time: string;
  title: string;
  description?: string;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: EventCategory;
  format: EventFormat;
  location: string;
  city: string;
  venue?: string;
  startDate: string; // ISO format
  endDate: string; // ISO format
  registrationDeadline: string; // ISO format
  capacity: number;
  registeredCount: number;
  isTeamEvent: boolean;
  minTeamSize: number;
  maxTeamSize: number;
  eligibility: string;
  prizes?: string[];
  schedule?: EventScheduleItem[];
  tags: string[];
  organizer: EventOrganizer;
  featured: boolean;
  published: boolean;
  isClosed?: boolean;
  bannerGradient: string;
  imageUrl?: string;
}

export interface EventFilterParams {
  query?: string;
  category?: EventCategory | 'ALL';
  format?: EventFormat | 'ALL';
  location?: string;
  sortBy?: EventSortOption;
}

