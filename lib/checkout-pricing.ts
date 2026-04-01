export const HOOSFINDS_BUYER_FEE_BPS = 500;
export const HOOSFINDS_BUYER_FLAT_FEE_CENTS = 30;
export const HOOSFINDS_SELLER_FEE_BPS = 700;
export const STRIPE_PROCESSING_FEE_BPS = 290;
export const STRIPE_PROCESSING_FLAT_FEE_CENTS = 30;
export const HOOSFINDS_PER_ORDER_FEE_CENTS = 0;
export const DEFAULT_SALES_TAX_BPS = 530;

export type CheckoutPricingBreakdown = {
  listingPriceCents: number;
  buyerPercentFeeCents: number;
  buyerFlatFeeCents: number;
  buyerFeeTotalCents: number;
  taxRateBps: number;
  taxAmountCents: number;
  buyerTotalCents: number;
  sellerFeeCents: number;
  stripeFeeCents: number;
  perOrderFeeCents: number;
  sellerPayoutCents: number;
  applicationFeeCents: number;
  platformRevenueCents: number;
};

function roundCentsFromBps(amountCents: number, bps: number) {
  return Math.round((amountCents * bps) / 10_000);
}

export function getSalesTaxRateBps() {
  return DEFAULT_SALES_TAX_BPS;
}

// HoosFinds keeps pricing math centralized and cents-based so the review page,
// Stripe Checkout payload, and order reconciliation all use the exact same
// numbers.
export function calculateCheckoutPricing(listingPriceCents: number, taxRateBps = getSalesTaxRateBps()): CheckoutPricingBreakdown {
  const buyerPercentFeeCents = roundCentsFromBps(listingPriceCents, HOOSFINDS_BUYER_FEE_BPS);
  const buyerFlatFeeCents = HOOSFINDS_BUYER_FLAT_FEE_CENTS;
  const buyerFeeTotalCents = buyerPercentFeeCents + buyerFlatFeeCents;
  const taxAmountCents = roundCentsFromBps(listingPriceCents, taxRateBps);
  const buyerTotalCents = listingPriceCents + buyerFeeTotalCents + taxAmountCents;

  const sellerFeeCents = roundCentsFromBps(listingPriceCents, HOOSFINDS_SELLER_FEE_BPS);
  const stripeFeeCents = roundCentsFromBps(listingPriceCents, STRIPE_PROCESSING_FEE_BPS) + STRIPE_PROCESSING_FLAT_FEE_CENTS;
  const perOrderFeeCents = HOOSFINDS_PER_ORDER_FEE_CENTS;
  const sellerPayoutCents = Math.max(0, listingPriceCents - sellerFeeCents - stripeFeeCents - perOrderFeeCents);
  const applicationFeeCents = buyerTotalCents - sellerPayoutCents;
  const platformRevenueCents = buyerFeeTotalCents + sellerFeeCents + perOrderFeeCents;

  return {
    listingPriceCents,
    buyerPercentFeeCents,
    buyerFlatFeeCents,
    buyerFeeTotalCents,
    taxRateBps,
    taxAmountCents,
    buyerTotalCents,
    sellerFeeCents,
    stripeFeeCents,
    perOrderFeeCents,
    sellerPayoutCents,
    applicationFeeCents,
    platformRevenueCents
  };
}
