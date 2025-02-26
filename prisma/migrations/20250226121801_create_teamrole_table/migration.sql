-- CreateTable
CREATE TABLE "team_roles" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "members" INTEGER NOT NULL DEFAULT 0,
    "creator" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_roles_uuid_key" ON "team_roles"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "team_roles_identifier_key" ON "team_roles"("identifier");
