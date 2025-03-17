-- CreateTable
CREATE TABLE "openmrs_location_tags" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openmrs_location_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openmrs_location_attribute_types" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openmrs_location_attribute_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_location_tags_uuid_key" ON "openmrs_location_tags"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "openmrs_location_attribute_types_uuid_key" ON "openmrs_location_attribute_types"("uuid");
