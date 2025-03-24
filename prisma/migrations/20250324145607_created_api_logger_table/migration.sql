-- CreateTable
CREATE TABLE "ApiLogger" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLogger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiLogger_uuid_key" ON "ApiLogger"("uuid");
