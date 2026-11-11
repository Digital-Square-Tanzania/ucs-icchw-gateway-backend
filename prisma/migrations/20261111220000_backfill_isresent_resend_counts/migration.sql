-- isResent was recorded before resend_count existed, and the column was
-- added later with a default of 0. Each flagged slug is one resend.
UPDATE "account_activations"
SET "resend_count" = 1
WHERE "isResent" = true
  AND "resend_count" = 0;
