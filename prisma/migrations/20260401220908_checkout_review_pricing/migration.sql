-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "applicationFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buyerFeeTotalCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buyerFlatFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buyerPercentFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buyerTotalCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "checkoutExpiresAt" TIMESTAMP(3),
ADD COLUMN     "perOrderFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sellerFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sellerPayoutCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxRateBps" INTEGER NOT NULL DEFAULT 0;

-- Preserve sensible reporting for historical orders that predate the
-- item/fee/tax breakdown. They keep the old amount as both the charged total
-- and seller payout until newer checkouts write the explicit fee fields.
UPDATE "Order"
SET "buyerTotalCents" = "amountCents",
    "sellerPayoutCents" = "amountCents"
WHERE "buyerTotalCents" = 0
  AND "sellerPayoutCents" = 0;
