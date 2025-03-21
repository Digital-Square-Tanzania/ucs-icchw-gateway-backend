/*
  Warnings:

  - You are about to drop the `OpenMRSPersonAttribute` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "OpenMRSPersonAttribute";

-- CreateTable
CREATE TABLE "openmrs_person_attributes" (
    "uuid" TEXT NOT NULL,
    "peron_uuid" TEXT NOT NULL,
    "attribute_type_uuid" TEXT NOT NULL,
    "attribute_name" TEXT NOT NULL,
    "attribute_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openmrs_person_attributes_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_person_attributes_peron_uuid_attribute_name_key" ON "openmrs_person_attributes"("peron_uuid", "attribute_name");
