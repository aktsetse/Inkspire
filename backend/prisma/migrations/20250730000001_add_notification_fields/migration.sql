-- Add missing columns to Notification table
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "comment_id" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "book_id" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "is_recommendation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "book_data" JSONB;
