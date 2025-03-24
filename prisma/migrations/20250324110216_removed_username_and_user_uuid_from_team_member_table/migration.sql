/*
  Warnings:

  - You are about to drop the column `user_uuid` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `openmrs_team_members` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "openmrs_team_members_user_uuid_key";

-- DropIndex
DROP INDEX "openmrs_team_members_username_key";

-- AlterTable
ALTER TABLE "openmrs_team_members" DROP COLUMN "user_uuid",
DROP COLUMN "username";
