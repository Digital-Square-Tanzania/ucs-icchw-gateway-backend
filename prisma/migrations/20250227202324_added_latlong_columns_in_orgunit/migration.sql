/*
  Warnings:

  - You are about to drop the column `coordinates` on the `dhis2_org_units` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "dhis2_org_units" DROP COLUMN "coordinates",
ADD COLUMN     "latitude" TEXT,
ADD COLUMN     "longitude" TEXT;
