-- Add parentId column to Comment table if it doesn't exist
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
