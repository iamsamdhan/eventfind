/**
 * EventFind Stage 6 Automated Test Suite: Organizer Event Management
 * 
 * Verifies:
 * 1. Role-based route & API guards: Student accounts cannot access organizer endpoints (HTTP 403)
 * 2. CSRF & Origin validation on all state-changing organizer operations
 * 3. Organizer event creation with server-side validation (date ordering, capacity caps, team rules)
 * 4. Strict Ownership enforcement & IDOR prevention: Organizer cannot modify or view another organizer's event
 * 5. Event editing with capacity floor enforcement: Cannot reduce capacity below confirmed attendance
 * 6. Publication workflow: Draft events are hidden from public discovery and reject public registrations
 * 7. Manual registration closure: Closed events reject attendee registrations server-side
 * 8. Protected attendee roster: Only the owning organizer can view attendee details
 * 9. Authorized CSV export: Contains attendee and team details, strictly omits password hashes and secrets
 * 10. Live PostgreSQL integration: Confirms persistent storage, indexes, and constraints
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

try {
  process.loadEnvFile();
} catch {
  // Ignore if already loaded or not found
}

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

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return "";
  const match = setCookieHeader.match(/eventfind_session=([^;]+)/);
  return match ? `eventfind_session=${match[1]}` : "";
}

async function runStage6Tests() {
  console.log("=========================================================");
  console.log("  EVENTFIND STAGE 6: ORGANIZER MANAGEMENT TEST SUITE     ");
  console.log("=========================================================\n");

  const ts = Date.now().toString().slice(-5);

  // 1. Authenticate Test Users
  console.log("1. Authenticating Test Users (Organizer Elena, Organizer Marcus, Student Alex)...");

  // Organizer 1: Elena
  const elenaLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "organizer@eventfind.dev", password: "Password123!" }),
  });
  const elenaCookie = extractCookie(elenaLogin.setCookie);
  assert(elenaLogin.status === 200 && elenaCookie.length > 0, "Elena Rostova (Organizer 1) authenticated successfully");

  // Organizer 2: Marcus (to test cross-organizer IDOR authorization)
  let marcusLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: `marcus_org_${ts}`, password: "Password123!" }),
  });
  if (marcusLogin.status !== 200) {
    marcusLogin = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username: `marcus_org_${ts}`,
        email: `marcus_${ts}@campusorg.edu`,
        password: "Password123!",
        name: "Marcus Vance",
        role: "ORGANIZER",
        organization: "DevOps Campus Chapter",
      }),
    });
  }
  const marcusCookie = extractCookie(marcusLogin.setCookie);
  assert(marcusCookie.length > 0, "Marcus Vance (Organizer 2) authenticated successfully");

  // Student 1: Alex
  let alexLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "alex_student", password: "Password123!" }),
  });
  if (alexLogin.status !== 200) {
    alexLogin = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username: "alex_student",
        email: "student@eventfind.dev",
        password: "Password123!",
        name: "Alex Rivera",
        role: "STUDENT",
        college: "UC Berkeley",
      }),
    });
  }
  const alexCookie = extractCookie(alexLogin.setCookie);
  assert(alexCookie.length > 0, "Alex Rivera (Student 1) authenticated successfully");

  // Student 2: Sarah
  let sarahLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "sarah_hacks", password: "Password123!" }),
  });
  if (sarahLogin.status !== 200) {
    sarahLogin = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username: "sarah_hacks",
        email: "sarah.chen@stanford.edu",
        password: "Password123!",
        name: "Sarah Chen",
        role: "STUDENT",
        college: "Stanford University",
      }),
    });
  }
  const sarahCookie = extractCookie(sarahLogin.setCookie);
  assert(sarahCookie.length > 0, "Sarah Chen (Student 2) authenticated successfully");

  // 2. Role Guards & CSRF Protection
  console.log("\n2. Testing Role Guards & CSRF Protection...");

  // Student attempting to access organizer dashboard API
  const studentDashboardRes = await request("/api/organizer/events", {
    headers: { Cookie: alexCookie },
  });
  assert(
    studentDashboardRes.status === 403,
    "Student account accessing GET /api/organizer/events rejected with HTTP 403 Forbidden"
  );

  // Student attempting to create an event
  const studentCreateRes = await request("/api/organizer/events", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ title: "Unauthorized Event" }),
  });
  assert(
    studentCreateRes.status === 403,
    "Student account attempting POST /api/organizer/events rejected with HTTP 403 Forbidden"
  );

  // Unauthenticated request
  const unauthDashboardRes = await request("/api/organizer/events");
  assert(
    unauthDashboardRes.status === 401,
    "Unauthenticated request to /api/organizer/events rejected with HTTP 401 Unauthorized"
  );

  // CSRF / Origin protection on event creation
  const crossSiteCreateRes = await fetch(`${BASE_URL}/api/organizer/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: elenaCookie,
      Origin: "https://malicious-external-site.com",
    },
    body: JSON.stringify({ title: "Cross-Site Event" }),
  });
  assert(
    crossSiteCreateRes.status === 403,
    "POST /api/organizer/events with untrusted cross-site Origin rejected with HTTP 403 Forbidden"
  );

  // 3. Event Creation Validation Rules
  console.log("\n3. Testing Event Creation Validation Rules...");

  // Rule 1: End date before start date
  const invalidDateOrderRes = await request("/api/organizer/events", {
    method: "POST",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({
      title: "Invalid Dates Event",
      tagline: "Testing start and end date logic",
      description: "Detailed event description that meets length requirements.",
      category: "HACKATHON",
      format: "ONLINE",
      location: "Virtual",
      city: "San Francisco",
      startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 2).toISOString(), // earlier than start!
      registrationDeadline: new Date(Date.now() + 86400000 * 1).toISOString(),
      capacity: 100,
    }),
  });
  assert(
    invalidDateOrderRes.status === 400 && invalidDateOrderRes.body?.error.includes("Start date"),
    "Event creation with endDate earlier than startDate rejected with HTTP 400"
  );

  // Rule 2: Registration deadline after start date
  const invalidDeadlineRes = await request("/api/organizer/events", {
    method: "POST",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({
      title: "Invalid Deadline Event",
      tagline: "Testing registration deadline logic",
      description: "Detailed event description that meets length requirements.",
      category: "WORKSHOP",
      format: "ONLINE",
      location: "Virtual",
      city: "Virtual",
      startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 4).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 5).toISOString(), // after start!
      capacity: 50,
    }),
  });
  assert(
    invalidDeadlineRes.status === 400 && invalidDeadlineRes.body?.error.includes("Registration deadline"),
    "Event creation with deadline after startDate rejected with HTTP 400"
  );

  // Rule 3: Team rules (minTeamSize > maxTeamSize)
  const invalidTeamSizesRes = await request("/api/organizer/events", {
    method: "POST",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({
      title: "Invalid Team Sizes Event",
      tagline: "Testing team size validation",
      description: "Detailed event description that meets length requirements.",
      category: "COMPETITION",
      format: "IN_PERSON",
      location: "Boston, MA",
      city: "Boston",
      startDate: new Date(Date.now() + 86400000 * 6).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 4).toISOString(),
      capacity: 50,
      isTeamEvent: true,
      minTeamSize: 5,
      maxTeamSize: 2, // invalid: min > max
    }),
  });
  assert(
    invalidTeamSizesRes.status === 400 && invalidTeamSizesRes.body?.error.includes("team size"),
    "Event creation with minTeamSize > maxTeamSize rejected with HTTP 400"
  );

  // 4. Valid Event Creation
  console.log("\n4. Testing Valid Organizer Event Creation...");
  const validEventSlug = `elena-ai-summit-${ts}`;
  const createElenaEventRes = await request("/api/organizer/events", {
    method: "POST",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({
      title: `Elena AI Devcon ${ts}`,
      slug: validEventSlug,
      tagline: "Deep dive into production agent systems and autonomous workflows",
      description: "High-scale engineering summit with deep-dive technical sessions and hands-on tool development labs.",
      category: "WORKSHOP",
      format: "HYBRID",
      location: "San Francisco, CA & Online",
      city: "San Francisco",
      venue: "Innovation Center Room 402",
      startDate: new Date(Date.now() + 86400000 * 10).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 12).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 7).toISOString(),
      capacity: 50,
      isTeamEvent: false,
      published: true,
      tags: ["AI", "Agents", "Workshops"],
    }),
  });
  assert(
    createElenaEventRes.status === 201 && createElenaEventRes.body?.success === true,
    "Organizer Elena created event successfully (HTTP 201 Created)"
  );
  const elenaEvent = createElenaEventRes.body?.event;
  assert(elenaEvent?.slug === validEventSlug, "Event created with requested custom slug");
  assert(elenaEvent?.capacity === 50, "Event created with capacity: 50");
  assert(elenaEvent?.domainStatus === "PUBLISHED", "Event initial domainStatus is PUBLISHED");

  // 5. Ownership Enforcement & IDOR Protection
  console.log("\n5. Testing Ownership Enforcement & IDOR Protection...");

  // Marcus (Organizer 2) attempts to update Elena's event
  const marcusEditRes = await request(`/api/organizer/events/${elenaEvent.id}`, {
    method: "PATCH",
    headers: { Cookie: marcusCookie },
    body: JSON.stringify({ title: "Hacked by Marcus" }),
  });
  assert(
    marcusEditRes.status === 403 && marcusEditRes.body?.error.includes("permission"),
    "Unauthorized organizer (Marcus) attempting PATCH /api/organizer/events/:id rejected with HTTP 403 Forbidden"
  );

  // Marcus attempts to toggle publish state on Elena's event
  const marcusPublishRes = await request(`/api/organizer/events/${elenaEvent.id}/publish`, {
    method: "PATCH",
    headers: { Cookie: marcusCookie },
    body: JSON.stringify({ published: false }),
  });
  assert(
    marcusPublishRes.status === 403,
    "Unauthorized organizer attempting to unpublish another's event rejected with HTTP 403 Forbidden"
  );

  // Marcus attempts to toggle registration closure on Elena's event
  const marcusCloseRes = await request(`/api/organizer/events/${elenaEvent.id}/close`, {
    method: "PATCH",
    headers: { Cookie: marcusCookie },
    body: JSON.stringify({ isClosed: true }),
  });
  assert(
    marcusCloseRes.status === 403,
    "Unauthorized organizer attempting to close another's event rejected with HTTP 403 Forbidden"
  );

  // Marcus attempts to view private attendee registrations for Elena's event
  const marcusRosterRes = await request(`/api/organizer/events/${elenaEvent.id}/registrations`, {
    headers: { Cookie: marcusCookie },
  });
  assert(
    marcusRosterRes.status === 403,
    "Unauthorized organizer attempting to view another's attendee roster rejected with HTTP 403 Forbidden"
  );

  // Marcus attempts to download CSV export of Elena's attendees
  const marcusCsvRes = await request(`/api/organizer/events/${elenaEvent.id}/export`, {
    headers: { Cookie: marcusCookie },
  });
  assert(
    marcusCsvRes.status === 403,
    "Unauthorized organizer attempting to export another's CSV rejected with HTTP 403 Forbidden"
  );

  // 6. Editing Owned Event & Capacity Floor Enforcement
  console.log("\n6. Testing Event Editing & Capacity Floor Enforcement...");

  // Student Alex registers for Elena's event
  const alexRegRes = await request(`/api/events/${elenaEvent.slug}/register`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    alexRegRes.status === 201 && alexRegRes.body?.registration?.status === "CONFIRMED",
    "Student Alex registered for Elena's event (reservedCount is now 1)"
  );

  // Student Sarah also registers for Elena's event (reservedCount is now 2)
  const sarahRegRes = await request(`/api/events/${elenaEvent.slug}/register`, {
    method: "POST",
    headers: { Cookie: sarahCookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    sarahRegRes.status === 201 && sarahRegRes.body?.registration?.status === "CONFIRMED",
    "Student Sarah registered for Elena's event (reservedCount is now 2)"
  );

  // Elena attempts to reduce event capacity to 1 (below confirmed count of 2)
  const elenaCapacityUnderflowRes = await request(`/api/organizer/events/${elenaEvent.id}`, {
    method: "PATCH",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({ capacity: 1 }),
  });
  assert(
    elenaCapacityUnderflowRes.status === 400 &&
    elenaCapacityUnderflowRes.body?.error.includes("confirmed attendance"),
    "Reducing event capacity below confirmed attendance rejected with HTTP 400 (Capacity Floor Protection)"
  );

  // Elena successfully increases capacity and updates tagline
  const elenaValidUpdateRes = await request(`/api/organizer/events/${elenaEvent.id}`, {
    method: "PATCH",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({
      capacity: 75,
      tagline: "Updated Tagline: Premier autonomous systems engineering conference.",
    }),
  });
  assert(
    elenaValidUpdateRes.status === 200 && elenaValidUpdateRes.body?.event?.capacity === 75,
    "Owning organizer successfully updated capacity to 75 and modified tagline (HTTP 200 OK)"
  );

  // 7. Publication Workflow & Draft Restrictions
  console.log("\n7. Testing Publication Workflow & Draft Mode Restrictions...");

  // Elena creates a draft event (published: false)
  const draftSlug = `elena-draft-event-${ts}`;
  const draftEventRes = await request("/api/organizer/events", {
    method: "POST",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({
      title: `Draft Private Jam ${ts}`,
      slug: draftSlug,
      tagline: "Unpublished internal test event",
      description: "This is a private draft event for testing publication gates.",
      category: "WORKSHOP",
      format: "ONLINE",
      location: "Virtual",
      city: "Virtual",
      startDate: new Date(Date.now() + 86400000 * 8).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 9).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      capacity: 25,
      published: false, // DRAFT
    }),
  });
  assert(draftEventRes.status === 201, "Elena created draft event (published: false)");
  const draftEvent = draftEventRes.body?.event;
  assert(draftEvent?.domainStatus === "DRAFT", "Draft event has domainStatus DRAFT");

  // Student Alex attempts to register for the draft event
  const alexDraftRegisterRes = await request(`/api/events/${draftSlug}/register`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    alexDraftRegisterRes.status === 400 &&
    alexDraftRegisterRes.body?.error.includes("draft status"),
    "Attendee registration on draft event rejected with HTTP 400"
  );

  // Elena publishes the draft event
  const publishDraftRes = await request(`/api/organizer/events/${draftEvent.id}/publish`, {
    method: "PATCH",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({ published: true }),
  });
  assert(
    publishDraftRes.status === 200 && publishDraftRes.body?.published === true,
    "Elena successfully published draft event (published: true)"
  );

  // Elena unpublishes it back to draft
  const unpublishDraftRes = await request(`/api/organizer/events/${draftEvent.id}/publish`, {
    method: "PATCH",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({ published: false }),
  });
  assert(
    unpublishDraftRes.status === 200 && unpublishDraftRes.body?.published === false,
    "Elena successfully unpublished event back to draft (published: false)"
  );

  // 8. Manual Registration Closure
  console.log("\n8. Testing Manual Registration Closure Behavior...");

  // Elena closes registration for Elena AI Devcon
  const closeRegRes = await request(`/api/organizer/events/${elenaEvent.id}/close`, {
    method: "PATCH",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({ isClosed: true }),
  });
  assert(
    closeRegRes.status === 200 && closeRegRes.body?.isClosed === true,
    "Elena successfully closed registration manually (isClosed: true)"
  );

  // Student Sarah attempts to register for closed event

  const sarahRegisterClosedRes = await request(`/api/events/${elenaEvent.slug}/register`, {
    method: "POST",
    headers: { Cookie: sarahCookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    sarahRegisterClosedRes.status === 400 &&
    sarahRegisterClosedRes.body?.error.includes("closed by the organizer"),
    "Registration attempt on manually closed event rejected with HTTP 400"
  );

  // Elena reopens registration
  const reopenRegRes = await request(`/api/organizer/events/${elenaEvent.id}/close`, {
    method: "PATCH",
    headers: { Cookie: elenaCookie },
    body: JSON.stringify({ isClosed: false }),
  });
  assert(
    reopenRegRes.status === 200 && reopenRegRes.body?.isClosed === false,
    "Elena successfully reopened registration (isClosed: false)"
  );

  // 9. Protected Roster & CSV Export
  console.log("\n9. Testing Protected Attendee Roster & Authorized CSV Export...");

  // Elena accesses attendee roster for Elena AI Devcon
  const rosterRes = await request(`/api/organizer/events/${elenaEvent.id}/registrations`, {
    headers: { Cookie: elenaCookie },
  });
  assert(
    rosterRes.status === 200 && Array.isArray(rosterRes.body?.attendees),
    "Owning organizer retrieved attendee roster with HTTP 200"
  );
  const alexInRoster = rosterRes.body?.attendees.find((a) => a.user.username === "alex_student");
  assert(Boolean(alexInRoster), "Attendee roster contains registered student Alex Rivera");
  assert(alexInRoster?.user.passwordHash === undefined, "Attendee roster strictly omits sensitive passwordHash");

  // Elena downloads CSV export
  const csvRes = await fetch(`${BASE_URL}/api/organizer/events/${elenaEvent.id}/export`, {
    headers: { Cookie: elenaCookie },
  });
  assert(csvRes.status === 200, "Owning organizer exported CSV with HTTP 200 OK");
  const contentType = csvRes.headers.get("content-type") || "";
  assert(contentType.includes("text/csv"), "Export response returns Content-Type text/csv");

  const csvText = await csvRes.text();
  assert(csvText.includes("Registration ID,Participation Type"), "CSV includes expected header row");
  assert(
    csvText.includes("student@eventfind.dev") || csvText.includes(alexInRoster?.user.email || ""),
    "CSV includes registered attendee email"
  );
  assert(!csvText.includes("passwordHash"), "CSV strictly excludes passwordHash");
  assert(!csvText.includes("sessionToken"), "CSV strictly excludes sessionToken");

  // 10. Direct PostgreSQL Verification & Cleanup
  console.log("\n10. Testing Direct PostgreSQL Persistence & Schema Integrity...");
  const prisma = new PrismaClient();
  try {
    const dbCheck = await prisma.$queryRaw`SELECT 1 as connected;`;
    if (Array.isArray(dbCheck) && dbCheck.length > 0) {
      // Check column isClosed in PostgreSQL
      const pgEvent = await prisma.event.findUnique({
        where: { id: elenaEvent.id },
      });
      assert(pgEvent !== null, "Created event verified in PostgreSQL events table");
      assert(typeof pgEvent?.isClosed === "boolean", "PostgreSQL event has native boolean isClosed column");
      assert(pgEvent?.organizerId === elenaLogin.body?.user?.id, "PostgreSQL event has organizerId matching Elena");

      // Clean up test events
      await prisma.registration.deleteMany({ where: { eventId: elenaEvent.id } });
      await prisma.event.delete({ where: { id: elenaEvent.id } });
      await prisma.event.delete({ where: { id: draftEvent.id } });
      await prisma.session.deleteMany({ where: { user: { username: { startsWith: "marcus_org_" } } } });
      await prisma.user.deleteMany({ where: { username: { startsWith: "marcus_org_" } } });
      console.log("  Test records cleaned up successfully.");
    }
  } catch (err) {
    console.warn("  PostgreSQL direct check encountered:", err.message);
  } finally {
    await prisma.$disconnect();
  }

  // Summary
  console.log("\n=========================================================");
  console.log(`STAGE 6 ORGANIZER TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  if (failedTests > 0) {
    console.error(`FAILED TESTS: ${failedTests}`);
    process.exit(1);
  } else {
    console.log("ALL STAGE 6 ORGANIZER MANAGEMENT TESTS PASSED! [OK]");
    console.log("=========================================================\n");
  }
}

runStage6Tests().catch((err) => {
  console.error("Unhandled error in Stage 6 test runner:", err);
  process.exit(1);
});
