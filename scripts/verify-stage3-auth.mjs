/**
 * EventFind Stage 3 Automated Auth & Profile Verification Suite
 * Tests password hashing, Zod validation, API endpoints, role guards, and privilege escalation prevention.
 */

import http from "node:http";
import bcrypt from "bcryptjs";
import { z } from "zod";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

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

async function runStage3Verification() {
  console.log("====================================================");
  console.log("  EVENTFIND STAGE 3: AUTH & PROFILE VERIFICATION   ");
  console.log("====================================================\n");

  // 1. Password Hashing and Verification
  console.log("1. Testing Password Hashing & Verification (bcrypt)...");
  const plainPassword = "TestPassword123!";
  const hash = await bcrypt.hash(plainPassword, 10);
  assert(hash.startsWith("$2a$") || hash.startsWith("$2b$"), "bcrypt produces standard salted hash");
  assert(await bcrypt.compare(plainPassword, hash), "bcrypt verifies correct plaintext password");
  assert(!(await bcrypt.compare("WrongPassword", hash)), "bcrypt rejects incorrect plaintext password");

  // 2. Schema Validation & Privilege Escalation Prevention
  console.log("\n2. Testing Validation Schemas & Role Restriction...");
  const signupSchema = z.object({
    name: z.string().min(2),
    username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/).toLowerCase(),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
    role: z.enum(["STUDENT", "ORGANIZER"]),
  });

  const validStudent = signupSchema.safeParse({
    name: "Valid Student",
    username: "valid_student",
    email: "student@test.edu",
    password: "Password123!",
    role: "STUDENT",
  });
  assert(validStudent.success, "signupSchema accepts valid STUDENT registration");

  const validOrganizer = signupSchema.safeParse({
    name: "Valid Organizer",
    username: "valid_org",
    email: "org@test.edu",
    password: "Password123!",
    role: "ORGANIZER",
  });
  assert(validOrganizer.success, "signupSchema accepts valid ORGANIZER registration");

  const adminAttempt = signupSchema.safeParse({
    name: "Hacker Admin",
    username: "hacker_admin",
    email: "admin@test.edu",
    password: "Password123!",
    role: "ADMIN",
  });
  assert(!adminAttempt.success, "signupSchema strictly rejects public ADMIN registration");

  // 3. API Login Flow (Unified Login, No Role Selector)
  console.log("\n3. Testing Unified Server-Side Authentication (/api/auth/login)...");
  
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

  // 4. Public Registration Flow (/api/auth/signup)
  console.log("\n4. Testing Public Registration Flow (/api/auth/signup)...");
  const uniqueSuffix = Date.now().toString().slice(-6);
  const newUsername = `tester_${uniqueSuffix}`;
  const newEmail = `tester_${uniqueSuffix}@university.edu`;

  const signupRes = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Automated Tester",
      username: newUsername,
      email: newEmail,
      password: "TestPassword123!",
      role: "STUDENT",
      college: "Test State University",
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

  // 5. Session Validation & Profile Inspection (/api/auth/me)
  console.log("\n5. Testing Session Validation (/api/auth/me)...");
  
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

  // 6. Profile Update & Role Protection (/api/auth/profile)
  console.log("\n6. Testing Profile Updates & Escalation Prevention (/api/auth/profile)...");
  
  // Update permitted fields (name, bio)
  const updateRes = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { Cookie: newSessionCookie },
    body: JSON.stringify({
      name: "Updated Name",
      bio: "Updated bio description for student.",
    }),
  });
  assert(updateRes.status === 200, "Updating permitted profile fields returns HTTP 200");
  assert(updateRes.body?.user?.name === "Updated Name", "Profile display name updated correctly");
  assert(updateRes.body?.user?.bio === "Updated bio description for student.", "Profile bio updated correctly");

  // Attempt role escalation via profile update
  const escalateRes = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { Cookie: newSessionCookie },
    body: JSON.stringify({
      role: "ADMIN",
    }),
  });
  assert(escalateRes.status === 403, "Attempt to escalate role via profile update rejected with HTTP 403");

  // 7. Logout & Session Invalidation (/api/auth/logout)
  console.log("\n7. Testing Logout & Session Invalidation (/api/auth/logout)...");
  const logoutRes = await request("/api/auth/logout", {
    method: "POST",
    headers: { Cookie: newSessionCookie },
  });
  assert(logoutRes.status === 200, "Logout request returns HTTP 200");

  // Check that previously valid cookie is now invalid
  const afterLogoutRes = await request("/api/auth/me", {
    headers: { Cookie: newSessionCookie },
  });
  assert(afterLogoutRes.status === 200 && afterLogoutRes.body?.user === null, "Invalidated session token returns user: null on /api/auth/me");

  // 8. Server Route Protection Guards
  console.log("\n8. Testing Server Component Route Guards & Redirects...");
  
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

runStage3Verification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});

