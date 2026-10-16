export type UserRole = "STUDENT" | "ORGANIZER" | "ADMIN";

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  bio?: string | null;
  avatarUrl?: string | null;
  college?: string | null;
  organization?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecord extends SafeUser {
  passwordHash: string;
}

export interface SessionRecord {
  id: string;
  sessionToken: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthResult {
  success: boolean;
  user?: SafeUser;
  error?: string;
  redirectTo?: string;
}

