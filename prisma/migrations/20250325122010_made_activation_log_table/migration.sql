/*
  Warnings:

  - A unique constraint covering the columns `[user_uuid]` on the table `openmrs_team_members` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "slugType" AS ENUM ('ACTIVATION', 'RESET');

-- CreateTable
CREATE TABLE "account_activations" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "slugType" "slugType" NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_activations_uuid_key" ON "account_activations"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "account_activations_userUuid_key" ON "account_activations"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "account_activations_slug_key" ON "account_activations"("slug");

-- CreateIndex
CREATE INDEX "account_activations_slug_idx" ON "account_activations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_team_members_user_uuid_key" ON "openmrs_team_members"("user_uuid");

-- AddForeignKey
ALTER TABLE "account_activations" ADD CONSTRAINT "account_activations_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "openmrs_team_members"("user_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
