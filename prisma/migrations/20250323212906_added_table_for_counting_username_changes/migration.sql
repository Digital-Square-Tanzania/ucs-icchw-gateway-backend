-- CreateTable
CREATE TABLE "openmrs_username_counters" (
    "id" SERIAL NOT NULL,
    "nin" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openmrs_username_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_username_counters_nin_key" ON "openmrs_username_counters"("nin");
