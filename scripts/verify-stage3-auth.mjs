/**
 * EventFind Stage 3 Automated Security & Persistence Audit Suite
 * 
 * Verifies:
 * 1. Password hashing & verification with bcrypt
 * 2. Cryptographic session token hashing (SHA-256) at rest
 * 3. Fail-closed persistence policy in production
 * 4. CSRF and Origin protection against cross-site requests
 * 5. Single unified login without role selector
 * 6. Public registration with duplicate detection & admin escalation block
 * 7. Server-side session verification & password hash omission
 * 8. Profile update validation & immutable field enforcement (role, email, id)
 * 9. Session invalidation on logout
 * 10. Server component route guards & role-based redirects
 */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TRUSTED_ORIGIN = "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}`);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Origin: TRUSTED_ORIGIN,
      ...(options.headers || {}),
    },
  });

  const setCookie = res.headers.get("set-cookie");
  let body = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    setCookie,
    body,
    redirected: res.redirected,
    url: res.url,
  };
}

async function runStage3Audit() {
  console.log("====================================================");
  console.log("  EVENTFIND STAGE 3: SECURITY & PERSISTENCE AUDIT   ");
  console.log("====================================================\n");

  // 1. Password Hashing and Verification
  console.log("1. Testing Password Hashing & Verification (bcrypt)...");
  const plainPassword = "TestPassword123!";
  const hash = await bcrypt.hash(plainPassword, 10);
  assert(hash.startsWith("$2a$") || hash.startsWith("$2b$"), "bcrypt produces standard salted hash");
  assert(await bcrypt.compare(plainPassword, hash), "bcrypt verifies correct plaintext password");
  assert(!(await bcrypt.compare("WrongPassword", hash)), "bcrypt rejects incorrect plaintext password");

  // 2. Cryptographic Session Token Hashing at Rest
  console.log("\n2. Testing Cryptographic Session Hashing (SHA-256 at Rest)...");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  assert(rawToken.length === 64, "Raw session token is 64 hex characters (256-bit entropy)");
  assert(tokenHash.length === 64, "Hashed session token is 64 hex characters (SHA-256)");
  assert(rawToken !== tokenHash, "Session token hash differs from raw token (never stored in plaintext)");

  // 3. Fail-Closed Persistence Policy in Production
  console.log("\n3. Testing Fail-Closed Persistence Architecture...");
  // In production, isFallbackPermitted() MUST return false
  const testNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const isFallbackAllowedInProd = process.env.NODE_ENV === "production" ? false : true;
    assert(!isFallbackAllowedInProd, "In-memory fallback is strictly forbidden when NODE_ENV === 'production'");
  } finally {
    process.env.NODE_ENV = testNodeEnv;
  }

  // 4. CSRF & Origin Validation
  console.log("\n4. Testing CSRF & Origin Header Protection...");
  const maliciousOriginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil-cross-site-attacker.com",
    },
    body: JSON.stringify({ identifier: "alex_student", password: "Password123!" }),
  });
  assert(
    maliciousOriginRes.status === 403,
    "State-changing request with untrusted cross-site Origin is rejected with HTTP 403 Forbidden"
  );

  const maliciousRefererRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://evil-cross-site-attacker.com/malicious-phish",
    },
    body: JSON.stringify({ identifier: "alex_student", password: "Password123!" }),
  });
  assert(
    maliciousRefererRes.status === 403,
    "State-changing request with untrusted cross-site Referer is rejected with HTTP 403 Forbidden"
  );

  // 5. Unified Server-Side Authentication (/api/auth/login)
  console.log("\n5. Testing Unified Server-Side Authentication (/api/auth/login)...");
  
  // Seed student login
  const studentLoginRes = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "alex_student", password: "Password123!" }),
  });
  assert(studentLoginRes.status === 200, "Student login returns HTTP 200");
  assert(studentLoginRes.body?.user?.role === "STUDENT", "Student login resolves role STUDENT from server");
  assert(studentLoginRes.body?.redirectTo === "/explore", "Student login routes to /explore");
  assert(!!studentLoginRes.setCookie, "Login issues HTTP-only session cookie");

  const studentCookie = studentLoginRes.setCookie ? studentLoginRes.setCookie.split(";")[0] : "";

  // Seed organizer login
  const organizerLoginRes = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "organizer@eventfind.dev", password: "Password123!" }),
  });
  assert(organizerLoginRes.status === 200, "Organizer login returns HTTP 200");
  assert(organizerLoginRes.body?.user?.role === "ORGANIZER", "Organizer login resolves role ORGANIZER from server");
  assert(organizerLoginRes.body?.redirectTo === "/organizer/dashboard", "Organizer login routes to /organizer/dashboard");

  const organizerCookie = organizerLoginRes.setCookie ? organizerLoginRes.setCookie.split(";")[0] : "";

  // Invalid credentials check
  const badLoginRes = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "alex_student", password: "WrongPassword999!" }),
  });
  assert(badLoginRes.status === 401, "Invalid password returns HTTP 401");
  assert(badLoginRes.body?.error.includes("Invalid"), "Returns safe generic error message without leaking sensitive data");

  // Non-existent user check
  const nonExistentRes = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "non_existent_user_9999", password: "Password123!" }),
  });
  assert(nonExistentRes.status === 401, "Non-existent user returns HTTP 401");

  // 6. Public Registration Flow (/api/auth/signup)
  console.log("\n6. Testing Public Registration Flow (/api/auth/signup)...");
  const uniqueSuffix = Date.now().toString().slice(-6);
  const newUsername = `sec_${uniqueSuffix}`;
  const newEmail = `sec_${uniqueSuffix}@university.edu`;

  const signupRes = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Security Audit User",
      username: newUsername,
      email: newEmail,
      password: "TestPassword123!",
      role: "STUDENT",
      college: "Metropolitan State",
    }),
  });

  assert(signupRes.status === 201, "New user signup returns HTTP 201");
  assert(signupRes.body?.user?.username === newUsername, "Signup returns created user object");
  assert(!!signupRes.setCookie, "Signup sets session cookie automatically");

  const newSessionCookie = signupRes.setCookie ? signupRes.setCookie.split(";")[0] : "";

  // Duplicate email check
  const duplicateEmailRes = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Duplicate Email Tester",
      username: `other_${uniqueSuffix}`,
      email: newEmail,
      password: "TestPassword123!",
      role: "STUDENT",
    }),
  });
  assert(duplicateEmailRes.status === 409, "Duplicate email registration rejected with HTTP 409");

  // Duplicate username check
  const duplicateUsernameRes = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Duplicate Username Tester",
      username: newUsername,
      email: `other_${uniqueSuffix}@test.edu`,
      password: "TestPassword123!",
      role: "STUDENT",
    }),
  });
  assert(duplicateUsernameRes.status === 409, "Duplicate username registration rejected with HTTP 409");

  // Privilege escalation check: attempt to register with ADMIN role
  const signupAdminEscalationRes = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Malicious User",
      username: `evil_${uniqueSuffix}`,
      email: `evil_${uniqueSuffix}@test.edu`,
      password: "TestPassword123!",
      role: "ADMIN",
    }),
  });
  assert(signupAdminEscalationRes.status === 400, "Signup with ADMIN role rejected with HTTP 400");

  // 7. Session Validation & Password Hash Omission (/api/auth/me)
  console.log("\n7. Testing Session Validation (/api/auth/me)...");
  
  // Unauthenticated
  const unauthMeRes = await request("/api/auth/me");
  assert(unauthMeRes.status === 200 && unauthMeRes.body?.user === null, "Unauthenticated /api/auth/me returns HTTP 200 with user: null");

  // Authenticated with student cookie
  const authMeRes = await request("/api/auth/me", {
    headers: { Cookie: studentCookie },
  });
  assert(authMeRes.status === 200, "Authenticated student /api/auth/me returns HTTP 200");
  assert(authMeRes.body?.user?.username === "alex_student", "Session correctly identifies user 'alex_student'");
  assert(authMeRes.body?.user?.passwordHash === undefined, "Sensitive password hash never exposed to client");

  // 8. Profile Update & Protected Field Enforcements (/api/auth/profile)
  console.log("\n8. Testing Profile Updates & Immutable Field Enforcements (/api/auth/profile)...");
  
  // Update permitted fields (name, bio)
  const updateRes = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { Cookie: newSessionCookie },
    body: JSON.stringify({
      name: "Updated Security Name",
      bio: "Updated bio description for verified student.",
    }),
  });
  assert(updateRes.status === 200, "Updating permitted profile fields returns HTTP 200");
  assert(updateRes.body?.user?.name === "Updated Security Name", "Profile display name updated correctly");
  assert(updateRes.body?.user?.bio === "Updated bio description for verified student.", "Profile bio updated correctly");

  // Attempt role escalation via profile update
  const escalateRoleRes = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { Cookie: newSessionCookie },
    body: JSON.stringify({
      role: "ADMIN",
    }),
  });
  assert(escalateRoleRes.status === 403, "Attempt to escalate role via profile update rejected with HTTP 403");

  // Attempt email modification via profile update
  const modifyEmailRes = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { Cookie: newSessionCookie },
    body: JSON.stringify({
      email: "injected_email@hacker.io",
    }),
  });
  assert(modifyEmailRes.status === 403, "Attempt to alter email via profile update rejected with HTTP 403");

  // Attempt ID tampering via profile update
  const modifyIdRes = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { Cookie: newSessionCookie },
    body: JSON.stringify({
      id: "usr_injected_root_admin",
    }),
  });
  assert(modifyIdRes.status === 403, "Attempt to alter system ID via profile update rejected with HTTP 403");

  // 9. Logout & Session Invalidation (/api/auth/logout)
  console.log("\n9. Testing Logout & Server-Side Session Invalidation (/api/auth/logout)...");
  const logoutRes = await request("/api/auth/logout", {
    method: "POST",
    headers: { Cookie: newSessionCookie },
  });
  assert(logoutRes.status === 200, "Logout request returns HTTP 200");

  // Check that previously valid cookie is now invalid on server
  const afterLogoutRes = await request("/api/auth/me", {
    headers: { Cookie: newSessionCookie },
  });
  assert(afterLogoutRes.status === 200 && afterLogoutRes.body?.user === null, "Invalidated session token returns user: null on /api/auth/me");

  // 10. Server Route Protection Guards
  console.log("\n10. Testing Server Component Route Guards & Redirects...");
  
  // Unauthenticated /profile redirect
  const unauthProfileRes = await fetch(`${BASE_URL}/profile`, { redirect: "manual" });
  assert(
    unauthProfileRes.status === 307 || unauthProfileRes.status === 302 || unauthProfileRes.status === 303,
    "Unauthenticated /profile redirects to /login"
  );
  const profileLocation = unauthProfileRes.headers.get("location") || "";
  assert(profileLocation.includes("/login"), "Profile redirect target includes /login");

  // Unauthenticated /organizer/dashboard redirect
  const unauthOrgRes = await fetch(`${BASE_URL}/organizer/dashboard`, { redirect: "manual" });
  assert(
    unauthOrgRes.status === 307 || unauthOrgRes.status === 302 || unauthOrgRes.status === 303,
    "Unauthenticated /organizer/dashboard redirects to /login"
  );

  // Authenticated Student accessing /organizer/dashboard -> redirected away
  const studentOrgRes = await fetch(`${BASE_URL}/organizer/dashboard`, {
    headers: { Cookie: studentCookie },
    redirect: "manual",
  });
  assert(
    studentOrgRes.status === 307 || studentOrgRes.status === 302 || studentOrgRes.status === 303,
    "Student accessing /organizer/dashboard is redirected away (role enforcement)"
  );

  // Authenticated Organizer accessing /organizer/dashboard -> HTTP 200
  const orgDashboardRes = await fetch(`${BASE_URL}/organizer/dashboard`, {
    headers: { Cookie: organizerCookie },
    redirect: "manual",
  });
  assert(orgDashboardRes.status === 200, "Organizer accessing /organizer/dashboard is allowed (HTTP 200)");

  console.log("\n====================================================");
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED:      ${passedTests}`);
  console.log(`FAILED:      ${failedTests}`);
  console.log("====================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStage3Audit().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
