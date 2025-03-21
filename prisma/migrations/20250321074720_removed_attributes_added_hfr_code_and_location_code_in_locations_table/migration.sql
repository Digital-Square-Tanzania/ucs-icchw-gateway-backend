/*
  Warnings:

  - You are about to drop the column `attributes` on the `openmrs_location` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "openmrs_location_attributes_idx";

-- AlterTable
ALTER TABLE "openmrs_location" DROP COLUMN "attributes",
ADD COLUMN     "hfrCode" TEXT,
ADD COLUMN     "locationCode" TEXT;
