ALTER TABLE "Professional" ADD COLUMN "roadsideAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "kind" VARCHAR(16) NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Booking" ADD COLUMN "emergencyType" VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE "Booking" ADD COLUMN "roadsideAddress" VARCHAR(300) NOT NULL DEFAULT '';
ALTER TABLE "Booking" ADD COLUMN "roadsideLatitude" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "roadsideLongitude" DOUBLE PRECISION;
CREATE INDEX "Booking_kind_status_idx" ON "Booking" ("kind", "status");
