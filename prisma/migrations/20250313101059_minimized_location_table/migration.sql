/*
  Warnings:

  - You are about to drop the column `parentId` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `parentName` on the `openmrs_location` table. All the data in the column will be lost.
  - You are about to drop the column `parentUuid` on the `openmrs_location` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "openmrs_location" DROP COLUMN "parentId",
DROP COLUMN "parentName",
DROP COLUMN "parentUuid",
ADD COLUMN     "parent" TEXT,
ADD COLUMN     "type" TEXT;
