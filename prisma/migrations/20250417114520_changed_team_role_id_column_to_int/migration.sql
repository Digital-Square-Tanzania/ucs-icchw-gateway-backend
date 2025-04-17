/*
  Warnings:

  - The `team_role_id` column on the `ucs_master` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ucs_master" DROP COLUMN "team_role_id",
ADD COLUMN     "team_role_id" INTEGER;
