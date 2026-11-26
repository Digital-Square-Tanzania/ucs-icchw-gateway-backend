CREATE TABLE "manager_password_resets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_password_resets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "manager_password_resets_slug_key" ON "manager_password_resets"("slug");

CREATE INDEX "manager_password_resets_user_id_idx" ON "manager_password_resets"("user_id");

ALTER TABLE "manager_password_resets" ADD CONSTRAINT "manager_password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
