-- AlterTable
ALTER TABLE "recovered_accounts" ADD COLUMN     "recovered_name" TEXT,
ALTER COLUMN "first_name" DROP NOT NULL,
ALTER COLUMN "family_name" DROP NOT NULL;
