-- Extend the lifecycle without rewriting historical bookings.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'READY_TO_START';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CONFIRMATION';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TABLE "Booking"
  ADD COLUMN "disputeReason" VARCHAR(2000) NOT NULL DEFAULT '',
  ADD COLUMN "disputeStatus" VARCHAR(40) NOT NULL DEFAULT '',
  ADD COLUMN "disputeResolution" VARCHAR(2000) NOT NULL DEFAULT '',
  ADD COLUMN "disputeResolvedAt" TIMESTAMP(3);
