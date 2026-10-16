import { PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile();
} catch {}

const prisma = new PrismaClient();

const DEFAULT_HASH = "$2b$10$9dIdTqj1JMYsF41FGNMM.uxekmpa5boe2gz83sxeFEzgWNBpPMPWG"; // "Password123!"

async function main() {
  console.log("Seeding baseline EventFind demo accounts into PostgreSQL...");

  // Seed Alex Rivera (Student)
  const student = await prisma.user.upsert({
    where: { username: "alex_student" },
    create: {
      id: "usr_seed_student",
      username: "alex_student",
      email: "student@eventfind.dev",
      passwordHash: DEFAULT_HASH,
      name: "Alex Rivera",
      role: "STUDENT",
      bio: "Computer Science junior passionate about hackathons and AI systems.",
      college: "Metropolitan University",
    },
    update: {
      passwordHash: DEFAULT_HASH,
      role: "STUDENT",
      email: "student@eventfind.dev",
      name: "Alex Rivera",
    },
  });
  console.log(`- Seeded student account: @${student.username} (${student.email})`);

  // Seed Elena Rostova (Organizer)
  const organizer = await prisma.user.upsert({
    where: { username: "elena_organizer" },
    create: {
      id: "usr_seed_organizer",
      username: "elena_organizer",
      email: "organizer@eventfind.dev",
      passwordHash: DEFAULT_HASH,
      name: "Elena Rostova",
      role: "ORGANIZER",
      bio: "Lead organizer for collegiate hackathons and tech festivals.",
      organization: "HackPulse Tech Collective",
    },
    update: {
      passwordHash: DEFAULT_HASH,
      role: "ORGANIZER",
      email: "organizer@eventfind.dev",
      name: "Elena Rostova",
    },
  });
  console.log(`- Seeded organizer account: @${organizer.username} (${organizer.email})`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
