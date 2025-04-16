/*
  Warnings:

  - The `person_id` column on the `ucs_master` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `user_id` column on the `ucs_master` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `location_id` column on the `ucs_master` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `member_id` column on the `ucs_master` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `team_id` column on the `ucs_master` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ucs_master" DROP COLUMN "person_id",
ADD COLUMN     "person_id" INTEGER,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER,
DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER,
DROP COLUMN "member_id",
ADD COLUMN     "member_id" INTEGER,
DROP COLUMN "team_id",
ADD COLUMN     "team_id" INTEGER;
