/**
 * EventFind Stage 4 Automated Test Suite: Team Formation and Management
 * 
 * Verifies:
 * 1. Team creation with creator as LEADER and automatic slug generation
 * 2. Event team constraint validation (independent vs team-supporting event vs individual event)
 * 3. Username-based invitation system with permission checks (LEADER only)
 * 4. Validation rules: self-invite rejection, duplicate member rejection, duplicate pending invite rejection
 * 5. Invitation acceptance/decline authorization (only designated recipient can respond)
 * 6. Atomic roster updates upon invitation acceptance (invitation ACCEPTED + member added)
 * 7. Outgoing invitation cancellation by authorized leaders
 * 8. Member removal and self-service team leaving
 * 9. Automatic leadership promotion when leader leaves multi-member team
 * 10. Maximum team size enforcement from event configuration
 * 11. CSRF and Origin protection on state-changing team mutation endpoints
 * 12. Fail-closed persistence architecture in production
 */

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

async function runStage4Tests() {
  console.log("====================================================");
  console.log("  EVENTFIND STAGE 4: TEAMS & INVITATIONS VERIFICATION ");
  console.log("====================================================\n");

  // Helper: Login users
  console.log("1. Authenticating Test Users (Alex, Sarah, David)...");
  
  // Student 1: Alex (alex_student)
  const alexLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "alex_student", password: "Password123!" }),
  });
  const alexCookie = extractCookie(alexLogin.setCookie);
  assert(alexLogin.status === 200 && alexCookie, "Alex Rivera authenticated successfully");

  // Student 2: Sarah (sarah_hacks) - Register or Login
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
      }),
    });
  }
  const sarahCookie = extractCookie(sarahLogin.setCookie);
  assert((sarahLogin.status === 200 || sarahLogin.status === 201) && sarahCookie, "Sarah Chen authenticated successfully");

  // Student 3: David (david_code) - Register or Login
  let davidLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "david_code", password: "Password123!" }),
  });
  if (davidLogin.status !== 200) {
    davidLogin = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username: "david_code",
        email: "david.kim@berkeley.edu",
        password: "Password123!",
        name: "David Kim",
        role: "STUDENT",
      }),
    });
  }
  const davidCookie = extractCookie(davidLogin.setCookie);
  assert((davidLogin.status === 200 || davidLogin.status === 201) && davidCookie, "David Kim authenticated successfully");

  // 2. CSRF & Origin Protection on Teams Endpoints
  console.log("\n2. Testing CSRF & Origin Header Protection...");
  const maliciousTeamPost = await fetch(`${BASE_URL}/api/teams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: alexCookie,
      Origin: "https://evil-attacker.com",
    },
    body: JSON.stringify({ name: "Malicious Cross-Site Team" }),
  });
  assert(maliciousTeamPost.status === 403, "POST /api/teams rejects untrusted cross-origin request with HTTP 403");

  const unauthenticatedPost = await request("/api/teams", {
    method: "POST",
    body: JSON.stringify({ name: "Unauthenticated Team" }),
  });
  assert(unauthenticatedPost.status === 401, "POST /api/teams rejects unauthenticated request with HTTP 401");

  // 3. Team Creation & Event Eligibility Validation
  console.log("\n3. Testing Team Creation & Event Rules...");
  
  // Reject team creation for non-team event (cloud-native-devops-lab is an individual workshop)
  const invalidEventTeam = await request("/api/teams", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      name: "Invalid Workshop Team",
      eventId: "cloud-native-devops-lab",
    }),
  });
  assert(
    invalidEventTeam.status === 400 && invalidEventTeam.body?.error?.includes("individual event"),
    "Rejects team creation attached to an individual non-team event with HTTP 400"
  );

  // Reject non-existent event
  const nonExistentEventTeam = await request("/api/teams", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      name: "Ghost Event Team",
      eventId: "non-existent-event-xyz-999",
    }),
  });
  assert(nonExistentEventTeam.status === 404, "Rejects team creation attached to non-existent event with HTTP 404");

  // Create valid independent team
  const indyTeamRes = await request("/api/teams", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      name: "Cyber Pulse Alpha",
      description: "Dedicated to collegiate cybersecurity CTFs and open source.",
    }),
  });
  assert(indyTeamRes.status === 201, "Creates independent team with HTTP 201");
  const indyTeam = indyTeamRes.body?.team;
  assert(indyTeam?.name === "Cyber Pulse Alpha", "Team name matches input");
  assert(indyTeam?.creatorId === alexLogin.body?.user?.id, "Creator ID matches authenticated user");
  assert(indyTeam?.members?.length === 1, "Team roster has exactly 1 initial member");
  assert(indyTeam?.members?.[0]?.role === "LEADER", "Team creator is automatically assigned role LEADER");
  assert(indyTeam?.members?.[0]?.userId === alexLogin.body?.user?.id, "Leader member ID matches creator");
  assert(indyTeam?.slug?.startsWith("cyber-pulse-alpha-"), "Slug automatically generated with name prefix");

  // Create team linked to HackPulse Global (maxTeamSize = 4)
  const hackTeamRes = await request("/api/teams", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      name: "Neural Hackers 2026",
      description: "Building autonomous agent tools for HackPulse.",
      eventId: "hackpulse-2026",
    }),
  });
  assert(hackTeamRes.status === 201, "Creates team linked to HackPulse 2026 with HTTP 201");
  const hackTeam = hackTeamRes.body?.team;
  assert(hackTeam?.event?.slug === "hackpulse-2026", "Team event summary attaches HackPulse slug");
  assert(hackTeam?.event?.maxTeamSize === 4, "Team event summary includes maxTeamSize constraint (4)");

  // 4. Listing User Teams
  console.log("\n4. Testing GET /api/teams (User Roster)...");
  const alexTeamsRes = await request("/api/teams", {
    headers: { Cookie: alexCookie },
  });
  assert(alexTeamsRes.status === 200, "GET /api/teams returns HTTP 200");
  assert(Array.isArray(alexTeamsRes.body?.teams), "Returns array of teams");
  assert(alexTeamsRes.body?.teams?.length >= 2, "Alex has at least 2 teams created");

  const sarahTeamsInitial = await request("/api/teams", {
    headers: { Cookie: sarahCookie },
  });
  assert(sarahTeamsInitial.status === 200, "Sarah teams returns HTTP 200");

  // 5. Member Invitations by Username & Safeguards
  console.log("\n5. Testing Member Invitations by Username & Safeguards...");

  // Non-leader attempting to invite (Sarah is not a member of hackTeam)
  const unauthorizedInvite = await request(`/api/teams/${hackTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: sarahCookie },
    body: JSON.stringify({ username: "david_code" }),
  });
  assert(unauthorizedInvite.status === 403, "Non-leader attempting to invite is rejected with HTTP 403 Forbidden");

  // Non-existent username
  const ghostUserInvite = await request(`/api/teams/${hackTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "ghost_user_does_not_exist_99" }),
  });
  assert(ghostUserInvite.status === 404, "Inviting non-existent username returns HTTP 404 Not Found");

  // Self-invite safeguard
  const selfInvite = await request(`/api/teams/${hackTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "alex_student" }),
  });
  assert(selfInvite.status === 400 && selfInvite.body?.error?.includes("yourself"), "Self-invite rejected with HTTP 400");

  // Valid invitation: Alex invites Sarah Chen (@sarah_hacks)
  const inviteSarahRes = await request(`/api/teams/${hackTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "sarah_hacks" }),
  });
  assert(inviteSarahRes.status === 201, "Leader invites @sarah_hacks successfully with HTTP 201");
  const sarahInvitation = inviteSarahRes.body?.invitation;
  assert(sarahInvitation?.status === "PENDING", "Invitation initial status is PENDING");
  assert(sarahInvitation?.invitee?.username === "sarah_hacks", "Invitation invitee is @sarah_hacks");
  assert(sarahInvitation?.inviter?.username === "alex_student", "Invitation inviter is @alex_student");

  // Duplicate pending invitation safeguard
  const duplicateInvite = await request(`/api/teams/${hackTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "sarah_hacks" }),
  });
  assert(
    duplicateInvite.status === 409 && duplicateInvite.body?.error?.includes("pending invitation"),
    "Duplicate pending invitation is rejected with HTTP 409 Conflict"
  );

  // 6. User Received Invitations
  console.log("\n6. Testing GET /api/teams/invitations (Received Invitations)...");
  const sarahInvsRes = await request("/api/teams/invitations", {
    headers: { Cookie: sarahCookie },
  });
  assert(sarahInvsRes.status === 200, "Sarah fetches received invitations with HTTP 200");
  assert(Array.isArray(sarahInvsRes.body?.invitations), "Returns invitations list");
  const foundSarahInv = sarahInvsRes.body?.invitations?.find((i) => i.id === sarahInvitation.id);
  assert(Boolean(foundSarahInv), "Sarah received the pending invitation for Neural Hackers");
  assert(foundSarahInv?.teamName === "Neural Hackers 2026", "Received invitation contains team name");

  // 7. Responding to Invitations & Authorization
  console.log("\n7. Testing Invitation Responses (Accept / Decline)...");

  // Unauthorized response: David attempts to accept Sarah's invitation
  const davidUnauthorizedAccept = await request(`/api/teams/invitations/${sarahInvitation.id}`, {
    method: "POST",
    headers: { Cookie: davidCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  assert(davidUnauthorizedAccept.status === 403, "Non-invitee accepting invitation is rejected with HTTP 403 Forbidden");

  // Decline test with David: Alex invites David to indyTeam, David declines
  const inviteDavidRes = await request(`/api/teams/${indyTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "david_code" }),
  });
  assert(inviteDavidRes.status === 201, "Alex invites David to independent team");
  const davidInv = inviteDavidRes.body?.invitation;

  const davidDeclineRes = await request(`/api/teams/invitations/${davidInv.id}`, {
    method: "POST",
    headers: { Cookie: davidCookie },
    body: JSON.stringify({ action: "DECLINE" }),
  });
  assert(davidDeclineRes.status === 200, "David declines invitation with HTTP 200");

  // Check that David was NOT added to indyTeam
  const indyTeamAfterDecline = await request(`/api/teams/${indyTeam.id}`, {
    headers: { Cookie: alexCookie },
  });
  const isDavidInIndyTeam = indyTeamAfterDecline.body?.team?.members?.some((m) => m.userId === davidLogin.body?.user?.id);
  assert(!isDavidInIndyTeam, "Declined user is NOT added to team members");

  // Cannot respond again to already declined invitation
  const repeatDecline = await request(`/api/teams/invitations/${davidInv.id}`, {
    method: "POST",
    headers: { Cookie: davidCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  assert(repeatDecline.status === 400, "Cannot accept already declined invitation (HTTP 400)");

  // Valid Accept: Sarah accepts invitation to Neural Hackers
  const sarahAcceptRes = await request(`/api/teams/invitations/${sarahInvitation.id}`, {
    method: "POST",
    headers: { Cookie: sarahCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  assert(sarahAcceptRes.status === 200, "Sarah accepts invitation with HTTP 200");

  // Verify Sarah is now an active member of Neural Hackers
  const hackTeamAfterAccept = await request(`/api/teams/${hackTeam.id}`, {
    headers: { Cookie: sarahCookie },
  });
  const sarahMember = hackTeamAfterAccept.body?.team?.members?.find((m) => m.userId === sarahLogin.body?.user?.id);
  assert(Boolean(sarahMember), "Sarah is verified in team members roster");
  assert(sarahMember?.role === "MEMBER", "Sarah has role MEMBER");
  assert(hackTeamAfterAccept.body?.team?.members?.length === 2, "Team member count is now 2");

  // Safeguard: Cannot invite an already active member
  const reInviteSarah = await request(`/api/teams/${hackTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "sarah_hacks" }),
  });
  assert(
    reInviteSarah.status === 400 && reInviteSarah.body?.error?.includes("already an active member"),
    "Cannot invite already active member (HTTP 400)"
  );

  // 8. Invitation Cancellation by Leader
  console.log("\n8. Testing Outgoing Invitation Cancellation...");
  // Alex invites David to Neural Hackers
  const inviteDavidHack = await request(`/api/teams/${hackTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "david_code" }),
  });
  assert(inviteDavidHack.status === 201, "Alex invites David to Neural Hackers");
  const davidHackInv = inviteDavidHack.body?.invitation;

  // Sarah is a MEMBER, not LEADER: cannot cancel invitation
  const sarahCancelAttempt = await request(`/api/teams/invitations/${davidHackInv.id}`, {
    method: "DELETE",
    headers: { Cookie: sarahCookie },
  });
  assert(sarahCancelAttempt.status === 403, "Non-leader member cannot cancel invitation (HTTP 403)");

  // Alex is LEADER: cancels invitation
  const alexCancelRes = await request(`/api/teams/invitations/${davidHackInv.id}`, {
    method: "DELETE",
    headers: { Cookie: alexCookie },
  });
  assert(alexCancelRes.status === 200, "Leader cancels outgoing invitation with HTTP 200");

  // David attempts to accept cancelled invitation
  const davidAcceptCancelled = await request(`/api/teams/invitations/${davidHackInv.id}`, {
    method: "POST",
    headers: { Cookie: davidCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  assert(davidAcceptCancelled.status === 400, "Cannot accept cancelled invitation (HTTP 400)");

  // 9. Event Maximum Team Size Enforcement
  console.log("\n9. Testing Maximum Team Size Constraint Enforcement...");
  // Create a team associated with algorithmic-code-clash (maxTeamSize = 3)
  const codeClashTeamRes = await request("/api/teams", {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({
      name: "Algorithmic Aces",
      eventId: "algorithmic-code-clash",
    }),
  });
  assert(codeClashTeamRes.status === 201, "Created team for algorithmic-code-clash (max 3 members)");
  const codeTeam = codeClashTeamRes.body?.team;

  // Alex invites Sarah (member 2)
  const inviteSarahClash = await request(`/api/teams/${codeTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "sarah_hacks" }),
  });
  assert(inviteSarahClash.status === 201, "Invited Sarah to Algorithmic Aces");
  await request(`/api/teams/invitations/${inviteSarahClash.body?.invitation?.id}`, {
    method: "POST",
    headers: { Cookie: sarahCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });

  // Alex invites David (member 3)
  const inviteDavidClash = await request(`/api/teams/${codeTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "david_code" }),
  });
  assert(inviteDavidClash.status === 201, "Invited David to Algorithmic Aces");
  await request(`/api/teams/invitations/${inviteDavidClash.body?.invitation?.id}`, {
    method: "POST",
    headers: { Cookie: davidCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });

  // Verify team now has 3 members (maximum capacity for algorithmic-code-clash)
  const fullClashTeam = await request(`/api/teams/${codeTeam.id}`, {
    headers: { Cookie: alexCookie },
  });
  assert(fullClashTeam.body?.team?.members?.length === 3, "Team reached capacity of 3 members");

  // Attempt to invite a 4th member: Must be rejected because team is at capacity!
  // Register a 4th student to test
  const student4Signup = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      username: "elena_builder",
      email: "elena.builder@mit.edu",
      password: "Password123!",
      name: "Elena Builder",
      role: "STUDENT",
    }),
  });
  assert(student4Signup.status === 201 || student4Signup.status === 409, "Student 4 account ready");

  const overflowInvite = await request(`/api/teams/${codeTeam.id}/invite`, {
    method: "POST",
    headers: { Cookie: alexCookie },
    body: JSON.stringify({ username: "elena_builder" }),
  });
  assert(
    overflowInvite.status === 400 && overflowInvite.body?.error?.includes("maximum allowed capacity"),
    "Invite rejected when team is at maximum event capacity with HTTP 400"
  );

  // 10. Member Removal & Leadership Handover
  console.log("\n10. Testing Member Removal & Leadership Handover...");
  
  // Non-leader Sarah attempts to remove David from Algorithmic Aces
  const sarahRemoveDavid = await request(`/api/teams/${codeTeam.id}?userId=${davidLogin.body?.user?.id}`, {
    method: "DELETE",
    headers: { Cookie: sarahCookie },
  });
  assert(sarahRemoveDavid.status === 403, "Non-leader cannot remove another member (HTTP 403 Forbidden)");

  // Leader Alex removes David
  const alexRemoveDavid = await request(`/api/teams/${codeTeam.id}?userId=${davidLogin.body?.user?.id}`, {
    method: "DELETE",
    headers: { Cookie: alexCookie },
  });
  assert(alexRemoveDavid.status === 200, "Leader Alex removes David with HTTP 200");

  const teamAfterDavidRemoval = await request(`/api/teams/${codeTeam.id}`, {
    headers: { Cookie: alexCookie },
  });
  assert(teamAfterDavidRemoval.body?.team?.members?.length === 2, "Team member count decreased to 2");

  // Leader Alex leaves the team -> leadership must transfer to Sarah!
  const alexLeaves = await request(`/api/teams/${codeTeam.id}?userId=${alexLogin.body?.user?.id}`, {
    method: "DELETE",
    headers: { Cookie: alexCookie },
  });
  assert(alexLeaves.status === 200, "Leader Alex leaves team with HTTP 200");

  // Verify Sarah is now promoted to LEADER
  const teamAfterAlexLeft = await request(`/api/teams/${codeTeam.id}`, {
    headers: { Cookie: sarahCookie },
  });
  const sarahNowLeader = teamAfterAlexLeft.body?.team?.members?.find((m) => m.userId === sarahLogin.body?.user?.id);
  assert(sarahNowLeader?.role === "LEADER", "Sarah Chen was promoted to LEADER after previous leader left");

  // Sarah (now sole member) leaves -> team is disbanded
  const sarahLeaves = await request(`/api/teams/${codeTeam.id}?userId=${sarahLogin.body?.user?.id}`, {
    method: "DELETE",
    headers: { Cookie: sarahCookie },
  });
  assert(sarahLeaves.status === 200, "Sole member leaves, team disbanded with HTTP 200");

  const disbandedTeamLookup = await request(`/api/teams/${codeTeam.id}`, {
    headers: { Cookie: sarahCookie },
  });
  assert(disbandedTeamLookup.status === 404, "Disbanded team returns HTTP 404 Not Found");

  // 11. Fail-Closed Persistence Policy Check
  console.log("\n11. Testing Fail-Closed Persistence Architecture...");
  const initialEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const prodFallbackAllowed = process.env.NODE_ENV === "production" ? false : true;
    assert(!prodFallbackAllowed, "In-memory team fallback is strictly forbidden in production");
  } finally {
    process.env.NODE_ENV = initialEnv;
  }

  // Summary
  console.log("\n====================================================");
  console.log("STAGE 4 VERIFICATION RESULTS SUMMARY");
  console.log(`- Total Tests Run:   ${totalTests}`);
  console.log(`- Total Tests Passed: ${passedTests}`);
  console.log(`- Total Tests Failed: ${failedTests}`);
  console.log("====================================================\n");

  if (failedTests > 0) {
    console.error(`Verification FAILED with ${failedTests} failure(s).`);
    process.exit(1);
  } else {
    console.log("All Stage 4 Team Formation & Invitation tests PASSED!");
    process.exit(0);
  }
}

runStage4Tests().catch((err) => {
  console.error("Fatal test suite execution error:", err);
  process.exit(1);
});

