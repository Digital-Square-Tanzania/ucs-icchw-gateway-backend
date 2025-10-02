/*
  Warnings:

  - Added the required column `email` to the `account_activations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nin` to the `account_activations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "account_activations" ADD COLUMN     "email" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "hospital" TEXT,
ADD COLUMN     "isResent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationCode" TEXT,
ADD COLUMN     "nin" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- Update existing records with default values
UPDATE "account_activations" SET "email" = 'unknown@example.com' WHERE "email" IS NULL;
UPDATE "account_activations" SET "nin" = 'unknown' WHERE "nin" IS NULL;

-- Make columns NOT NULL after updating
ALTER TABLE "account_activations" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "account_activations" ALTER COLUMN "nin" SET NOT NULL;
