-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('HACKATHON', 'WORKSHOP', 'FEST', 'COMPETITION');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('ONLINE', 'IN_PERSON', 'HYBRID');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('INDIVIDUAL', 'TEAM');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'WAITLISTED');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL DEFAULT 'HACKATHON',
    "format" "EventFormat" NOT NULL DEFAULT 'IN_PERSON',
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "venue" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "registeredCount" INTEGER NOT NULL DEFAULT 0,
    "isTeamEvent" BOOLEAN NOT NULL DEFAULT false,
    "minTeamSize" INTEGER NOT NULL DEFAULT 1,
    "maxTeamSize" INTEGER NOT NULL DEFAULT 1,
    "eligibility" TEXT NOT NULL DEFAULT 'Open to all enrolled students with valid student ID.',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "bannerGradient" TEXT NOT NULL DEFAULT 'from-blue-600 via-indigo-600 to-purple-700',
    "imageUrl" TEXT,
    "organizerId" TEXT,
    "organizerName" TEXT NOT NULL DEFAULT 'Event Organizer',
    "organizerOrg" TEXT NOT NULL DEFAULT 'Student Tech Collective',
    "organizerEmail" TEXT NOT NULL DEFAULT 'organizers@eventfind.dev',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "type" "RegistrationType" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "RegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "spots" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_slug_idx" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_category_idx" ON "events"("category");

-- CreateIndex
CREATE INDEX "events_published_idx" ON "events"("published");

-- CreateIndex
CREATE INDEX "registrations_eventId_idx" ON "registrations"("eventId");

-- CreateIndex
CREATE INDEX "registrations_userId_idx" ON "registrations"("userId");

-- CreateIndex
CREATE INDEX "registrations_teamId_idx" ON "registrations"("teamId");

-- CreateIndex
CREATE INDEX "registrations_status_idx" ON "registrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_eventId_userId_key" ON "registrations"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
