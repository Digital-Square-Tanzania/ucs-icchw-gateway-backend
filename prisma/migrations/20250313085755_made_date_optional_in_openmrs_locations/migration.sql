-- AlterTable
ALTER TABLE "openmrs_location" ADD COLUMN     "voided" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "date_changed" SET DEFAULT CURRENT_TIMESTAMP;
