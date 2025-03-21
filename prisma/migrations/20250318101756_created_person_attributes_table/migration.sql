-- CreateTable
CREATE TABLE "OpenMRSPersonAttribute" (
    "uuid" TEXT NOT NULL,
    "peron_uuid" TEXT NOT NULL,
    "attribute_type_uuid" TEXT NOT NULL,
    "attribute_name" TEXT NOT NULL,
    "attribute_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenMRSPersonAttribute_pkey" PRIMARY KEY ("uuid")
);
