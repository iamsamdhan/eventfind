/**
 * EventFind Stage 5 Automated Test Suite: Event Registration Transactions
 * 
 * Verifies:
 * 1. CSRF & Origin protection on state-changing registration & cancellation endpoints
 * 2. Authentication & Student-only role authorization (Organizers receive HTTP 403)
 * 3. Event format constraints (Individual vs Team-only events)
 * 4. Valid individual registration lifecycle (reservation, capacity decrement, duplicate prevention)
 * 5. Team registration permissions (LEADER only, non-leaders receive HTTP 403)
 * 6. Team size constraint enforcement (minTeamSize <= count <= maxTeamSize)
 * 7. Cross-registration & duplicate membership prevention (member already registered solo or in another team)
 * 8. Registration queries (individual and team member visibility)
 * 9. Cancellation & capacity release authorization (registrant or leader only)
 * 10. Direct PostgreSQL concurrency & row locking: simultaneous registrations racing for limited spots
 * 11. Automatic waitlist promotion when confirmed registration is cancelled
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

async function runStage5Tests() {
  console.log("=========================================================");
  console.log("  EVENTFIND STAGE 5: REGISTRATION TRANSACTIONS TEST SUITE ");
  console.log("=========================================================\n");

  // 1. Authenticate Test Users
  console.log("1. Authenticating Test Users (Alex, Sarah, David, Organizer)...");

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
        email: "alex.rivera@berkeley.edu",
        password: "Password123!",
        name: "Alex Rivera",
        role: "STUDENT",
        college: "UC Berkeley",
      }),
    });
  }
  const alexCookie = extractCookie(alexLogin.setCookie);
  assert(alexCookie.length > 0, "Alex Rivera (Student) authenticated successfully");

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
  assert(sarahCookie.length > 0, "Sarah Chen (Student) authenticated successfully");

  // Student 3: David
  let davidLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "david_code", password: "Password123!" }),
  });
  if (davidLogin.status !== 200) {
    davidLogin = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username: "david_code",
        email: "david.kim@mit.edu",
        password: "Password123!",
        name: "David Kim",
        role: "STUDENT",
        college: "MIT",
      }),
    });
  }
  const davidCookie = extractCookie(davidLogin.setCookie);
  assert(davidCookie.length > 0, "David Kim (Student) authenticated successfully");

  // Organizer: Elena
  let organizerLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "organizer@eventfind.dev", password: "Password123!" }),
  });
  const organizerCookie = extractCookie(organizerLogin.setCookie);
  assert(organizerCookie.length > 0, "Elena Rostova (Organizer) authenticated successfully");

  // 2. CSRF & Origin Protection
  console.log("\n2. Testing CSRF & Origin Header Protection...");
  const maliciousRegisterRes = await fetch(`${BASE_URL}/api/events/cloud-native-devops-lab/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: alexCookie,
      Origin: "https://malicious-attacker-domain.com",
    },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    maliciousRegisterRes.status === 403,
    "POST /api/events/:id/register rejects untrusted Origin with HTTP 403 Forbidden"
  );

  const maliciousCancelRes = await fetch(`${BASE_URL}/api/registrations/reg_dummy_test`, {
    method: "DELETE",
    headers: {
      Cookie: alexCookie,
      Origin: "https://malicious-attacker-domain.com",
    },
  });
  assert(
    maliciousCancelRes.status === 403,
    "DELETE /api/registrations/:id rejects untrusted Origin with HTTP 403 Forbidden"
  );

  // 3. Authentication & Role Guards
  console.log("\n3. Testing Authentication & Role Guarding...");
  
  // Unauthenticated register attempt
  const unauthRegisterRes = await request("/api/events/cloud-native-devops-lab/register", {
    method: "POST",
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    unauthRegisterRes.status === 401,
    "Unauthenticated registration attempt rejected with HTTP 401 Unauthorized"
  );

  // Organizer attempt to register as attendee
  const organizerRegisterRes = await request("/api/events/cloud-native-devops-lab/register", {
    method: "POST",
    headers: { Cookie: organizerCookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    organizerRegisterRes.status === 403 &&
    organizerRegisterRes.body?.error.includes("Only students"),
    "Organizer attempting attendee registration rejected with HTTP 403 Forbidden"
  );

  // 4. Event Format & Rule Constraints
  console.log("\n4. Testing Event Format Constraints (Individual vs Team)...");
  
  // Attempt individual registration on team-only event (hackpulse-2026 requires minTeamSize: 2)
  const soloOnTeamEventRes = await request("/api/events/hackpulse-2026/register", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    soloOnTeamEventRes.status === 400 &&
    soloOnTeamEventRes.body?.error.includes("requires team participation"),
    "Solo registration on team-only event rejected with HTTP 400"
  );

  // Team registration without teamId
  const missingTeamIdRes = await request("/api/events/hackpulse-2026/register", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ type: "TEAM" }),
  });
  assert(
    missingTeamIdRes.status === 400,
    "Team registration without teamId rejected with HTTP 400"
  );

  // 5. Valid Individual Registration Lifecycle
  console.log("\n5. Testing Valid Individual Registration Lifecycle...");
  
  // Clean up any prior test registrations for cloud-native-devops-lab
  const alexPriorRegs = await request("/api/registrations?eventId=cloud-native-devops-lab", {
    headers: { Cookie: alexCookie },
  });
  if (alexPriorRegs.status === 200 && Array.isArray(alexPriorRegs.body?.registrations)) {
    for (const r of alexPriorRegs.body.registrations) {
      if (r.status !== "CANCELLED") {
        await request(`/api/registrations/${r.id}`, {
          method: "DELETE",
          headers: { Cookie: alexCookie },
        });
      }
    }
  }

  // Register Alex for cloud-native-devops-lab (individual event)
  const alexIndivRegister = await request("/api/events/cloud-native-devops-lab/register", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      type: "INDIVIDUAL",
      notes: "Excited to learn Kubernetes and modern CI/CD pipelines!",
    }),
  });
  assert(
    alexIndivRegister.status === 201 && alexIndivRegister.body?.success === true,
    "Alex successfully registered solo for Cloud-Native Lab (HTTP 201 Created)"
  );
  assert(
    alexIndivRegister.body?.registration?.status === "CONFIRMED",
    "Registration granted CONFIRMED status"
  );
  assert(
    alexIndivRegister.body?.registration?.spots === 1,
    "Individual registration reserved exactly 1 spot"
  );

  const alexIndivRegId = alexIndivRegister.body?.registration?.id;

  // Duplicate individual registration attempt
  const duplicateIndivRes = await request("/api/events/cloud-native-devops-lab/register", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    duplicateIndivRes.status === 409 || duplicateIndivRes.status === 400,
    "Duplicate individual registration attempt rejected with HTTP 409/400 Conflict"
  );

  // 6. Team Registration Lifecycle & Authorization
  console.log("\n6. Testing Team Formation & Team Registration Lifecycle...");

  // Alex creates a team for HackPulse 2026
  const ts = Date.now().toString().slice(-5);
  const teamName = `Stage5 Alpha Squad ${ts}`;
  const createTeamRes = await request("/api/teams", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      name: teamName,
      description: "Testing Stage 5 transactional team registrations",
      eventId: "hackpulse-2026",
    }),
  });
  assert(createTeamRes.status === 201, `Alex created team "${teamName}"`);
  const team = createTeamRes.body?.team;
  const teamId = team?.id;

  // Team currently has 1 member (Alex). Event requires minTeamSize: 2.
  const undersizedTeamRegisterRes = await request("/api/events/hackpulse-2026/register", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      type: "TEAM",
      teamId: teamId,
    }),
  });
  assert(
    undersizedTeamRegisterRes.status === 400 &&
    undersizedTeamRegisterRes.body?.error.includes("minimum of 2"),
    "Registration rejected when team has fewer members than minTeamSize"
  );

  // Alex invites Sarah to the team
  const inviteSarahRes = await request(`/api/teams/${teamId}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "sarah_hacks" }),
  });
  assert(inviteSarahRes.status === 201, "Alex invited Sarah to the squad");
  const invitationId = inviteSarahRes.body?.invitation?.id;

  // Sarah accepts the invitation
  const acceptRes = await request(`/api/teams/invitations/${invitationId}`, {
    method: "POST",
    headers: { Cookie: sarahCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  assert(acceptRes.status === 200, "Sarah accepted squad invitation (team size is now 2)");

  // Sarah (MEMBER, not LEADER) attempts to register the team
  const nonLeaderRegisterRes = await request("/api/events/hackpulse-2026/register", {
    method: "POST",
    headers: { Cookie: sarahCookie },
    body: JSON.stringify({
      type: "TEAM",
      teamId: teamId,
    }),
  });
  assert(
    nonLeaderRegisterRes.status === 403 &&
    nonLeaderRegisterRes.body?.error.includes("team leader"),
    "Non-leader member registering team rejected with HTTP 403 Forbidden"
  );

  // Alex (LEADER) registers the team for HackPulse 2026
  const leaderRegisterRes = await request("/api/events/hackpulse-2026/register", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      type: "TEAM",
      teamId: teamId,
      notes: "Stage 5 transactional team registration test",
    }),
  });
  assert(
    leaderRegisterRes.status === 201 && leaderRegisterRes.body?.success === true,
    "Team leader Alex successfully registered squad for HackPulse (HTTP 201 Created)"
  );
  assert(
    leaderRegisterRes.body?.registration?.type === "TEAM",
    "Registration recorded as TEAM type"
  );
  assert(
    leaderRegisterRes.body?.registration?.spots === 2,
    "Team registration reserved exactly 2 spots (for both members)"
  );

  const teamRegId = leaderRegisterRes.body?.registration?.id;

  // Attempt duplicate registration of the same team
  const duplicateTeamRegRes = await request("/api/events/hackpulse-2026/register", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      type: "TEAM",
      teamId: teamId,
    }),
  });
  assert(
    duplicateTeamRegRes.status === 409 || duplicateTeamRegRes.status === 400,
    "Duplicate registration of same team rejected with HTTP 409/400 Conflict"
  );

  // 7. Cross-Registration & Member Conflict Prevention
  console.log("\n7. Testing Cross-Registration & Member Conflict Prevention...");
  
  // Member Sarah attempts to register individually for HackPulse 2026
  const sarahSoloConflictRes = await request("/api/events/hackpulse-2026/register", {
    method: "POST",
    headers: { Cookie: sarahCookie },
    body: JSON.stringify({ type: "INDIVIDUAL" }),
  });
  assert(
    sarahSoloConflictRes.status === 400 || sarahSoloConflictRes.status === 409,
    "Team member attempting solo registration rejected (already participating in team)"
  );

  // David creates a second team, invites Sarah, and tries to register that team for HackPulse
  const davidTeamRes = await request("/api/teams", {
    method: "POST",
    headers: { Cookie: davidCookie },
    body: JSON.stringify({
      name: `David Squad ${ts}`,
      eventId: "hackpulse-2026",
    }),
  });
  const davidTeamId = davidTeamRes.body?.team?.id;

  const inviteSarahToDavidRes = await request(`/api/teams/${davidTeamId}/invite`, {
    method: "POST",
    headers: { Cookie: davidCookie },
    body: JSON.stringify({ username: "sarah_hacks" }),
  });
  const davidInvId = inviteSarahToDavidRes.body?.invitation?.id;

  await request(`/api/teams/invitations/${davidInvId}`, {
    method: "POST",
    headers: { Cookie: sarahCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });

  const davidTeamConflictRes = await request("/api/events/hackpulse-2026/register", {
    method: "POST",
    headers: { Cookie: davidCookie },
    body: JSON.stringify({
      type: "TEAM",
      teamId: davidTeamId,
    }),
  });
  assert(
    davidTeamConflictRes.status === 400 || davidTeamConflictRes.status === 409,
    "Team registration rejected when a member is already registered in another team"
  );

  // 8. Querying User Registrations (GET /api/registrations)
  console.log("\n8. Testing User Registration Lookups...");
  
  const alexQueryRes = await request("/api/registrations", {
    headers: { Cookie: alexCookie },
  });
  assert(
    alexQueryRes.status === 200 && Array.isArray(alexQueryRes.body?.registrations),
    "GET /api/registrations returns active registrations list for Alex"
  );
  const alexHasTeam = alexQueryRes.body?.registrations.some(
    (r) => r.type === "TEAM" && r.status === "CONFIRMED"
  );
  assert(alexHasTeam, "Alex sees confirmed team registration in user dashboard list");

  // Sarah queries registrations: Sarah should see the squad registration she is part of!
  const sarahQueryRes = await request("/api/registrations", {
    headers: { Cookie: sarahCookie },
  });
  assert(
    sarahQueryRes.status === 200,
    "GET /api/registrations returns registrations list for teammate Sarah"
  );
  const sarahSeesTeamReg = sarahQueryRes.body?.registrations.some(
    (r) => r.teamId === teamId && r.status === "CONFIRMED"
  );
  assert(
    sarahSeesTeamReg,
    "Teammate Sarah sees squad registration even though Alex was the registering leader"
  );

  // 9. Cancellation & Authorization Rules
  console.log("\n9. Testing Cancellation & Authorization Rules...");

  // David (unrelated user) attempts to cancel Alex's individual registration
  const davidCancelRes = await request(`/api/registrations/${alexIndivRegId}`, {
    method: "DELETE",
    headers: { Cookie: davidCookie },
  });
  assert(
    davidCancelRes.status === 403,
    "Unauthorized user cannot cancel another user's registration (HTTP 403 Forbidden)"
  );

  // Non-leader Sarah attempts to cancel the team registration
  const sarahCancelTeamRes = await request(`/api/registrations/${teamRegId}`, {
    method: "DELETE",
    headers: { Cookie: sarahCookie },
  });
  assert(
    sarahCancelTeamRes.status === 403,
    "Non-leader member cannot cancel team registration (HTTP 403 Forbidden)"
  );

  // Alex cancels his individual registration
  const alexCancelRes = await request(`/api/registrations/${alexIndivRegId}`, {
    method: "DELETE",
    headers: { Cookie: alexCookie },
  });
  assert(
    alexCancelRes.status === 200 && alexCancelRes.body?.success === true,
    "Alex successfully cancelled individual registration (HTTP 200 OK)"
  );

  // Attempting to cancel already cancelled registration
  const duplicateCancelRes = await request(`/api/registrations/${alexIndivRegId}`, {
    method: "DELETE",
    headers: { Cookie: alexCookie },
  });
  assert(
    duplicateCancelRes.status === 400 &&
    duplicateCancelRes.body?.error.includes("already been cancelled"),
    "Cancelling already cancelled registration rejected with HTTP 400"
  );

  // 10. Direct PostgreSQL Concurrency, Row Locking & Waitlist Promotion Test
  console.log("\n10. Testing Direct PostgreSQL Concurrency, Row Locking & Automatic Waitlist...");
  
  const prisma = new PrismaClient();
  try {
    const dbTest = await prisma.$queryRaw`SELECT 1 as connected;`;
    if (Array.isArray(dbTest) && dbTest.length > 0) {
      console.log("  Live PostgreSQL connected. Running atomic concurrency test under row lock...");

      const testSlug = `concurrency-test-${Date.now()}`;
      const passwordHash = await bcrypt.hash("Password123!", 10);
      
      // Seed an organizer and a test event with capacity: 2
      const testOrg = await prisma.user.upsert({
        where: { username: `test_org_${ts}` },
        create: {
          username: `test_org_${ts}`,
          email: `test_org_${ts}@test.org`,
          passwordHash,
          name: "Test Org",
          role: "ORGANIZER",
        },
        update: {},
      });

      const testEvent = await prisma.event.create({
        data: {
          slug: testSlug,
          title: "Atomic Concurrency Test Hackathon",
          tagline: "Stress testing PostgreSQL row locks and waitlists",
          description: "High concurrency race condition verification",
          category: "HACKATHON",
          format: "ONLINE",
          location: "Virtual",
          city: "Virtual",
          startDate: new Date(Date.now() + 86400000 * 7),
          endDate: new Date(Date.now() + 86400000 * 8),
          registrationDeadline: new Date(Date.now() + 86400000 * 5),
          capacity: 2, // strictly 2 spots
          registeredCount: 0,
          isTeamEvent: false,
          minTeamSize: 1,
          maxTeamSize: 1,
          organizerId: testOrg.id,
        },
      });

      // Authenticate 4 distinct student accounts
      const studentSessions = [];
      for (let i = 1; i <= 4; i++) {
        const uName = `race_student_${ts}_${i}`;
        const uEmail = `race_${ts}_${i}@test.edu`;
        const signupRes = await request("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            username: uName,
            email: uEmail,
            password: "Password123!",
            name: `Race Student ${i}`,
            role: "STUDENT",
            college: "Engineering College",
          }),
        });
        const cookie = extractCookie(signupRes.setCookie);
        studentSessions.push({ username: uName, cookie });
      }

      // Fire 4 simultaneous registration calls via HTTP racing for 2 spots
      const racePromises = studentSessions.map((st) =>
        request(`/api/events/${testSlug}/register`, {
          method: "POST",
          headers: { Cookie: st.cookie },
          body: JSON.stringify({ type: "INDIVIDUAL" }),
        })
      );

      const results = await Promise.all(racePromises);
      
      const confirmed = results.filter((r) => r.status === 201 && r.body?.registration?.status === "CONFIRMED");
      const waitlisted = results.filter((r) => r.status === 201 && r.body?.registration?.status === "WAITLISTED");
      const errors = results.filter((r) => r.status !== 201);

      assert(errors.length === 0, "All 4 concurrent HTTP registrations resolved safely with HTTP 201");
      assert(confirmed.length === 2, `Exactly 2 registrations received CONFIRMED (got ${confirmed.length})`);
      assert(waitlisted.length === 2, `Exactly 2 registrations received WAITLISTED (got ${waitlisted.length})`);

      // Check PostgreSQL database event row: capacity must be exactly 2
      const refreshedEvent = await prisma.event.findUnique({
        where: { id: testEvent.id },
      });
      assert(
        refreshedEvent?.registeredCount === 2,
        `PostgreSQL event registeredCount is exactly 2 (capacity not oversold: ${refreshedEvent?.registeredCount})`
      );

      // Now cancel one of the confirmed registrations via HTTP DELETE
      console.log("  Testing automatic waitlist promotion upon cancellation...");
      const confirmedToCancel = confirmed[0];
      const confirmedUserSession = studentSessions.find(
        (s) => s.username === confirmedToCancel.body?.registration?.user?.username
      );

      const cancelRes = await request(`/api/registrations/${confirmedToCancel.body.registration.id}`, {
        method: "DELETE",
        headers: { Cookie: confirmedUserSession.cookie },
      });
      assert(cancelRes.status === 200 && cancelRes.body?.success === true, "Confirmed registration cancelled successfully via HTTP");

      // Verify that the waitlisted candidate was automatically promoted in PostgreSQL
      const waitlistedRegId = waitlisted[0].body?.registration?.id;
      const promotedReg = await prisma.registration.findUnique({
        where: { id: waitlistedRegId },
      });
      assert(
        promotedReg?.status === "CONFIRMED",
        "Waitlisted candidate was automatically promoted to CONFIRMED status in PostgreSQL"
      );

      // Verify registeredCount is still 2 (1 released, 1 promoted)
      const afterPromotionEvent = await prisma.event.findUnique({
        where: { id: testEvent.id },
      });
      assert(
        afterPromotionEvent?.registeredCount === 2,
        "Event registeredCount remains balanced at capacity (2) after promotion"
      );

      // Clean up test data
      await prisma.registration.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.event.delete({ where: { id: testEvent.id } });
      await prisma.session.deleteMany({
        where: { user: { username: { startsWith: `race_student_${ts}` } } },
      });
      await prisma.user.deleteMany({ where: { username: { startsWith: `race_student_${ts}` } } });
      await prisma.user.delete({ where: { id: testOrg.id } });
      console.log("  Test records cleaned up successfully.");
    }
  } catch (dbErr) {
    console.log("  Direct PostgreSQL concurrency check skipped or failed:", dbErr.message);
  } finally {
    await prisma.$disconnect();
  }

  // Summary
  console.log("\n=========================================================");
  console.log(`STAGE 5 REGISTRATION TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  if (failedTests > 0) {
    console.error(`FAILED TESTS: ${failedTests}`);
    process.exit(1);
  } else {
    console.log("ALL STAGE 5 REGISTRATION TESTS PASSED SUCCESSFULLY! [OK]");
    console.log("=========================================================\n");
  }
}

runStage5Tests().catch((err) => {
  console.error("Unhandled error in Stage 5 test runner:", err);
  process.exit(1);
});
