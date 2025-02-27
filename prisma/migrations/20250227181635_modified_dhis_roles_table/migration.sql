/*
  Warnings:

  - You are about to drop the column `authorities` on the `dhis2_roles` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `dhis2_roles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "dhis2_roles" DROP COLUMN "authorities",
DROP COLUMN "description";
