-- Add follower count columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "num_followers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "num_following" INTEGER NOT NULL DEFAULT 0;
