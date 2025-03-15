/*
  Warnings:

  - The values [FACILITY_PROVIDER,VILLAGE_CHW] on the enum `RoleType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `openmrs_location_tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `openmrs_location_tag_map` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoleType_new" AS ENUM ('UCS_DEVELOPER', 'MOH_ADMIN', 'COUNCIL_COORDINATOR', 'EXTERNAL_SYSTEM');
ALTER TABLE "roles" ALTER COLUMN "name" TYPE "RoleType_new" USING ("name"::text::"RoleType_new");
ALTER TYPE "RoleType" RENAME TO "RoleType_old";
ALTER TYPE "RoleType_new" RENAME TO "RoleType";
DROP TYPE "RoleType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "openmrs_location_tag_map" DROP CONSTRAINT "openmrs_location_tag_map_location_id_fkey";

-- DropForeignKey
ALTER TABLE "openmrs_location_tag_map" DROP CONSTRAINT "openmrs_location_tag_map_location_tag_id_fkey";

-- DropTable
DROP TABLE "openmrs_location_tag";

-- DropTable
DROP TABLE "openmrs_location_tag_map";
