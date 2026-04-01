import { SITE_URL } from "@/lib/constants";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export const STRIPE_SELLER_PRODUCT_DESCRIPTION =
  "Selling secondhand clothing and campus goods through HoosFinds, a UVA student marketplace.";

function sanitizeBaseUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

export function getPublicAppUrl() {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();

  if (!configuredUrl) {
    return SITE_URL;
  }

  try {
    const parsed = new URL(configuredUrl);
    if (LOCAL_HOSTNAMES.has(parsed.hostname)) {
      return SITE_URL;
    }

    return sanitizeBaseUrl(parsed.origin);
  } catch {
    return SITE_URL;
  }
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

