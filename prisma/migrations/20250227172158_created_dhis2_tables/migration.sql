-- CreateTable
CREATE TABLE "dhis2_org_units" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "level" INTEGER NOT NULL,
    "parentUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dhis2_org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dhis2_roles" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "authorities" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dhis2_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dhis2_users" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgUnitUuid" TEXT,
    "roleUuids" JSONB NOT NULL,

    CONSTRAINT "dhis2_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dhis2_sync_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityUuid" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dhis2_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dhis2_org_units_uuid_key" ON "dhis2_org_units"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "dhis2_org_units_code_key" ON "dhis2_org_units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dhis2_roles_uuid_key" ON "dhis2_roles"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "dhis2_users_uuid_key" ON "dhis2_users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "dhis2_users_username_key" ON "dhis2_users"("username");
