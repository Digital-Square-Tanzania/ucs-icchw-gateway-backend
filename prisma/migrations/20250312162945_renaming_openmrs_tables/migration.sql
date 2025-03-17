/*
  Warnings:

  - You are about to drop the `location_hierarchy_view` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_members` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "location_hierarchy_view";

-- DropTable
DROP TABLE "team_members";

-- CreateTable
CREATE TABLE "openmrs_location_hierarchy_view" (
    "index" INTEGER NOT NULL,
    "uuid" TEXT NOT NULL,
    "country" TEXT,
    "zone" TEXT,
    "region" TEXT,
    "district" TEXT,
    "council" TEXT,
    "ward" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "openmrs_location_hierarchy_view_pkey" PRIMARY KEY ("index")
);

-- CreateTable
CREATE TABLE "openmrs_team_members" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "personUuid" TEXT NOT NULL,
    "userUuid" TEXT,
    "openMrsUuid" TEXT NOT NULL,
    "teamUuid" TEXT,
    "teamName" TEXT,
    "teamIdentifier" TEXT,
    "locationUuid" TEXT,
    "locationName" TEXT,
    "locationDescription" TEXT,
    "openmrsObject" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openmrs_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_members_identifier_key" ON "openmrs_team_members"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_members_username_key" ON "openmrs_team_members"("username");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_members_personUuid_key" ON "openmrs_team_members"("personUuid");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_members_userUuid_key" ON "openmrs_team_members"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_members_openMrsUuid_key" ON "openmrs_team_members"("openMrsUuid");
