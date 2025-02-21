/*
  Warnings:

  - You are about to drop the column `lastLogin` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "lastLogin",
ADD COLUMN     "last_login" TIMESTAMP(3);
