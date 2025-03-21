/*
  Warnings:

  - You are about to drop the column `createdAt` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `hfrCode` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `locationCode` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `openmrs_location` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "openmrs_location" DROP COLUMN "createdAt",
DROP COLUMN "hfrCode",
DROP COLUMN "locationCode",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hfr_code" TEXT,
ADD COLUMN     "location_code" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3);
