import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { SafeUser, UserRecord, SessionRecord, UserRole } from "@/types/auth";
import { hashPassword } from "./password";

/**
 * Strips sensitive fields (like passwordHash) from a user record
 */
export function toSafeUser(user: UserRecord | { 
  id: string; 
  username: string; 
  email: string; 
  name: string; 
  role: string; 
  bio?: string | null; 
  avatarUrl?: string | null; 
  college?: string | null; 
  organization?: string | null; 
  createdAt: Date; 
  updatedAt: Date; 
}): SafeUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    bio: user.bio || null,
    avatarUrl: user.avatarUrl || null,
    college: user.college || null,
    organization: user.organization || null,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

// In-process fallback store for development/testing when PostgreSQL credentials are not configured
const inMemoryUsers: Map<string, UserRecord> = new Map();
const inMemorySessions: Map<string, SessionRecord> = new Map();

// Seed initial fallback accounts (Password: "Password123!")
const DEFAULT_HASH = "$2b$10$9dIdTqj1JMYsF41FGNMM.uxekmpa5boe2gz83sxeFEzgWNBpPMPWG"; // bcrypt for "Password123!"

function initializeSeedStore() {
  if (inMemoryUsers.size === 0) {
    const studentId = "usr_seed_student";
    inMemoryUsers.set(studentId, {
      id: studentId,
      username: "alex_student",
      email: "student@eventfind.dev",
      passwordHash: DEFAULT_HASH,
      name: "Alex Rivera",
      role: "STUDENT",
      bio: "Computer Science junior passionate about hackathons and AI systems.",
      college: "Metropolitan University",
      organization: null,
      avatarUrl: null,
      createdAt: new Date("2026-09-01T10:00:00Z"),
      updatedAt: new Date("2026-09-01T10:00:00Z"),
    });

    const organizerId = "usr_seed_organizer";
    inMemoryUsers.set(organizerId, {
      id: organizerId,
      username: "elena_organizer",
      email: "organizer@eventfind.dev",
      passwordHash: DEFAULT_HASH,
      name: "Elena Rostova",
      role: "ORGANIZER",
      bio: "Lead organizer for collegiate hackathons and tech festivals.",
      college: null,
      organization: "HackPulse Tech Collective",
      avatarUrl: null,
      createdAt: new Date("2026-08-15T10:00:00Z"),
      updatedAt: new Date("2026-08-15T10:00:00Z"),
    });
  }
}

initializeSeedStore();

let databaseAvailable: boolean | null = null;

