-- DropForeignKey
ALTER TABLE "account_activations" DROP CONSTRAINT "account_activations_userUuid_fkey";

-- DropIndex
DROP INDEX "account_activations_userUuid_key";

-- AlterTable
ALTER TABLE "openmrs_team_members" ADD COLUMN     "accountActivationId" INTEGER;

-- AddForeignKey
ALTER TABLE "openmrs_team_members" ADD CONSTRAINT "openmrs_team_members_accountActivationId_fkey" FOREIGN KEY ("accountActivationId") REFERENCES "account_activations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
