/*
  Warnings:

  - You are about to drop the `user_role` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "user_role";

-- CreateTable
CREATE TABLE "openmrs_user_roles" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openmrs_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_user_roles_uuid_key" ON "openmrs_user_roles"("uuid");
