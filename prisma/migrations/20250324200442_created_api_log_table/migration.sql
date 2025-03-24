/*
  Warnings:

  - You are about to drop the `ApiLogger` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ApiLogger";

-- CreateTable
CREATE TABLE "api_logs" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_logs_uuid_key" ON "api_logs"("uuid");
