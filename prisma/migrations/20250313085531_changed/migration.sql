-- AlterTable
ALTER TABLE "openmrs_location" ALTER COLUMN "creator" DROP NOT NULL,
ALTER COLUMN "creator" SET DEFAULT 0;
