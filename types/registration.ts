export type RegistrationType = "INDIVIDUAL" | "TEAM";

export type RegistrationStatus = "CONFIRMED" | "CANCELLED" | "WAITLISTED";

export interface RegistrationEventSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  format: string;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  capacity: number;
  registeredCount: number;
  isTeamEvent: boolean;
  minTeamSize: number;
  maxTeamSize: number;
}

export interface RegistrationUserSummary {
  id: string;
  username: string;
  name: string;
  email: string;
  college?: string | null;
}

export interface RegistrationTeamMemberSummary {
  userId: string;
  username: string;
  name: string;
  role: string;
}

export interface RegistrationTeamSummary {
  id: string;
  name: string;
  slug: string;
  members: RegistrationTeamMemberSummary[];
}

export interface RegistrationItem {
  id: string;
  eventId: string;
  event: RegistrationEventSummary;
  userId: string;
  user: RegistrationUserSummary;
  teamId?: string | null;
  team?: RegistrationTeamSummary | null;
  type: RegistrationType;
  status: RegistrationStatus;
  spots: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterEventInput {
  eventId: string;
  type: RegistrationType;
  teamId?: string;
  notes?: string;
}
