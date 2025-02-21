/*
  Warnings:

  - The values [COMUNITY_HEALTH_WORKER] on the enum `RoleType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoleType_new" AS ENUM ('SYSTEM_DEVELOPER', 'COUNCIL_ADMIN', 'MOH_ADMIN', 'FACILITY_PROVIDER', 'COMMUNITY_HEALTH_WORKER');
ALTER TABLE "roles" ALTER COLUMN "name" TYPE "RoleType_new" USING ("name"::text::"RoleType_new");
ALTER TYPE "RoleType" RENAME TO "RoleType_old";
ALTER TYPE "RoleType_new" RENAME TO "RoleType";
DROP TYPE "RoleType_old";
COMMIT;
