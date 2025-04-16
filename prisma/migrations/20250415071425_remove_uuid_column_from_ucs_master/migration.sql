/*
  Warnings:

  - You are about to drop the column `uuid` on the `ucs_master` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ucs_master_uuid_key";

-- AlterTable
ALTER TABLE "ucs_master" DROP COLUMN "uuid";
