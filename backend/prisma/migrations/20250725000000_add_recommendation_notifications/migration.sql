-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "is_recommendation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN "book_data" JSONB;
