-- First, drop the existing self-referential relation
ALTER TABLE "User" DROP COLUMN IF EXISTS "followers";
ALTER TABLE "User" DROP COLUMN IF EXISTS "following";

-- Create a new table for the followers relationship
CREATE TABLE "UserFollows" (
    "id" SERIAL NOT NULL,
    "follower_id" INTEGER NOT NULL,
    "following_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollows_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint to prevent duplicate follows
CREATE UNIQUE INDEX "UserFollows_follower_id_following_id_key" ON "UserFollows"("follower_id", "following_id");

-- Add foreign key constraints
ALTER TABLE "UserFollows" ADD CONSTRAINT "UserFollows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserFollows" ADD CONSTRAINT "UserFollows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
