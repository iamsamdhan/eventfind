import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SafeUser, UserRole } from "@/types/auth";
import { createSession, findSession, deleteSession } from "./store";

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "eventfind_session";
export const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS) || 7 * 24 * 60 * 60; // 7 days

/**
 * Returns the destination dashboard path for a trusted server-side user role
 */
export function getRoleDashboardUrl(role: UserRole): string {
  switch (role) {
    case "ORGANIZER":
      return "/organizer/dashboard";
    case "ADMIN":
      return "/organizer/dashboard";
    case "STUDENT":
    default:
      return "/explore";
  }
}

/**
 * Establishes an HTTP-only secure session cookie for a user
 */
export async function createAndSetUserSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const session = await createSession(userId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return session.sessionToken;
}

/**
 * Clears the session cookie and invalidates the session in the database
 */
export async function invalidateSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Retrieves the currently authenticated user from server session cookies
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) return null;

    const result = await findSession(sessionToken);
    return result ? result.user : null;
  } catch {
    return null;
  }
}

/**
 * Enforces authentication on server components / routes.
 * Redirects unauthenticated visitors to /login.
 */
export async function requireAuth(returnUrl?: string): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    const query = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : "";
    redirect(`/login${query}`);
  }
  return user;
}

/**
 * Enforces role-based authorization on server components / routes.
 * Redirects unauthorized users to their permitted dashboard.
 */
export async function requireRole(allowedRoles: UserRole[], returnUrl?: string): Promise<SafeUser> {
  const user = await requireAuth(returnUrl);

  if (!allowedRoles.includes(user.role)) {
    // Redirect to the dashboard appropriate for their actual role
    redirect(getRoleDashboardUrl(user.role));
  }

  return user;
}

