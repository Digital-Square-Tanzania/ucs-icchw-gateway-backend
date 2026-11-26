CREATE TABLE "partner_api_calls" (
    "id" SERIAL NOT NULL,
    "api_log_id" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "http_status" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "facility_code" TEXT,
    "facility_name" TEXT,
    "period_month" INTEGER,
    "period_year" INTEGER,
    "chw_count" INTEGER NOT NULL DEFAULT 0,
    "eligible_count" INTEGER NOT NULL DEFAULT 0,
    "ineligible_count" INTEGER NOT NULL DEFAULT 0,
    "unknown_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" VARCHAR(500),

    CONSTRAINT "partner_api_calls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_api_calls_api_log_id_key" ON "partner_api_calls"("api_log_id");
CREATE INDEX "partner_api_calls_source_operation_received_at_idx" ON "partner_api_calls"("source", "operation", "received_at");
CREATE INDEX "partner_api_calls_received_at_idx" ON "partner_api_calls"("received_at");
CREATE INDEX "partner_api_calls_facility_code_idx" ON "partner_api_calls"("facility_code");
