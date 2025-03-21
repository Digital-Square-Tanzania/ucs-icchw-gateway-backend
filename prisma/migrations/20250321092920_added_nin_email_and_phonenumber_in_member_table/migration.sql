/*
  Warnings:

  - You are about to drop the column `createdAt` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `locationDescription` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `locationName` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `locationUuid` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `middleName` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `openMrsUuid` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `roleName` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `roleUuid` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `teamIdentifier` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `teamName` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `teamUuid` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `openmrs_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `userUuid` on the `openmrs_team_members` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_uuid]` on the table `openmrs_team_members` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[openmrs_uuid]` on the table `openmrs_team_members` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `first_name` to the `openmrs_team_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `openmrs_team_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openmrs_uuid` to the `openmrs_team_members` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "openmrs_team_members_openMrsUuid_key";

-- DropIndex
DROP INDEX "openmrs_team_members_userUuid_key";

-- AlterTable
ALTER TABLE "openmrs_team_members" DROP COLUMN "createdAt",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "locationDescription",
DROP COLUMN "locationName",
DROP COLUMN "locationUuid",
DROP COLUMN "middleName",
DROP COLUMN "openMrsUuid",
DROP COLUMN "roleName",
DROP COLUMN "roleUuid",
DROP COLUMN "teamIdentifier",
DROP COLUMN "teamName",
DROP COLUMN "teamUuid",
DROP COLUMN "updatedAt",
DROP COLUMN "userUuid",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "location_description" TEXT,
ADD COLUMN     "location_name" TEXT,
ADD COLUMN     "location_uuid" TEXT,
ADD COLUMN     "middle_name" TEXT,
ADD COLUMN     "nin" TEXT,
ADD COLUMN     "openmrs_uuid" TEXT NOT NULL,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "role_name" TEXT,
ADD COLUMN     "role_uuid" TEXT,
ADD COLUMN     "team_identifier" TEXT,
ADD COLUMN     "team_name" TEXT,
ADD COLUMN     "team_uuid" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_uuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_members_user_uuid_key" ON "openmrs_team_members"("user_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_members_openmrs_uuid_key" ON "openmrs_team_members"("openmrs_uuid");
