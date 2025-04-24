-- CreateEnum
CREATE TYPE "recoveryStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "recovered_accounts" ADD COLUMN     "recovery_date" TIMESTAMP(3),
ADD COLUMN     "recovery_status" "recoveryStatus" NOT NULL DEFAULT 'PENDING';
