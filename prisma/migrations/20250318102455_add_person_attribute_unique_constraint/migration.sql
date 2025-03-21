/*
  Warnings:

  - A unique constraint covering the columns `[peron_uuid,attribute_name]` on the table `OpenMRSPersonAttribute` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OpenMRSPersonAttribute_peron_uuid_attribute_name_key" ON "OpenMRSPersonAttribute"("peron_uuid", "attribute_name");
