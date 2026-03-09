-- AlterTable
ALTER TABLE "account_activations" ADD COLUMN     "facility" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "activation_resend_config" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);
