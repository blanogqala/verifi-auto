ALTER TABLE "Vehicle"
  ADD COLUMN "bodyStyle" VARCHAR(40) NOT NULL DEFAULT '',
  ADD COLUMN "licenceDiscSource" VARCHAR(16) NOT NULL DEFAULT 'owner',
  ADD COLUMN "nextServiceMileage" INTEGER,
  ADD COLUMN "nextServiceSource" VARCHAR(16) NOT NULL DEFAULT 'owner';

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_licenceDiscSource_check"
  CHECK ("licenceDiscSource" IN ('owner', 'mechanic'));
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_nextServiceSource_check"
  CHECK ("nextServiceSource" IN ('owner', 'mechanic'));
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_nextServiceMileage_check"
  CHECK ("nextServiceMileage" IS NULL OR "nextServiceMileage" >= 0);
