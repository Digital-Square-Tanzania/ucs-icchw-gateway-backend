/*
  Warnings:

  - The values [SYSTEM_DEVELOPER,COUNCIL_ADMIN,COMMUNITY_HEALTH_WORKER] on the enum `RoleType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoleType_new" AS ENUM ('UCS_DEVELOPER', 'MOH_ADMIN', 'COUNCIL_COORDINATOR', 'FACILITY_PROVIDER', 'VILLAGE_CHW');
ALTER TABLE "roles" ALTER COLUMN "name" TYPE "RoleType_new" USING ("name"::text::"RoleType_new");
ALTER TYPE "RoleType" RENAME TO "RoleType_old";
ALTER TYPE "RoleType_new" RENAME TO "RoleType";
DROP TYPE "RoleType_old";
COMMIT;
