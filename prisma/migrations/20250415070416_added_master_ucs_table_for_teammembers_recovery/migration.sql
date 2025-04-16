-- CreateTable
CREATE TABLE "ucs_master" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "family_name" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "member_identifier" TEXT NOT NULL,
    "team_name" TEXT,
    "team_role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_role" TEXT DEFAULT 'Provider',
    "person_id" TEXT,
    "person_uuid" TEXT,
    "user_id" TEXT,
    "user_uuid" TEXT,
    "team_uuid" TEXT,
    "location_uuid" TEXT,
    "location_id" TEXT,
    "location_name" TEXT,
    "member_id" TEXT,
    "member_uuid" TEXT,
    "team_role_id" TEXT,
    "team_id" TEXT,

    CONSTRAINT "ucs_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ucs_master_uuid_key" ON "ucs_master"("uuid");

-- CreateIndex
CREATE INDEX "ucs_master_username_idx" ON "ucs_master"("username");

-- CreateIndex
CREATE INDEX "ucs_master_member_identifier_idx" ON "ucs_master"("member_identifier");
