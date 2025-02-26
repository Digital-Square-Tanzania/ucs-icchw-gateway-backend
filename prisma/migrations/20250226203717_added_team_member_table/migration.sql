-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "personUuid" TEXT NOT NULL,
    "userUuid" TEXT,
    "openMrsUuid" TEXT NOT NULL,
    "teamUuid" TEXT,
    "teamName" TEXT,
    "teamIdentifier" TEXT,
    "locationUuid" TEXT,
    "locationName" TEXT,
    "locationDescription" TEXT,
    "openmrsObject" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_members_identifier_key" ON "team_members"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_username_key" ON "team_members"("username");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_personUuid_key" ON "team_members"("personUuid");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_userUuid_key" ON "team_members"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_openMrsUuid_key" ON "team_members"("openMrsUuid");
