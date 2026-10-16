import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { SafeUser, UserRecord, SessionRecord, UserRole } from "@/types/auth";

export class AuthPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthPersistenceError";
  }
}

/**
 * Computes a secure SHA-256 hash of a raw session token.
 * Raw session tokens are never stored at rest in the database or session store.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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

// In-process fallback store: permitted ONLY in non-production environments when database credentials are not supplied
const inMemoryUsers: Map<string, UserRecord> = new Map();
// Keyed by tokenHash (SHA-256) to ensure raw tokens are never stored at rest even in test memory
const inMemorySessions: Map<string, SessionRecord> = new Map();

// Seed initial test accounts (Password: "Password123!")
const DEFAULT_HASH = "$2b$10$9dIdTqj1JMYsF41FGNMM.uxekmpa5boe2gz83sxeFEzgWNBpPMPWG";

function initializeTestStore() {
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

/**
 * Checks whether the environment permits the non-production fallback store.
 * In production, this ALWAYS returns false unless explicit test flag ALLOW_TEST_AUTH_STORE is set.
 */
export function isFallbackPermitted(): boolean {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_AUTH_STORE !== "true") {
    return false;
  }
  return true;
}

let databaseAvailable: boolean | null = null;

export async function checkDatabaseAvailability(): Promise<boolean> {
  if (databaseAvailable !== null) return databaseAvailable;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseAvailable = true;
    console.log("[AuthStore] Successfully connected to PostgreSQL via Prisma.");
    return true;
  } catch (err: unknown) {
    databaseAvailable = false;
    const msg = err instanceof Error ? err.message : String(err);

    if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_AUTH_STORE !== "true") {
      console.error(`[AuthStore] FATAL: PostgreSQL unavailable in production: ${msg}`);
      throw new AuthPersistenceError(
        "PostgreSQL connection failure in production. In-memory authentication fallback is strictly prohibited."
      );
    }

    console.warn(`[AuthStore] PostgreSQL not accessible (${msg.slice(0, 60)}...). Operating in development/test fallback mode.`);
    initializeTestStore();
    return false;
  }
}

/**
 * Enforces fail-closed policy in production if DB is not available
 */
async function getPersistenceMode(): Promise<"DB" | "FALLBACK"> {
  const isDb = await checkDatabaseAvailability();
  if (isDb) return "DB";

  if (!isFallbackPermitted()) {
    throw new AuthPersistenceError(
      "Database persistence failure. In-memory fallback is disabled in production."
    );
  }

  return "FALLBACK";
}

/**
 * Finds user by email or username
 */
export async function findUserByIdentifier(identifier: string): Promise<UserRecord | null> {
  const norm = identifier.trim().toLowerCase();
  const mode = await getPersistenceMode();

  if (mode === "DB") {
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
      return null;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Database query failed during user lookup in production.");
      }
      // Non-production fallback only
    }
  }

  // Development / Test store
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
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toSafeUser(user) : null;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Database query failed during user lookup in production.");
      }
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
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const user = await prisma.user.findUnique({ where: { email: norm } });
      return user ? toSafeUser(user) : null;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Database query failed during email lookup in production.");
      }
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
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const user = await prisma.user.findUnique({ where: { username: norm } });
      return user ? toSafeUser(user) : null;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Database query failed during username lookup in production.");
      }
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
  const mode = await getPersistenceMode();

  if (mode === "DB") {
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
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to persist user to PostgreSQL database in production.");
      }
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
 * Strictly prevents role and email escalation.
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
  const mode = await getPersistenceMode();

  if (mode === "DB") {
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
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to update profile in PostgreSQL database in production.");
      }
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
 * Creates and persists a session.
 * Stores the SHA-256 hash of the session token in the database/store.
 * Returns the raw token to be set in the client's HTTP-only cookie.
 */
export async function createSession(userId: string, expiresAt: Date): Promise<SessionRecord> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const session = await prisma.session.create({
        data: {
          sessionToken: tokenHash, // Store SHA-256 hash at rest!
          userId,
          expiresAt,
        },
      });
      return {
        id: session.id,
        sessionToken: rawToken, // Return raw token for the client cookie
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      };
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Failed to persist session in PostgreSQL database in production.");
      }
    }
  }

  const id = `sess_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const newSession: SessionRecord = {
    id,
    sessionToken: rawToken, // Raw token
    userId,
    expiresAt,
    createdAt: new Date(),
  };

  // Store in memory keyed by SHA-256 hash so raw token is not retained at rest
  inMemorySessions.set(tokenHash, newSession);
  return newSession;
}

/**
 * Finds session by raw token.
 * Computes SHA-256 hash to query the database, then verifies expiration.
 */
export async function findSession(rawToken: string): Promise<{ session: SessionRecord; user: SafeUser } | null> {
  if (!rawToken || typeof rawToken !== "string") return null;

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      const session = await prisma.session.findUnique({
        where: { sessionToken: tokenHash },
        include: { user: true },
      });

      if (session && session.expiresAt > now) {
        return {
          session: {
            id: session.id,
            sessionToken: rawToken,
            userId: session.userId,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
          },
          user: toSafeUser(session.user),
        };
      } else if (session) {
        // Expired, delete immediately
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        return null;
      }
      return null;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new AuthPersistenceError("Session lookup failed in PostgreSQL database in production.");
      }
    }
  }

  const session = inMemorySessions.get(tokenHash);
  if (!session) return null;

  if (session.expiresAt <= now) {
    inMemorySessions.delete(tokenHash);
    return null;
  }

  const user = inMemoryUsers.get(session.userId);
  if (!user) {
    inMemorySessions.delete(tokenHash);
    return null;
  }

  return {
    session,
    user: toSafeUser(user),
  };
}

/**
 * Invalidates and deletes a session in the database/store by its raw token
 */
export async function deleteSession(rawToken: string): Promise<boolean> {
  if (!rawToken || typeof rawToken !== "string") return false;

  const tokenHash = hashSessionToken(rawToken);
  const mode = await getPersistenceMode();

  if (mode === "DB") {
    try {
      await prisma.session.delete({ where: { sessionToken: tokenHash } });
      return true;
    } catch {
      return false;
    }
  }

  return inMemorySessions.delete(tokenHash);
}

/**
 * Utility for automated testing to reset the in-memory store
 */
export function __resetTestStore() {
  if (process.env.NODE_ENV === "production") {
    throw new AuthPersistenceError("Resetting store is prohibited in production.");
  }
  inMemoryUsers.clear();
  inMemorySessions.clear();
  initializeTestStore();
}
