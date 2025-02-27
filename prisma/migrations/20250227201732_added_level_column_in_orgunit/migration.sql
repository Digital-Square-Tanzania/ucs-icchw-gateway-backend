/*
  Warnings:

  - Added the required column `level` to the `dhis2_org_units` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dhis2_org_units" ADD COLUMN     "level" INTEGER NOT NULL;
