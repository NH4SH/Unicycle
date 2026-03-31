import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function readRequiredEnv(name: string, helpText: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is missing. ${helpText}`);
  }

  return value;
}

export function getStripeClient() {
  // Stripe's latest SDK automatically pins the matching preview API version,
  // so we only need to provide the secret key here.
  const secretKey = readRequiredEnv(
    "STRIPE_SECRET_KEY",
    'Add your Stripe secret key to ".env" locally and to your host environment for deployed builds.'
  );

  if (!stripeClient) {
    // The user explicitly asked for a shared "Stripe Client" instance to power
    // every Stripe request in the app, so we keep that naming here.
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function isStripeCheckoutEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isStripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function isStripeConnectConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isStripeConnectWebhookConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CONNECT_WEBHOOK_SECRET);
}

export function getStripeWebhookSecret() {
  return readRequiredEnv(
    "STRIPE_WEBHOOK_SECRET",
    'Add the standard Checkout webhook signing secret from Stripe to continue handling listing purchase events.'
  );
}

export function getStripeConnectWebhookSecret() {
  return readRequiredEnv(
    "STRIPE_CONNECT_WEBHOOK_SECRET",
    'Add the thin-event webhook signing secret for seller payouts to continue receiving connected-account requirement updates.'
  );
}

// Preserve the original helper name so existing listing checkout code keeps
// working while new Stripe Connect code uses the clearer getStripeClient name.
export const getStripe = getStripeClient;
