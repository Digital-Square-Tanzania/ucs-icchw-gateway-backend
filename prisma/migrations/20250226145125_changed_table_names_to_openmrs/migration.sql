/*
  Warnings:

  - You are about to drop the `location` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `location_tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `location_tag_map` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teams` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "location_tag_map" DROP CONSTRAINT "location_tag_map_location_id_fkey";

-- DropForeignKey
ALTER TABLE "location_tag_map" DROP CONSTRAINT "location_tag_map_location_tag_id_fkey";

-- DropTable
DROP TABLE "location";

-- DropTable
DROP TABLE "location_tag";

-- DropTable
DROP TABLE "location_tag_map";

-- DropTable
DROP TABLE "team_roles";

-- DropTable
DROP TABLE "teams";

-- CreateTable
CREATE TABLE "openmrs_location" (
    "location_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city_village" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "creator" INTEGER NOT NULL,
    "date_created" TIMESTAMP(3) NOT NULL,
    "county_district" TEXT,
    "address3" TEXT,
    "address4" TEXT,
    "address5" TEXT,
    "address6" TEXT,
    "retired" BOOLEAN NOT NULL DEFAULT false,
    "retired_by" INTEGER,
    "date_retired" TIMESTAMP(3),
    "retire_reason" TEXT,
    "parent_location" INTEGER,
    "uuid" TEXT NOT NULL,
    "changed_by" INTEGER,
    "date_changed" TIMESTAMP(3),
    "address7" TEXT,
    "address8" TEXT,
    "address9" TEXT,
    "address10" TEXT,
    "address11" TEXT,
    "address12" TEXT,
    "address13" TEXT,
    "address14" TEXT,
    "address15" TEXT,

    CONSTRAINT "openmrs_location_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "openmrs_location_tag" (
    "location_tag_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creator" INTEGER NOT NULL,
    "date_created" TIMESTAMP(3) NOT NULL,
    "retired" BOOLEAN NOT NULL DEFAULT false,
    "retired_by" INTEGER,
    "date_retired" TIMESTAMP(3),
    "retire_reason" TEXT,
    "uuid" TEXT NOT NULL,
    "changed_by" INTEGER,
    "date_changed" TIMESTAMP(3),

    CONSTRAINT "openmrs_location_tag_pkey" PRIMARY KEY ("location_tag_id")
);

-- CreateTable
CREATE TABLE "openmrs_location_tag_map" (
    "location_id" INTEGER NOT NULL,
    "location_tag_id" INTEGER NOT NULL,

    CONSTRAINT "openmrs_location_tag_map_pkey" PRIMARY KEY ("location_id","location_tag_id")
);

-- CreateTable
CREATE TABLE "openmrs_team_roles" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "members" INTEGER NOT NULL DEFAULT 0,
    "creator" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "openmrs_team_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openmrs_teams" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "openmrs_teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_location_uuid_key" ON "openmrs_location"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_location_tag_uuid_key" ON "openmrs_location_tag"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_roles_uuid_key" ON "openmrs_team_roles"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_roles_identifier_key" ON "openmrs_team_roles"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_teams_uuid_key" ON "openmrs_teams"("uuid");

-- AddForeignKey
ALTER TABLE "openmrs_location_tag_map" ADD CONSTRAINT "openmrs_location_tag_map_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "openmrs_location"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openmrs_location_tag_map" ADD CONSTRAINT "openmrs_location_tag_map_location_tag_id_fkey" FOREIGN KEY ("location_tag_id") REFERENCES "openmrs_location_tag"("location_tag_id") ON DELETE RESTRICT ON UPDATE CASCADE;
