-- The previous profile PATCH implementation unintentionally changed APPROVED to DRAFT.
-- Restore only records that have an approval credential issued by an administrator.
-- Never reactivate suspended profiles or profiles returned for changes.
UPDATE "Professional"
SET "status" = 'APPROVED'
WHERE "status" IN ('DRAFT', 'SUBMITTED')
  AND "credentialId" IS NOT NULL;
