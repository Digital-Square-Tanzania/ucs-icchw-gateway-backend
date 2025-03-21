-- AlterTable
ALTER TABLE "openmrs_teams" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "identifier" TEXT,
ADD COLUMN     "location_name" TEXT,
ADD COLUMN     "location_uuid" TEXT,
ADD COLUMN     "members" INTEGER,
ADD COLUMN     "supervisor_name" TEXT,
ADD COLUMN     "supervisor_uuid" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "void_reason" TEXT,
ADD COLUMN     "voided" BOOLEAN NOT NULL DEFAULT false;
