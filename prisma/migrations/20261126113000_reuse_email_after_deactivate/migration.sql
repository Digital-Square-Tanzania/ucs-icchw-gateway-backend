-- Keep the address on the closed account for audit, and free it for a new active login.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_phone_number_key";
DROP INDEX IF EXISTS "users_email_key";
DROP INDEX IF EXISTS "users_phone_number_key";

CREATE UNIQUE INDEX "users_email_active_key" ON "users" ("email") WHERE "is_deleted" = false;
CREATE UNIQUE INDEX "users_phone_active_key" ON "users" ("phone_number") WHERE "is_deleted" = false AND "phone_number" IS NOT NULL;
