/*
  Warnings:

  - Made the column `book_title` on table `Favorite` required. This step will fail if there are existing NULL values in that column.
  - Made the column `book_title` on table `ShelfItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Favorite" ALTER COLUMN "book_title" SET NOT NULL;

-- AlterTable
ALTER TABLE "ShelfItem" ALTER COLUMN "book_title" SET NOT NULL;
