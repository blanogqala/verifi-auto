-- Additive schema update; retain existing evidence and coordinates in the database.
ALTER TABLE "Professional" ADD COLUMN "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Document"
  ADD COLUMN "reviewStatus" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reviewNote" VARCHAR(1000) NOT NULL DEFAULT '',
  ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE INDEX "Document_userId_reviewStatus_idx" ON "Document"("userId", "reviewStatus");
