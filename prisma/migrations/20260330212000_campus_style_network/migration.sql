-- Add a stable row id to Follow while preserving existing follow relationships.
ALTER TABLE "Follow" ADD COLUMN "id" TEXT;

-- Backfill ids for existing rows before making the column required.
UPDATE "Follow"
SET "id" = CONCAT(
  'flw_',
  SUBSTRING(MD5("followerId" || ':' || "followingId" || ':' || RANDOM()::text || ':' || clock_timestamp()::text), 1, 28)
)
WHERE "id" IS NULL;

ALTER TABLE "Follow" ALTER COLUMN "id" SET NOT NULL;

-- Move the primary key to the new id column and preserve pair uniqueness separately.
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_pkey";
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");
