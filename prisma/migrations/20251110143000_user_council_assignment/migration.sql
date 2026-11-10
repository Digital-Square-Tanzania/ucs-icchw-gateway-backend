ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assigned_region" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assigned_district" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assigned_council" TEXT;
