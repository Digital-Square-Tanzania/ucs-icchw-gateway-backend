CREATE TABLE "email_runtime_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "allow_sending" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "email_runtime_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_dispatch_logs" (
    "id" SERIAL NOT NULL,
    "to_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_dispatch_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_dispatch_logs_created_at_idx" ON "email_dispatch_logs"("created_at");
