ALTER TABLE "Booking"
  ADD COLUMN "workReport" JSONB,
  ADD COLUMN "workReportUpdatedAt" TIMESTAMP(3);
ALTER TABLE "HistoryGrant"
  ADD COLUMN "requestedAt" TIMESTAMP(3),
  ADD COLUMN "grantedAt" TIMESTAMP(3);
