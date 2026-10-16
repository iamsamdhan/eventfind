-- AlterTable
ALTER TABLE "events" ADD COLUMN "isClosed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "events_organizerId_idx" ON "events"("organizerId");
