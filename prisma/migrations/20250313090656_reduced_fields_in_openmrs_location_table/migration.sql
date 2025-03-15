/*
  Warnings:

  - You are about to drop the column `address1` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address10` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address11` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address12` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address13` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address14` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address15` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address2` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address3` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address4` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address5` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address6` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address7` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address8` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `address9` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `changed_by` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `city_village` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `county_district` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `creator` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `date_changed` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `date_created` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `date_retired` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `parent_location` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `postal_code` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `retire_reason` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `retired_by` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `state_province` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `voided` on the `openmrs_location` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "openmrs_location" DROP COLUMN "address1",
DROP COLUMN "address10",
DROP COLUMN "address11",
DROP COLUMN "address12",
DROP COLUMN "address13",
DROP COLUMN "address14",
DROP COLUMN "address15",
DROP COLUMN "address2",
DROP COLUMN "address3",
DROP COLUMN "address4",
DROP COLUMN "address5",
DROP COLUMN "address6",
DROP COLUMN "address7",
DROP COLUMN "address8",
DROP COLUMN "address9",
DROP COLUMN "changed_by",
DROP COLUMN "city_village",
DROP COLUMN "country",
DROP COLUMN "county_district",
DROP COLUMN "creator",
DROP COLUMN "date_changed",
DROP COLUMN "date_created",
DROP COLUMN "date_retired",
DROP COLUMN "parent_location",
DROP COLUMN "postal_code",
DROP COLUMN "retire_reason",
DROP COLUMN "retired_by",
DROP COLUMN "state_province",
DROP COLUMN "voided",
ADD COLUMN     "parentId" INTEGER,
ADD COLUMN     "parentName" TEXT,
ADD COLUMN     "parentUuid" TEXT;
