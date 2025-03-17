/*
  Warnings:

  - You are about to drop the `openmrs_user_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "openmrs_user_roles";

-- CreateTable
CREATE TABLE "openmrs_member_roles" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openmrs_member_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_member_roles_uuid_key" ON "openmrs_member_roles"("uuid");
