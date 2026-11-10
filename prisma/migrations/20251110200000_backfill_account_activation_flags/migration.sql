-- Legacy rows may have NULL booleans if columns were added or patched outside Prisma.
UPDATE "account_activations"
SET "isResent" = false
WHERE "isResent" IS NULL;

UPDATE "account_activations"
SET "isUsed" = false
WHERE "isUsed" IS NULL;

UPDATE "account_activations"
SET "resend_count" = 0
WHERE "resend_count" IS NULL;

ALTER TABLE "account_activations"
  ALTER COLUMN "isResent" SET DEFAULT false;

ALTER TABLE "account_activations"
  ALTER COLUMN "isUsed" SET DEFAULT false;

ALTER TABLE "account_activations"
  ALTER COLUMN "resend_count" SET DEFAULT 0;

-- Enforce NOT NULL where the Prisma schema expects non-nullable types.
ALTER TABLE "account_activations"
  ALTER COLUMN "isResent" SET NOT NULL;

ALTER TABLE "account_activations"
  ALTER COLUMN "isUsed" SET NOT NULL;

ALTER TABLE "account_activations"
  ALTER COLUMN "resend_count" SET NOT NULL;
