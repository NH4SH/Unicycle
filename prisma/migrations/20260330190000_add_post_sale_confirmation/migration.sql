-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING_CONFIRMATION', 'COMPLETED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "ListingStatus_new" AS ENUM ('ACTIVE', 'PENDING_CONFIRMATION', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Listing" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Listing"
  ALTER COLUMN "status" TYPE "ListingStatus_new"
  USING (
    CASE
      WHEN "status"::text = 'SOLD' THEN 'COMPLETED'
      ELSE "status"::text
    END
  )::"ListingStatus_new";
ALTER TYPE "public"."ListingStatus" RENAME TO "ListingStatus_old";
ALTER TYPE "public"."ListingStatus_new" RENAME TO "ListingStatus";
DROP TYPE "public"."ListingStatus_old";
ALTER TABLE "public"."Listing" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Listing" ADD COLUMN "soldToUserId" TEXT;

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "conversationId" TEXT,
    "orderId" TEXT,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "agreedPriceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "sellerMarkedSoldAt" TIMESTAMP(3),
    "buyerConfirmedReceivedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SellerReview" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_orderId_key" ON "public"."Transaction"("orderId");
CREATE INDEX "Transaction_listingId_idx" ON "public"."Transaction"("listingId");
CREATE INDEX "Transaction_sellerId_idx" ON "public"."Transaction"("sellerId");
CREATE INDEX "Transaction_buyerId_idx" ON "public"."Transaction"("buyerId");
CREATE INDEX "Transaction_conversationId_idx" ON "public"."Transaction"("conversationId");
CREATE INDEX "Transaction_status_idx" ON "public"."Transaction"("status");
CREATE INDEX "Transaction_createdAt_idx" ON "public"."Transaction"("createdAt");
CREATE UNIQUE INDEX "SellerReview_transactionId_key" ON "public"."SellerReview"("transactionId");
CREATE INDEX "SellerReview_revieweeId_createdAt_idx" ON "public"."SellerReview"("revieweeId", "createdAt");
CREATE INDEX "SellerReview_reviewerId_createdAt_idx" ON "public"."SellerReview"("reviewerId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Listing" ADD CONSTRAINT "Listing_soldToUserId_fkey" FOREIGN KEY ("soldToUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."SellerReview" ADD CONSTRAINT "SellerReview_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."SellerReview" ADD CONSTRAINT "SellerReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."SellerReview" ADD CONSTRAINT "SellerReview_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill paid checkout orders into the new transaction ledger so older orders still show up.
INSERT INTO "public"."Transaction" (
  "id",
  "listingId",
  "sellerId",
  "buyerId",
  "orderId",
  "status",
  "agreedPriceCents",
  "createdAt",
  "updatedAt",
  "confirmedAt",
  "sellerMarkedSoldAt",
  "buyerConfirmedReceivedAt"
)
SELECT
  CONCAT('order_tx_', o."id"),
  o."listingId",
  o."sellerId",
  o."buyerId",
  o."id",
  'COMPLETED'::"public"."TransactionStatus",
  o."amountCents",
  o."createdAt",
  o."updatedAt",
  o."updatedAt",
  o."updatedAt",
  o."updatedAt"
FROM "public"."Order" o
WHERE o."status" = 'PAID'
  AND NOT EXISTS (
    SELECT 1 FROM "public"."Transaction" t WHERE t."orderId" = o."id"
  );

-- Backfill buyer links on listings for past paid orders.
UPDATE "public"."Listing" l
SET "soldToUserId" = o."buyerId"
FROM "public"."Order" o
WHERE l."id" = o."listingId"
  AND o."status" = 'PAID'
  AND l."soldToUserId" IS NULL;
