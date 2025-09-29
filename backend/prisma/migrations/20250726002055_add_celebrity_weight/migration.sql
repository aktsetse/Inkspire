/*
  Warnings:

  - You are about to drop the column `book_data` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `book_id` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `comment_id` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `is_recommendation` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "book_data",
DROP COLUMN "book_id",
DROP COLUMN "comment_id",
DROP COLUMN "is_recommendation";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "celebrity_weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
