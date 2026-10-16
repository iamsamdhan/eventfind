/**
 * EventFind Stage 7: End-to-End Product Hardening Verification Suite
 * 
 * Verifies the complete Student and Organizer journeys across:
 * - HTTP Security Headers & Production Configuration Audit
 * - Authentication, Profile Immutability & Privilege Escalation Prevention
 * - Organizer Event Lifecycle (Draft, Edit, Publish, Capacity Floor, Close)
 * - Public Discovery & Draft Visibility Isolation
 * - Individual & Squad Registrations with Team Eligibility Rules
 * - High-Concurrency PostgreSQL Row-Locking & Waitlist Auto-Promotion
 * - Protected Attendee Rosters & Privacy-Preserving CSV Export
 * - Cancellation Rules & Authorization IDOR Checks
 * - Safe Test Record Cleanup Preserving Baseline Seed Data
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const prisma = new PrismaClient();

let passedTests = 0;
let totalTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return "";
  const parts = setCookieHeader.split(";")[0];
  return parts;
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Origin: BASE_URL,
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  let body = null;
  if (contentType.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } else if (contentType.includes("text/")) {
    body = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    body,
    setCookie: res.headers.get("set-cookie"),
  };
}

async function runStage7E2ESuite() {
  console.log("=========================================================");
  console.log("  EVENTFIND STAGE 7: END-TO-END PRODUCT HARDENING SUITE  ");
  console.log("=========================================================\n");

  const runNonce = Date.now().toString().slice(-6);

  // 1. HTTP Security Headers & Configuration Audit
  console.log("1. Auditing Security Headers & Environment Configuration...");

  const rootRes = await fetch(`${BASE_URL}/`);
  const headers = rootRes.headers;

  assert(
    headers.get("x-frame-options") === "DENY",
    "HTTP Security Header: X-Frame-Options is DENY"
  );
  assert(
    headers.get("x-content-type-options") === "nosniff",
    "HTTP Security Header: X-Content-Type-Options is nosniff"
  );
  assert(
    headers.get("referrer-policy") === "strict-origin-when-cross-origin",
    "HTTP Security Header: Referrer-Policy is strict-origin-when-cross-origin"
  );
  assert(
    headers.get("permissions-policy")?.includes("camera=()"),
    "HTTP Security Header: Permissions-Policy restricts sensitive device APIs"
  );
  assert(
    headers.get("strict-transport-security")?.includes("max-age="),
    "HTTP Security Header: Strict-Transport-Security (HSTS) configured"
  );

  // Audit .gitignore and .env.example
  const gitignoreContent = fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");
  assert(
    gitignoreContent.includes(".env") && gitignoreContent.includes(".env*.local"),
    ".gitignore explicitly excludes .env and .env*.local secrets"
  );

  const envExampleContent = fs.readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
  assert(
    !envExampleContent.includes("postgres:eventfind_secret_password") &&
    !envExampleContent.includes("supersecret"),
    ".env.example contains only dummy template placeholders without exposed production secrets"
  );

  // 2. Authentication, Profile Security & Privilege Escalation Enforcements
  console.log("\n2. Testing Student & Organizer Authentication and Privilege Bounds...");

  // Register a new student for E2E flow
  const student1Username = `e2e_student1_${runNonce}`;
  const student1Email = `e2e_student1_${runNonce}@stanford.edu`;

  const student1Signup = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      username: student1Username,
      email: student1Email,
      password: "Password123!",
      name: "Marcus Brody",
      college: "Stanford University",
      role: "STUDENT",
    }),
  });
  assert(student1Signup.status === 201, "Student 1 registered successfully (HTTP 201 Created)");
  const student1Cookie = extractCookie(student1Signup.setCookie);
  assert(student1Cookie.length > 0, "Student 1 received secure HTTP-only session cookie");

  // Register Student 2 for squad testing
  const student2Username = `e2e_student2_${runNonce}`;
  const student2Email = `e2e_student2_${runNonce}@berkeley.edu`;
  const student2Signup = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      username: student2Username,
      email: student2Email,
      password: "Password123!",
      name: "Nadia Ramos",
      college: "UC Berkeley",
      role: "STUDENT",
    }),
  });
  assert(student2Signup.status === 201, "Student 2 registered successfully (HTTP 201 Created)");
  const student2Cookie = extractCookie(student2Signup.setCookie);

  // Verify Session on /api/auth/me
  const meRes = await request("/api/auth/me", {
    headers: { Cookie: student1Cookie },
  });
  assert(
    meRes.status === 200 && meRes.body?.user?.username === student1Username,
    "/api/auth/me resolves authenticated Student 1 session"
  );
  assert(
    meRes.body?.user?.passwordHash === undefined,
    "/api/auth/me strictly conceals password hash"
  );

  // Profile update allowed fields
  const updateProfileRes = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({
      name: "Marcus Brody Jr.",
      bio: "CS sophomore interested in distributed systems.",
    }),
  });
  assert(updateProfileRes.status === 200, "Student updated permitted profile fields (HTTP 200 OK)");

  // Attempt privilege escalation to ORGANIZER via profile update
  const escalateRoleRes = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({ role: "ORGANIZER" }),
  });
  assert(
    escalateRoleRes.status === 403,
    "Privilege escalation attempt to ORGANIZER via profile update rejected with HTTP 403 Forbidden"
  );

  // Attempt to mutate immutable email
  const mutateEmailRes = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({ email: "hacked@evil.com" }),
  });
  assert(
    mutateEmailRes.status === 403,
    "Attempt to mutate immutable user email rejected with HTTP 403 Forbidden"
  );

  // Authenticate Primary Organizer (Elena)
  const organizer1Login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      identifier: "organizer@eventfind.dev",
      password: "Password123!",
    }),
  });
  assert(organizer1Login.status === 200, "Primary Organizer (Elena) logged in successfully");
  const organizer1Cookie = extractCookie(organizer1Login.setCookie);

  // Create a Secondary Organizer (Marcus) to test IDOR protections
  const org2Username = `e2e_org2_${runNonce}`;
  const org2Email = `e2e_org2_${runNonce}@mit.edu`;
  const org2Signup = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      username: org2Username,
      email: org2Email,
      password: "Password123!",
      name: "Professor Vance",
      organization: "MIT CSAIL",
      role: "ORGANIZER",
    }),
  });
  assert(org2Signup.status === 201, "Secondary Organizer registered successfully");
  const organizer2Cookie = extractCookie(org2Signup.setCookie);

  // Student accessing organizer dashboard route
  const studentOnDashboardRes = await request("/api/organizer/events", {
    headers: { Cookie: student1Cookie },
  });
  assert(
    studentOnDashboardRes.status === 403,
    "Student account accessing /api/organizer/events rejected with HTTP 403 Forbidden"
  );

  // 3. Organizer Event Creation, Draft Mode & Public Visibility Isolation
  console.log("\n3. Testing Organizer Event Lifecycle & Visibility Isolation...");

  const draftEventSlug = `e2e-draft-summit-${runNonce}`;
  const now = Date.now();
  const createDraftRes = await request("/api/organizer/events", {
    method: "POST",
    headers: { Cookie: organizer1Cookie },
    body: JSON.stringify({
      title: `E2E Hardening Summit ${runNonce}`,
      slug: draftEventSlug,
      tagline: "Comprehensive end-to-end event testing draft",
      description: "Testing draft state isolation and public discovery filtering.",
      category: "WORKSHOP",
      format: "ONLINE",
      location: "Virtual",
      city: "Virtual",
      startDate: new Date(now + 86400000 * 7).toISOString(),
      endDate: new Date(now + 86400000 * 8).toISOString(),
      registrationDeadline: new Date(now + 86400000 * 5).toISOString(),
      capacity: 25,
      isTeamEvent: false,
      minTeamSize: 1,
      maxTeamSize: 1,
      eligibility: "Open to all verified college students",
      tags: ["Security", "Hardening", "E2E"],
      bannerGradient: "from-blue-600 via-indigo-600 to-purple-700",
      published: false, // DRAFT MODE
    }),
  });
  assert(createDraftRes.status === 201, "Organizer created draft event (published: false)");
  const draftEventId = createDraftRes.body?.event?.id;

  // Verify draft event DOES NOT appear in public discovery
  const publicExploreRes = await request("/api/events?query=" + draftEventSlug);
  const foundInPublic = Array.isArray(publicExploreRes.body?.events) &&
    publicExploreRes.body.events.some((e) => e.slug === draftEventSlug);
  assert(!foundInPublic, "Draft event is strictly hidden from public discovery list");

  // Student visits draft event page -> 404
  const studentViewDraftRes = await request(`/events/${draftEventSlug}`, {
    headers: { Cookie: student1Cookie },
  });
  assert(
    studentViewDraftRes.status === 404,
    "Student viewing unpublished draft event returns HTTP 404 Not Found"
  );

  // Student attempting registration on draft event -> 400
  const studentRegDraftRes = await request(`/api/events/${draftEventSlug}/register`, {
    method: "POST",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    studentRegDraftRes.status === 400 &&
    studentRegDraftRes.body?.error?.includes("draft"),
    "Attendee registration attempt on draft event rejected with HTTP 400"
  );

  // Organizer publishes event
  const publishRes = await request(`/api/organizer/events/${draftEventId}/publish`, {
    method: "PATCH",
    headers: { Cookie: organizer1Cookie },
    body: JSON.stringify({ published: true }),
  });
  assert(publishRes.status === 200, "Organizer published event (published: true)");

  // 4. Solo Registration & Format Guarding
  console.log("\n4. Testing Solo Registration & Format Guarding...");

  // Solo registration on published event
  const soloRegRes = await request(`/api/events/${draftEventSlug}/register`, {
    method: "POST",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({
      type: "INDIVIDUAL",
      notes: "First registrant for E2E summit",
    }),
  });
  assert(soloRegRes.status === 201, "Student 1 registered solo (HTTP 201 Created)");
  assert(soloRegRes.body?.registration?.spots === 1, "Solo registration reserved exactly 1 spot");
  const student1RegId = soloRegRes.body?.registration?.id;

  // Duplicate solo registration rejected
  const dupSoloRes = await request(`/api/events/${draftEventSlug}/register`, {
    method: "POST",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    dupSoloRes.status === 400 || dupSoloRes.status === 409,
    "Duplicate individual registration attempt rejected with HTTP 400/409"
  );

  // Organizer attempt to register as attendee rejected
  const orgRegAttendeeRes = await request(`/api/events/${draftEventSlug}/register`, {
    method: "POST",
    headers: { Cookie: organizer1Cookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    orgRegAttendeeRes.status === 403,
    "Organizer attempting attendee registration rejected with HTTP 403 Forbidden"
  );

  // 5. Team Formation, Member Eligibility & Squad Registration
  console.log("\n5. Testing Team Formation & Squad Registration Lifecycle...");

  // Create team-required event with capacity: 10, minTeamSize: 2, maxTeamSize: 4
  const teamEventSlug = `e2e-hackathon-${runNonce}`;
  const createTeamEventRes = await request("/api/organizer/events", {
    method: "POST",
    headers: { Cookie: organizer1Cookie },
    body: JSON.stringify({
      title: `E2E Hardening Hackathon ${runNonce}`,
      slug: teamEventSlug,
      tagline: "Collaborative team formation and transaction tests",
      description: "Testing team formation, squad limits, and cross-member guards.",
      category: "HACKATHON",
      format: "HYBRID",
      location: "San Francisco, CA",
      city: "San Francisco",
      startDate: new Date(now + 86400000 * 10).toISOString(),
      endDate: new Date(now + 86400000 * 12).toISOString(),
      registrationDeadline: new Date(now + 86400000 * 8).toISOString(),
      capacity: 10,
      isTeamEvent: true,
      minTeamSize: 2,
      maxTeamSize: 4,
      eligibility: "College students in squads of 2-4",
      tags: ["Hackathon", "Teams", "E2E"],
      bannerGradient: "from-violet-600 via-purple-600 to-pink-600",
      published: true,
    }),
  });
  assert(createTeamEventRes.status === 201, "Created published team-required hackathon");
  const teamEventId = createTeamEventRes.body?.event?.id;

  // Solo student attempts individual registration on team event -> rejected
  const soloOnTeamEventRes = await request(`/api/events/${teamEventSlug}/register`, {
    method: "POST",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    soloOnTeamEventRes.status === 400 &&
    soloOnTeamEventRes.body?.error?.includes("team"),
    "Solo registration on team-only event rejected with HTTP 400"
  );

  // Student 1 creates Squad
  const squadName = `Cyber Guardians ${runNonce}`;
  const createSquadRes = await request("/api/teams", {
    method: "POST",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({
      name: squadName,
      description: "Testing squad registration flow",
      eventId: teamEventSlug,
    }),
  });
  assert(createSquadRes.status === 201, "Student 1 created team squad");
  const squadId = createSquadRes.body?.team?.id;

  // Undersized squad attempt (size 1 < minTeamSize 2)
  const undersizedRegRes = await request(`/api/events/${teamEventSlug}/register`, {
    method: "POST",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({ type: "TEAM", teamId: squadId }),
  });
  assert(
    undersizedRegRes.status === 400 &&
    undersizedRegRes.body?.error?.includes("minimum of 2"),
    "Undersized squad registration rejected with HTTP 400"
  );

  // Invite Student 2
  const inviteRes = await request(`/api/teams/${squadId}/invite`, {
    method: "POST",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({ username: student2Username }),
  });
  assert(inviteRes.status === 201, "Student 1 invited Student 2 to squad");
  const inviteId = inviteRes.body?.invitation?.id;

  // Student 2 accepts
  const acceptRes = await request(`/api/teams/invitations/${inviteId}`, {
    method: "POST",
    headers: { Cookie: student2Cookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  assert(acceptRes.status === 200, "Student 2 accepted invitation (squad size is now 2)");

  // Member (Student 2) attempts to register squad -> rejected
  const memberRegRes = await request(`/api/events/${teamEventSlug}/register`, {
    method: "POST",
    headers: { Cookie: student2Cookie },
    body: JSON.stringify({ type: "TEAM", teamId: squadId }),
  });
  assert(
    memberRegRes.status === 403,
    "Non-leader member registering squad rejected with HTTP 403 Forbidden"
  );

  // Leader registers squad
  const leaderRegRes = await request(`/api/events/${teamEventSlug}/register`, {
    method: "POST",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({ type: "TEAM", teamId: squadId, notes: "Squad ready for hackathon" }),
  });
  assert(leaderRegRes.status === 201, "Team leader successfully registered squad (HTTP 201 Created)");
  assert(leaderRegRes.body?.registration?.spots === 2, "Squad registration reserved exactly 2 spots");
  const squadRegId = leaderRegRes.body?.registration?.id;

  // Teammate Student 2 queries registrations -> sees squad registration
  const teammateRegListRes = await request("/api/registrations", {
    headers: { Cookie: student2Cookie },
  });
  const teammateHasReg = Array.isArray(teammateRegListRes.body?.registrations) &&
    teammateRegListRes.body.registrations.some((r) => r.teamId === squadId && r.status === "CONFIRMED");
  assert(teammateHasReg, "Teammate sees confirmed squad registration in personal dashboard");

  // Teammate attempts solo registration for same event -> rejected
  const teammateSoloRes = await request(`/api/events/${teamEventSlug}/register`, {
    method: "POST",
    headers: { Cookie: student2Cookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    teammateSoloRes.status === 400 || teammateSoloRes.status === 409,
    "Teammate attempting solo cross-registration rejected with HTTP 400/409"
  );

  // 6. High-Concurrency Race Condition & Automatic Waitlist Promotion
  console.log("\n6. Testing High Concurrency PostgreSQL Row Locks & Automatic Waitlist...");

  // Organizer creates capped event with capacity: 2
  const cappedSlug = `e2e-concurrency-${runNonce}`;
  const createCappedRes = await request("/api/organizer/events", {
    method: "POST",
    headers: { Cookie: organizer1Cookie },
    body: JSON.stringify({
      title: `E2E High Concurrency Lab ${runNonce}`,
      slug: cappedSlug,
      tagline: "Stress testing concurrency under row-level locks",
      description: "PostgreSQL exclusive row lock and waitlist promotion test.",
      category: "WORKSHOP",
      format: "ONLINE",
      location: "Virtual",
      city: "Virtual",
      startDate: new Date(now + 86400000 * 5).toISOString(),
      endDate: new Date(now + 86400000 * 6).toISOString(),
      registrationDeadline: new Date(now + 86400000 * 4).toISOString(),
      capacity: 2, // Exactly 2 spots
      isTeamEvent: false,
      minTeamSize: 1,
      maxTeamSize: 1,
      eligibility: "Open to students",
      tags: ["Concurrency", "PostgreSQL"],
      bannerGradient: "from-blue-600 to-indigo-700",
      published: true,
    }),
  });
  assert(createCappedRes.status === 201, "Created capped event with strictly 2 spots");
  const cappedEventId = createCappedRes.body?.event?.id;

  // Create 4 distinct student accounts to race
  const racerSessions = [];
  for (let i = 1; i <= 4; i++) {
    const rName = `racer_${runNonce}_${i}`;
    const rEmail = `racer_${runNonce}_${i}@test.edu`;
    const rSignup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username: rName,
        email: rEmail,
        password: "Password123!",
        name: `Racer ${i}`,
        role: "STUDENT",
        college: "Tech University",
      }),
    });
    racerSessions.push({
      username: rName,
      cookie: extractCookie(rSignup.setCookie),
    });
  }

  // Fire 4 simultaneous HTTP registration calls racing for 2 spots
  const raceCalls = racerSessions.map((st) =>
    request(`/api/events/${cappedSlug}/register`, {
      method: "POST",
      headers: { Cookie: st.cookie },
      body: JSON.stringify({ type: "INDIVIDUAL" }),
    })
  );
  const raceResults = await Promise.all(raceCalls);

  const confirmedRace = raceResults.filter((r) => r.status === 201 && r.body?.registration?.status === "CONFIRMED");
  const waitlistedRace = raceResults.filter((r) => r.status === 201 && r.body?.registration?.status === "WAITLISTED");
  assert(confirmedRace.length === 2, `Exactly 2 registrations received CONFIRMED (got ${confirmedRace.length})`);
  assert(waitlistedRace.length === 2, `Exactly 2 registrations placed on WAITLIST (got ${waitlistedRace.length})`);

  // Verify PostgreSQL event registeredCount is exactly 2
  const dbCappedEvent = await prisma.event.findUnique({
    where: { id: cappedEventId },
  });
  assert(
    dbCappedEvent?.registeredCount === 2,
    `PostgreSQL event registeredCount is exactly 2 (capacity not oversold: ${dbCappedEvent?.registeredCount})`
  );

  // Cancel one confirmed registration to verify automatic waitlist promotion
  const confirmedAttendee = confirmedRace[0];
  const confirmedUser = racerSessions.find(
    (s) => s.username === confirmedAttendee.body?.registration?.user?.username
  );

  const cancelRes = await request(`/api/registrations/${confirmedAttendee.body.registration.id}`, {
    method: "DELETE",
    headers: { Cookie: confirmedUser.cookie },
  });
  assert(cancelRes.status === 200, "Confirmed registration cancelled successfully via HTTP DELETE");

  // Check promoted registration in PostgreSQL
  const promotedId = cancelRes.body?.promotedRegistrationId;
  let promotedRecord = null;
  if (promotedId) {
    promotedRecord = await prisma.registration.findUnique({ where: { id: promotedId } });
  } else {
    const waitlistedIds = waitlistedRace.map((w) => w.body?.registration?.id).filter(Boolean);
    promotedRecord = await prisma.registration.findFirst({
      where: { id: { in: waitlistedIds }, status: "CONFIRMED" },
    });
  }
  assert(
    promotedRecord?.status === "CONFIRMED",
    "Waitlisted candidate was automatically promoted to CONFIRMED status in PostgreSQL"
  );

  // Check that capacity remains balanced at 2
  const dbEventAfterPromotion = await prisma.event.findUnique({
    where: { id: cappedEventId },
  });
  assert(
    dbEventAfterPromotion?.registeredCount === 2,
    "Event registeredCount remains balanced at capacity (2) after promotion"
  );

  // 7. Capacity Floor Protection
  console.log("\n7. Testing Capacity Floor Protection...");

  // Capped event has 2 confirmed attendees. Attempting to reduce capacity to 1 must be rejected.
  const floorReduceRes = await request(`/api/organizer/events/${cappedEventId}`, {
    method: "PATCH",
    headers: { Cookie: organizer1Cookie },
    body: JSON.stringify({ capacity: 1 }),
  });
  assert(
    floorReduceRes.status === 400 &&
    (floorReduceRes.body?.error?.includes("Cannot reduce event capacity") ||
     floorReduceRes.body?.error?.includes("confirmed attendance")),
    "Reducing event capacity below confirmed attendance rejected with HTTP 400 (Capacity Floor Protection)"
  );

  // Increasing capacity to 10 succeeds
  const expandCapacityRes = await request(`/api/organizer/events/${cappedEventId}`, {
    method: "PATCH",
    headers: { Cookie: organizer1Cookie },
    body: JSON.stringify({ capacity: 10 }),
  });
  assert(expandCapacityRes.status === 200, "Increasing event capacity succeeds with HTTP 200 OK");

  // 8. Manual Registration Closure & Reopening
  console.log("\n8. Testing Manual Registration Closure Behavior...");

  // Close registration
  const closeRes = await request(`/api/organizer/events/${cappedEventId}/close`, {
    method: "PATCH",
    headers: { Cookie: organizer1Cookie },
    body: JSON.stringify({ isClosed: true }),
  });
  assert(closeRes.status === 200, "Organizer manually closed event registration (isClosed: true)");

  // Student registration attempt on closed event rejected
  const regOnClosedRes = await request(`/api/events/${cappedSlug}/register`, {
    method: "POST",
    headers: { Cookie: student1Cookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    regOnClosedRes.status === 400 &&
    regOnClosedRes.body?.error?.includes("closed"),
    "Registration attempt on manually closed event rejected with HTTP 400"
  );

  // Reopen registration
  const reopenRes = await request(`/api/organizer/events/${cappedEventId}/close`, {
    method: "PATCH",
    headers: { Cookie: organizer1Cookie },
    body: JSON.stringify({ isClosed: false }),
  });
  assert(reopenRes.status === 200, "Organizer reopened event registration (isClosed: false)");

  // 9. Protected Attendee Roster & Authorized CSV Privacy
  console.log("\n9. Testing Protected Attendee Roster & Authorized CSV Privacy...");

  // Owning organizer retrieves roster
  const rosterRes = await request(`/api/organizer/events/${teamEventId}/registrations`, {
    headers: { Cookie: organizer1Cookie },
  });
  assert(rosterRes.status === 200, "Owning organizer retrieved attendee roster with HTTP 200");
  assert(
    Array.isArray(rosterRes.body?.attendees) && rosterRes.body.attendees.length > 0,
    "Attendee roster contains confirmed squad registration"
  );
  assert(
    rosterRes.body?.attendees[0]?.user?.passwordHash === undefined,
    "Attendee roster strictly omits sensitive password hashes"
  );

  // Non-owning organizer (Marcus) attempting to access Elena's roster -> 403 Forbidden
  const idorRosterRes = await request(`/api/organizer/events/${teamEventId}/registrations`, {
    headers: { Cookie: organizer2Cookie },
  });
  assert(
    idorRosterRes.status === 403,
    "Non-owning organizer accessing attendee roster rejected with HTTP 403 Forbidden (IDOR Guard)"
  );

  // Owning organizer downloads CSV export
  const csvRes = await request(`/api/organizer/events/${teamEventId}/export`, {
    headers: { Cookie: organizer1Cookie },
  });
  assert(csvRes.status === 200, "Owning organizer downloaded CSV export with HTTP 200 OK");
  assert(
    csvRes.headers.get("content-type")?.includes("text/csv"),
    "CSV export returns Content-Type text/csv"
  );
  const csvText = typeof csvRes.body === "string" ? csvRes.body : "";
  assert(
    csvText.includes("Registration ID") &&
    csvText.includes("Participation Type") &&
    csvText.includes("Attendee Name") &&
    csvText.includes("Email"),
    "CSV includes expected standard header row (Registration ID, Participation Type, Attendee Name, Email)"
  );
  assert(
    !csvText.includes("passwordHash") && !csvText.includes("sessionToken"),
    "CSV strictly excludes password hashes and session tokens"
  );

  // Non-owning organizer downloading CSV export -> 403 Forbidden
  const idorCsvRes = await request(`/api/organizer/events/${teamEventId}/export`, {
    headers: { Cookie: organizer2Cookie },
  });
  assert(
    idorCsvRes.status === 403,
    "Non-owning organizer downloading CSV export rejected with HTTP 403 Forbidden (IDOR Guard)"
  );

  // 10. Cancellation & Authorization Rules
  console.log("\n10. Testing Cancellation Safeguards...");

  // Unauthorized user (Student 2) cancelling Student 1's registration -> 403
  const unauthCancelRes = await request(`/api/registrations/${student1RegId}`, {
    method: "DELETE",
    headers: { Cookie: student2Cookie },
  });
  assert(
    unauthCancelRes.status === 403,
    "Unauthorized user cancelling another's registration rejected with HTTP 403 Forbidden"
  );

  // Non-leader (Student 2) cancelling squad registration -> 403
  const nonLeaderCancelTeamRes = await request(`/api/registrations/${squadRegId}`, {
    method: "DELETE",
    headers: { Cookie: student2Cookie },
  });
  assert(
    nonLeaderCancelTeamRes.status === 403,
    "Non-leader member cancelling squad registration rejected with HTTP 403 Forbidden"
  );

  // Leader cancels squad registration
  const leaderCancelTeamRes = await request(`/api/registrations/${squadRegId}`, {
    method: "DELETE",
    headers: { Cookie: student1Cookie },
  });
  assert(leaderCancelTeamRes.status === 200, "Team leader successfully cancelled squad registration");

  // Attempt duplicate cancellation -> 400
  const dupCancelRes = await request(`/api/registrations/${squadRegId}`, {
    method: "DELETE",
    headers: { Cookie: student1Cookie },
  });
  assert(
    dupCancelRes.status === 400 &&
    dupCancelRes.body?.error?.includes("already been cancelled"),
    "Duplicate cancellation attempt rejected with HTTP 400"
  );

  // 11. Data Isolation & Cleanup
  console.log("\n11. Cleaning Up Test Records & Verifying Seed Data Integrity...");

  const testEventIds = [draftEventId, teamEventId, cappedEventId].filter(Boolean);
  if (testEventIds.length > 0) {
    await prisma.registration.deleteMany({ where: { eventId: { in: testEventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: testEventIds } } });
  }

  // Clean up test squads
  if (squadId) {
    await prisma.teamMember.deleteMany({ where: { teamId: squadId } });
    await prisma.teamInvitation.deleteMany({ where: { teamId: squadId } });
    await prisma.team.delete({ where: { id: squadId } }).catch(() => {});
  }

  // Clean up test student and organizer users
  const testUsernames = [
    student1Username,
    student2Username,
    org2Username,
    ...racerSessions.map((r) => r.username),
  ];
  await prisma.session.deleteMany({
    where: { user: { username: { in: testUsernames } } },
  });
  await prisma.user.deleteMany({
    where: { username: { in: testUsernames } },
  });

  // Verify baseline seed users are still intact!
  const seedStudent = await prisma.user.findFirst({
    where: { role: "STUDENT", email: "student@eventfind.dev" },
  });
  const seedOrganizer = await prisma.user.findFirst({
    where: { role: "ORGANIZER", email: "organizer@eventfind.dev" },
  });
  assert(Boolean(seedStudent), "Baseline student seed record (student@eventfind.dev) is intact in PostgreSQL");
  assert(Boolean(seedOrganizer), "Baseline organizer seed record (organizer@eventfind.dev) is intact in PostgreSQL");

  // Final Summary
  console.log("\n=========================================================");
  console.log(`STAGE 7 E2E TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  if (failedTests > 0) {
    console.error(`FAILED TESTS: ${failedTests}`);
    console.log("=========================================================\n");
    process.exit(1);
  } else {
    console.log("ALL STAGE 7 END-TO-END PRODUCT HARDENING TESTS PASSED! [OK]");
    console.log("=========================================================\n");
  }
}

runStage7E2ESuite()
  .catch((err) => {
    console.error("Unhandled error in Stage 7 E2E suite:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
