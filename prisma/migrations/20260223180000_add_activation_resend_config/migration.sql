-- Create table for storing activation resend scheduler configuration
CREATE TABLE IF NOT EXISTS "activation_resend_config" (
    "id" INT PRIMARY KEY DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "batchSize" INT NOT NULL DEFAULT 500,
    "maxIterations" INT NOT NULL DEFAULT 1,
    "delayMsBetweenIterations" INT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure there is always exactly one config row (id = 1)
INSERT INTO "activation_resend_config" ("id", "enabled", "batchSize", "maxIterations", "delayMsBetweenIterations")
VALUES (1, TRUE, 500, 1, 0)
ON CONFLICT ("id") DO NOTHING;

