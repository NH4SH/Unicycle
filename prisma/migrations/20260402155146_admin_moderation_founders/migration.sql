-- CreateEnum
CREATE TYPE "ListingModerationStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "AdminAuditActionType" AS ENUM ('VERIFIED_SELLER_APPROVED', 'VERIFIED_SELLER_REJECTED', 'VERIFIED_SELLER_REVOKED', 'USER_BANNED', 'USER_UNBANNED', 'LISTING_HIDDEN', 'LISTING_REMOVED', 'LISTING_RESTORED');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('USER', 'VERIFIED_SHOP', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING ("role"::text);
UPDATE "User" SET "role" = 'USER' WHERE "role" = 'MEMBER';
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderationStatus" "ListingModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "verifiedShopAddress" TEXT;
ALTER TABLE "User" ADD COLUMN "verifiedShopNeighborhood" TEXT;
UPDATE "User"
SET
  "verifiedShopNeighborhood" = COALESCE("verifiedShopNeighborhood", "verifiedShopLocation"),
  "verifiedShopAddress" = COALESCE("verifiedShopAddress", "verifiedShopLocation")
WHERE "verifiedShopLocation" IS NOT NULL;
ALTER TABLE "User" DROP COLUMN "verifiedShopLocation";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- AlterTable
ALTER TABLE "VerifiedSellerApplication" ADD COLUMN "address" TEXT;
ALTER TABLE "VerifiedSellerApplication" ADD COLUMN "neighborhood" TEXT;
UPDATE "VerifiedSellerApplication"
SET
  "neighborhood" = COALESCE("neighborhood", "location"),
  "address" = COALESCE("address", "location");
ALTER TABLE "VerifiedSellerApplication" ALTER COLUMN "address" SET NOT NULL;
ALTER TABLE "VerifiedSellerApplication" ALTER COLUMN "neighborhood" SET NOT NULL;
ALTER TABLE "VerifiedSellerApplication" DROP COLUMN "location";

-- Promote existing approved verified shops into the new role model.
UPDATE "User"
SET "role" = 'VERIFIED_SHOP'
WHERE "sellerKind" = 'VERIFIED_SHOP'
  AND "verifiedShopApprovedAt" IS NOT NULL
  AND LOWER("email") NOT IN ('whz8te@virginia.edu', 'upw9er@virginia.edu', 'xec5pw@virginia.edu');

-- Bootstrap founder accounts as admins.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE LOWER("email") IN ('whz8te@virginia.edu', 'upw9er@virginia.edu', 'xec5pw@virginia.edu');

-- CreateTable
CREATE TABLE "UserBan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "internalNotes" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "revokedById" TEXT,

    CONSTRAINT "UserBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" "AdminAuditActionType" NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetListingId" TEXT,
    "targetVerifiedSellerApplicationId" TEXT,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBan_userId_revokedAt_endsAt_idx" ON "UserBan"("userId", "revokedAt", "endsAt");

-- CreateIndex
CREATE INDEX "UserBan_createdAt_idx" ON "UserBan"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_createdAt_idx" ON "AdminAuditLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetListingId_createdAt_idx" ON "AdminAuditLog"("targetListingId", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_moderationStatus_idx" ON "Listing"("moderationStatus");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetListingId_fkey" FOREIGN KEY ("targetListingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetVerifiedSellerApplicationId_fkey" FOREIGN KEY ("targetVerifiedSellerApplicationId") REFERENCES "VerifiedSellerApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
