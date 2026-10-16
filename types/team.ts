export type TeamRole = "LEADER" | "MEMBER";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";

export interface TeamMemberUser {
  id: string;
  username: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  college?: string | null;
}

export interface TeamMemberItem {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  user: TeamMemberUser;
}

export interface TeamInvitationItem {
  id: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  inviterId: string;
  inviter: {
    id: string;
    username: string;
    name: string;
  };
  inviteeId: string;
  invitee: {
    id: string;
    username: string;
    name: string;
    email: string;
  };
  status: InvitationStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface TeamEventSummary {
  id: string;
  slug: string;
  title: string;
  minTeamSize: number;
  maxTeamSize: number;
}

export interface TeamItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  creatorId: string;
  eventId?: string | null;
  event?: TeamEventSummary | null;
  members: TeamMemberItem[];
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  eventId?: string;
}

export interface InviteMemberInput {
  teamId: string;
  username: string;
}

