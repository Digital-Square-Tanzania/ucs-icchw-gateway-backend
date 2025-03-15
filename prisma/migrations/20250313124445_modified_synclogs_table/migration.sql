/*
  Warnings:

  - You are about to drop the column `timestamp` on the `sync_logs` table. All the data in the column will be lost.
  - The `details` column on the `sync_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `dhis2_sync_logs` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[uuid]` on the table `sync_logs` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `sync_logs` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "sync_logs" DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uuid" TEXT NOT NULL,
DROP COLUMN "details",
ADD COLUMN     "details" JSONB;

-- DropTable
DROP TABLE "dhis2_sync_logs";

-- CreateIndex
CREATE UNIQUE INDEX "sync_logs_uuid_key" ON "sync_logs"("uuid");
