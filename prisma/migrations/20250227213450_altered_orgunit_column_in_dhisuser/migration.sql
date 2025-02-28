/*
  Warnings:

  - You are about to drop the column `orgUnitUuid` on the `dhis2_users` table. All the data in the column will be lost.
  - Added the required column `orgUnitUuids` to the `dhis2_users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dhis2_users" DROP COLUMN "orgUnitUuid",
ADD COLUMN     "orgUnitUuids" JSONB NOT NULL,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;
