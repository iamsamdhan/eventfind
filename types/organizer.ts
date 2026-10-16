import { EventCategory, EventFormat } from "@/types/event";
import { RegistrationType, RegistrationStatus } from "@/types/registration";

export type EventDomainStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "COMPLETED";

export interface OrganizerEventSummary {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: EventCategory;
  format: EventFormat;
  location: string;
  city: string;
  venue?: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  capacity: number;
  registeredCount: number;
  availableSpots: number;
  isTeamEvent: boolean;
  minTeamSize: number;
  maxTeamSize: number;
  eligibility: string;
  published: boolean;
  isClosed: boolean;
  domainStatus: EventDomainStatus;
  confirmedCount: number;
  waitlistedCount: number;
  cancelledCount: number;
  teamRegistrationCount: number;
  bannerGradient: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizerDashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalAttendees: number;
  totalTeams: number;
}

export interface OrganizerDashboardData {
  events: OrganizerEventSummary[];
  stats: OrganizerDashboardStats;
}

export interface CreateEventInput {
  title: string;
  slug?: string;
  tagline: string;
  description: string;
  category: EventCategory;
  format: EventFormat;
  location: string;
  city: string;
  venue?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  capacity: number;
  isTeamEvent?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  eligibility?: string;
  tags?: string[];
  prizes?: string[];
  published?: boolean;
  isClosed?: boolean;
  bannerGradient?: string;
  imageUrl?: string;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export interface OrganizerAttendeeMember {
  userId: string;
  username: string;
  name: string;
  role: string;
}

export interface OrganizerAttendeeItem {
  id: string;
  eventId: string;
  type: RegistrationType;
  status: RegistrationStatus;
  spots: number;
  notes?: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    college?: string | null;
  };
  team?: {
    id: string;
    name: string;
    slug: string;
    members: OrganizerAttendeeMember[];
  } | null;
}
