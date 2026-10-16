-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "creatorId" TEXT NOT NULL,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invitations" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "teams_creatorId_idx" ON "teams"("creatorId");

-- CreateIndex
CREATE INDEX "teams_eventId_idx" ON "teams"("eventId");

-- CreateIndex
CREATE INDEX "teams_slug_idx" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "team_invitations_teamId_idx" ON "team_invitations"("teamId");

-- CreateIndex
CREATE INDEX "team_invitations_inviterId_idx" ON "team_invitations"("inviterId");

-- CreateIndex
CREATE INDEX "team_invitations_inviteeId_idx" ON "team_invitations"("inviteeId");

-- CreateIndex
CREATE INDEX "team_invitations_status_idx" ON "team_invitations"("status");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