async function checkDatabaseAvailability(): Promise<boolean> {
  if (databaseAvailable !== null) return databaseAvailable;
  try {
    // Quick probe
    await prisma.$queryRaw`SELECT 1`;
    databaseAvailable = true;
    console.log("[AuthStore] Connected to PostgreSQL via Prisma.");
  } catch (err: unknown) {
    databaseAvailable = false;
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[AuthStore] PostgreSQL not accessible (${msg.slice(0, 80)}...). Operating in resilient fallback mode.`);
  }
  return databaseAvailable;
}

/**
 * Finds user by email or username
 */
export async function findUserByIdentifier(identifier: string): Promise<UserRecord | null> {
  const norm = identifier.trim().toLowerCase();
  const isDb = await checkDatabaseAvailability();

  if (isDb) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: norm, mode: "insensitive" } },
            { username: { equals: norm, mode: "insensitive" } },
          ],
        },
      });
      if (user) {
        return {
          ...toSafeUser(user),
          passwordHash: user.passwordHash,
        };
      }
    } catch {
      // Fallback
    }
  }

  // Fallback search
  for (const user of inMemoryUsers.values()) {
    if (user.email.toLowerCase() === norm || user.username.toLowerCase() === norm) {
      return user;
    }
  }

  return null;
}

/**
 * Finds user by ID
 */
export async function findUserById(id: string): Promise<SafeUser | null> {
  const isDb = await checkDatabaseAvailability();

  if (isDb) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user) return toSafeUser(user);
    } catch {
      // Fallback
    }
  }

  const user = inMemoryUsers.get(id);
  return user ? toSafeUser(user) : null;
}

/**
 * Finds user by email
 */
export async function findUserByEmail(email: string): Promise<SafeUser | null> {
  const norm = email.trim().toLowerCase();
  const isDb = await checkDatabaseAvailability();

  if (isDb) {
    try {
      const user = await prisma.user.findUnique({ where: { email: norm } });
      if (user) return toSafeUser(user);
    } catch {
      // Fallback
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.email.toLowerCase() === norm) {
      return toSafeUser(user);
    }
  }

  return null;
}

/**
 * Finds user by username
 */
export async function findUserByUsername(username: string): Promise<SafeUser | null> {
  const norm = username.trim().toLowerCase();
  const isDb = await checkDatabaseAvailability();

  if (isDb) {
    try {
      const user = await prisma.user.findUnique({ where: { username: norm } });
      if (user) return toSafeUser(user);
    } catch {
      // Fallback
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.username.toLowerCase() === norm) {
      return toSafeUser(user);
    }
  }

  return null;
}

/**
 * Creates a new user with hashed password
 */
export async function createUser(data: {
  username: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  college?: string | null;
  organization?: string | null;
}): Promise<SafeUser> {
  const normEmail = data.email.trim().toLowerCase();
  const normUsername = data.username.trim().toLowerCase();
  const isDb = await checkDatabaseAvailability();

  if (isDb) {
    try {
      const created = await prisma.user.create({
        data: {
          username: normUsername,
          email: normEmail,
          passwordHash: data.passwordHash,
          name: data.name.trim(),
          role: data.role,
          college: data.college?.trim() || null,
          organization: data.organization?.trim() || null,
        },
      });
      return toSafeUser(created);
    } catch {
      // Fallback if DB write fails
    }
  }

  const id = `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date();
  const newUser: UserRecord = {
    id,
    username: normUsername,
    email: normEmail,
    passwordHash: data.passwordHash,
    name: data.name.trim(),
    role: data.role,
    bio: null,
    avatarUrl: null,
    college: data.college?.trim() || null,
    organization: data.organization?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  inMemoryUsers.set(id, newUser);
  return toSafeUser(newUser);
}

/**
 * Updates a user's editable profile fields.
 * Strictly prevents role changes!
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    username?: string;
    bio?: string | null;
    college?: string | null;
    organization?: string | null;
  }
): Promise<SafeUser | null> {
  const isDb = await checkDatabaseAvailability();

  if (isDb) {
    try {
      const dataToUpdate: Record<string, unknown> = {};
      if (updates.name !== undefined) dataToUpdate.name = updates.name.trim();
      if (updates.username !== undefined) dataToUpdate.username = updates.username.trim().toLowerCase();
      if (updates.bio !== undefined) dataToUpdate.bio = updates.bio;
      if (updates.college !== undefined) dataToUpdate.college = updates.college;
      if (updates.organization !== undefined) dataToUpdate.organization = updates.organization;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });
      return toSafeUser(updated);
    } catch {
      // Fallback
    }
  }

  const existing = inMemoryUsers.get(userId);
  if (!existing) return null;

  const now = new Date();
  const updatedUser: UserRecord = {
    ...existing,
    name: updates.name !== undefined ? updates.name.trim() : existing.name,
    username: updates.username !== undefined ? updates.username.trim().toLowerCase() : existing.username,
    bio: updates.bio !== undefined ? updates.bio : existing.bio,
    college: updates.college !== undefined ? updates.college : existing.college,
    organization: updates.organization !== undefined ? updates.organization : existing.organization,
    updatedAt: now,
  };

  inMemoryUsers.set(userId, updatedUser);
  return toSafeUser(updatedUser);
}

/**
 * Creates and persists a session
 */
export async function createSession(userId: string, expiresAt: Date): Promise<SessionRecord> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const isDb = await checkDatabaseAvailability();

  if (isDb) {
    try {
      const session = await prisma.session.create({
        data: {
          sessionToken,
          userId,
          expiresAt,
        },
      });
      return {
        id: session.id,
        sessionToken: session.sessionToken,
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      };
    } catch {
      // Fallback
    }
  }

  const id = `sess_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const newSession: SessionRecord = {
    id,
    sessionToken,
    userId,
    expiresAt,
    createdAt: new Date(),
  };

  inMemorySessions.set(sessionToken, newSession);
  return newSession;
}

/**
 * Finds session by token and verifies it has not expired
 */
export async function findSession(sessionToken: string): Promise<{ session: SessionRecord; user: SafeUser } | null> {
  if (!sessionToken) return null;
  const now = new Date();
  const isDb = await checkDatabaseAvailability();

  if (isDb) {
    try {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (session && session.expiresAt > now) {
        return {
          session: {
            id: session.id,
            sessionToken: session.sessionToken,
            userId: session.userId,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
          },
          user: toSafeUser(session.user),
        };
      } else if (session) {
        // Expired, delete it
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        return null;
      }
    } catch {
      // Fallback
    }
  }

  const session = inMemorySessions.get(sessionToken);
  if (!session) return null;

  if (session.expiresAt <= now) {
    inMemorySessions.delete(sessionToken);
    return null;
  }

  const user = inMemoryUsers.get(session.userId);
  if (!user) {
    inMemorySessions.delete(sessionToken);
    return null;
  }

  return {
    session,
    user: toSafeUser(user),
  };
}

/**
 * Invalidates and deletes a session
 */
export async function deleteSession(sessionToken: string): Promise<boolean> {
  const isDb = await checkDatabaseAvailability();

  if (isDb) {
    try {
      await prisma.session.delete({ where: { sessionToken } });
      return true;
    } catch {
      // Fallback
    }
  }

  return inMemorySessions.delete(sessionToken);
}

