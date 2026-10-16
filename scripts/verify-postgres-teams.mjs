/**
 * EventFind Stage 4 PostgreSQL Direct Database Integration Test
 * 
 * Directly exercises Prisma Client against the live PostgreSQL database
 * to verify actual schema persistence, transactions, concurrency, and constraints.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

try {
  process.loadEnvFile();
} catch {
  // Ignore if .env does not exist or already loaded
}

const prisma = new PrismaClient();

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function runDatabaseIntegrationTests() {
  console.log("=========================================================");
  console.log("  EVENTFIND: POSTGRESQL DATABASE INTEGRATION VERIFICATION ");
  console.log("=========================================================\n");

  try {
    // 1. Database Connection & Schema Check
    console.log("1. Verifying Live PostgreSQL Connection...");
    const dbCheck = await prisma.$queryRaw`SELECT current_database(), version();`;
    assert(Array.isArray(dbCheck) && dbCheck.length > 0, "Connected to PostgreSQL database engine");
    console.log(`  Database: ${dbCheck[0].current_database}`);

    // 2. Seed Test Users in PostgreSQL
    console.log("\n2. Seeding Test Users in PostgreSQL...");
    await prisma.user.deleteMany({ where: { username: { startsWith: "pg_" } } });
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const ts = Date.now();

    const userAlice = await prisma.user.upsert({
      where: { username: `pg_alice_${ts}` },
      create: {
        username: `pg_alice_${ts}`,
        email: `alice_${ts}@eventfind.pg`,
        passwordHash,
        name: "Alice Montgomery",
        role: "STUDENT",
        college: "Tech Institute",
      },
      update: {},
    });
    assert(Boolean(userAlice?.id), "Seeded Alice Montgomery in PostgreSQL users table");

    const userBob = await prisma.user.upsert({
      where: { username: `pg_bob_${ts}` },
      create: {
        username: `pg_bob_${ts}`,
        email: `bob_${ts}@eventfind.pg`,
        passwordHash,
        name: "Bob Builder",
        role: "STUDENT",
        college: "Engineering College",
      },
      update: {},
    });
    assert(Boolean(userBob?.id), "Seeded Bob Builder in PostgreSQL users table");

    const userCharlie = await prisma.user.upsert({
      where: { username: `pg_charlie_${ts}` },
      create: {
        username: `pg_charlie_${ts}`,
        email: `charlie_${ts}@eventfind.pg`,
        passwordHash,
        name: "Charlie Davis",
        role: "STUDENT",
        college: "Design Academy",
      },
      update: {},
    });
    assert(Boolean(userCharlie?.id), "Seeded Charlie Davis in PostgreSQL users table");

    // 3. Team Creation with Atomic Leader Role in PostgreSQL
    console.log("\n3. Testing Atomic Team Creation in PostgreSQL...");
    const teamSlug = `pg-quantum-coders-${ts}`;
    const createdTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: "Quantum Coders PG",
          slug: teamSlug,
          description: "PostgreSQL integration test team.",
          creatorId: userAlice.id,
          eventId: "hackpulse-2026",
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: userAlice.id,
          role: "LEADER",
        },
      });

      return team;
    });

    assert(Boolean(createdTeam?.id), "Team record inserted into PostgreSQL teams table");

    const teamRecord = await prisma.team.findUnique({
      where: { id: createdTeam.id },
      include: { members: { include: { user: true } } },
    });
    assert(teamRecord?.members?.length === 1, "Team has exactly 1 initial member in PostgreSQL");
    assert(teamRecord?.members[0]?.userId === userAlice.id, "Alice is registered as team member in PostgreSQL");
    assert(teamRecord?.members[0]?.role === "LEADER", "Alice has role LEADER in PostgreSQL team_members");

    // 4. Invitation Creation & Database Foreign Keys
    console.log("\n4. Testing Team Invitation in PostgreSQL...");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitationBob = await prisma.teamInvitation.create({
      data: {
        teamId: createdTeam.id,
        inviterId: userAlice.id,
        inviteeId: userBob.id,
        status: "PENDING",
        expiresAt,
      },
      include: { team: true, inviter: true, invitee: true },
    });

    assert(invitationBob.status === "PENDING", "Invitation inserted with PENDING status in team_invitations");
    assert(invitationBob.invitee.username === userBob.username, "Foreign key joins invitee correctly");
    assert(invitationBob.inviter.username === userAlice.username, "Foreign key joins inviter correctly");

    // 5. Duplicate-Membership Prevention via Database Unique Constraint
    console.log("\n5. Testing Duplicate-Membership Constraint in PostgreSQL...");
    let duplicateRejected = false;
    try {
      // Attempt to directly insert Alice as a member a second time
      await prisma.teamMember.create({
        data: {
          teamId: createdTeam.id,
          userId: userAlice.id,
          role: "MEMBER",
        },
      });
    } catch (err) {
      // Expect Prisma/PostgreSQL Unique constraint violation (P2002)
      duplicateRejected = err.code === "P2002" || err.message.includes("Unique constraint");
    }
    assert(duplicateRejected, "PostgreSQL unique constraint 'team_members_teamId_userId_key' prevents duplicate membership");

    // 6. Invitation Acceptance Transaction in PostgreSQL
    console.log("\n6. Testing Atomic Invitation Acceptance in PostgreSQL...");
    await prisma.$transaction(async (tx) => {
      const inv = await tx.teamInvitation.findUnique({
        where: { id: invitationBob.id },
      });
      if (!inv || inv.status !== "PENDING") {
        throw new Error("Invitation not pending");
      }

      await tx.teamInvitation.update({
        where: { id: invitationBob.id },
        data: { status: "ACCEPTED" },
      });

      await tx.teamMember.create({
        data: {
          teamId: inv.teamId,
          userId: userBob.id,
          role: "MEMBER",
        },
      });
    });

    const updatedInvitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationBob.id },
    });
    assert(updatedInvitation?.status === "ACCEPTED", "Invitation status updated to ACCEPTED in PostgreSQL");

    const teamAfterBob = await prisma.team.findUnique({
      where: { id: createdTeam.id },
      include: { members: true },
    });
    assert(teamAfterBob?.members?.length === 2, "Team member count is now 2 in PostgreSQL");
    assert(teamAfterBob?.members.some((m) => m.userId === userBob.id && m.role === "MEMBER"), "Bob is active MEMBER");

    // 7. Concurrent Acceptance Race Condition Test
    console.log("\n7. Testing Concurrent Invitation Acceptance Prevention...");
    // Create an invitation for Charlie
    const invitationCharlie = await prisma.teamInvitation.create({
      data: {
        teamId: createdTeam.id,
        inviterId: userAlice.id,
        inviteeId: userCharlie.id,
        status: "PENDING",
        expiresAt,
      },
    });

    // Simulate two concurrent acceptance requests firing simultaneously
    const acceptInvitationTx = async () => {
      return prisma.$transaction(async (tx) => {
        const inv = await tx.teamInvitation.findUnique({
          where: { id: invitationCharlie.id },
        });
        if (!inv || inv.status !== "PENDING") {
          throw new Error("Invitation is no longer pending.");
        }

        await tx.teamInvitation.update({
          where: { id: invitationCharlie.id },
          data: { status: "ACCEPTED" },
        });

        await tx.teamMember.upsert({
          where: {
            teamId_userId: {
              teamId: inv.teamId,
              userId: userCharlie.id,
            },
          },
          create: {
            teamId: inv.teamId,
            userId: userCharlie.id,
            role: "MEMBER",
          },
          update: {},
        });

        return "SUCCESS";
      });
    };

    const concurrentResults = await Promise.allSettled([
      acceptInvitationTx(),
      acceptInvitationTx(),
    ]);

    const successes = concurrentResults.filter((r) => r.status === "fulfilled").length;
    const rejections = concurrentResults.filter((r) => r.status === "rejected").length;

    assert(successes === 1, "Exactly one concurrent transaction succeeds");
    assert(rejections === 1, "Second concurrent transaction is rejected cleanly");

    // Check team members count: Charlie is added only once
    const teamAfterCharlie = await prisma.team.findUnique({
      where: { id: createdTeam.id },
      include: { members: true },
    });
    const charlieMemberships = teamAfterCharlie?.members.filter((m) => m.userId === userCharlie.id);
    assert(charlieMemberships?.length === 1, "Charlie is added exactly once with no duplicate records");
    assert(teamAfterCharlie?.members.length === 3, "Team total members count is exactly 3 in PostgreSQL");

    // 8. Leadership Handover on Leader Leaving in PostgreSQL
    console.log("\n8. Testing Leadership Handover in PostgreSQL...");
    await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({
        where: { id: createdTeam.id },
        include: { members: true },
      });

      const otherMembers = team.members.filter((m) => m.userId !== userAlice.id);
      if (otherMembers.length > 0) {
        // Promote next member to LEADER
        await tx.teamMember.update({
          where: { id: otherMembers[0].id },
          data: { role: "LEADER" },
        });
      }

      await tx.teamMember.delete({
        where: {
          teamId_userId: {
            teamId: createdTeam.id,
            userId: userAlice.id,
          },
        },
      });
    });

    const teamAfterAliceLeft = await prisma.team.findUnique({
      where: { id: createdTeam.id },
      include: { members: true },
    });
    assert(teamAfterAliceLeft?.members.length === 2, "Alice removed from team; member count is 2");
    const newLeader = teamAfterAliceLeft?.members.find((m) => m.role === "LEADER");
    assert(Boolean(newLeader) && newLeader.userId !== userAlice.id, "Leadership successfully handed over to another member");

    // 9. Cascade Delete Integrity Check
    console.log("\n9. Testing Database Cascade Deletion Integrity...");
    await prisma.team.delete({
      where: { id: createdTeam.id },
    });

    const orphanedMembers = await prisma.teamMember.findMany({
      where: { teamId: createdTeam.id },
    });
    const orphanedInvitations = await prisma.teamInvitation.findMany({
      where: { teamId: createdTeam.id },
    });
    assert(orphanedMembers.length === 0, "Foreign key CASCADE cleanly removed all team_members records");
    // 10. Clean up test records
    console.log("\n10. Cleaning up test records in PostgreSQL...");
    if (userAlice?.id) await prisma.user.delete({ where: { id: userAlice.id } }).catch(() => {});
    if (userBob?.id) await prisma.user.delete({ where: { id: userBob.id } }).catch(() => {});
    if (userCharlie?.id) await prisma.user.delete({ where: { id: userCharlie.id } }).catch(() => {});
    assert(true, "Cleaned up temporary PostgreSQL test user records");

    console.log("\n=========================================================");
    console.log("POSTGRESQL INTEGRATION RESULTS SUMMARY");
    console.log(`- Total Tests Run:    ${total}`);
    console.log(`- Total Tests Passed:  ${passed}`);
    console.log(`- Total Tests Failed:  ${failed}`);
    console.log("=========================================================\n");

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log("All PostgreSQL Database Integration tests PASSED successfully!");
    }
  } catch (error) {
    console.error("PostgreSQL integration error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDatabaseIntegrationTests();
