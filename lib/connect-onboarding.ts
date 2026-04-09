import { SITE_URL } from "@/lib/constants";

export const STRIPE_SELLER_PRODUCT_DESCRIPTION =
  "Selling secondhand clothing and Grounds goods through HoosFinds, a UVA student marketplace.";

export function getPublicAppUrl() {
  // Stripe should always see the canonical public HoosFinds URL instead of a
  // preview host like Netlify or localhost. NEXTAUTH_URL can still differ for
  // auth callbacks and preview deployments, but seller-facing business profile
  // links should stay stable and branded.
  return SITE_URL.replace(/\/$/, "");
}

export function getPublicProfileUrl(username?: string | null) {
  if (!username?.trim()) {
    return null;
  }

  return `${getPublicAppUrl()}/u/${encodeURIComponent(username.trim())}`;
}

export function getStripeSellerProfileDefaults(params: {
  username?: string | null;
  displayName?: string | null;
}) {
  return {
    business_url: getPublicProfileUrl(params.username) ?? undefined,
    doing_business_as: params.displayName?.trim() || undefined,
    product_description: STRIPE_SELLER_PRODUCT_DESCRIPTION
  };
}
