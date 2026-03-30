import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";

// The sample storefront uses a simple 10% platform fee so the destination
// charge demonstrates how the platform can monetize each order.
export const CONNECT_APPLICATION_FEE_BPS = 1000;

export type ConnectedAccountSnapshot = {
  stripeAccountId: string;
  displayName: string | null;
  contactEmail: string | null;
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string | null;
  transferCapabilityStatus: string | null;
};

export type ConnectSellerState = {
  connectedAccount: {
    id: string;
    stripeAccountId: string;
    createdAt: string;
  } | null;
  stripeStatus: ConnectedAccountSnapshot | null;
};

export type ConnectStorefrontProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  createdAt: string;
  seller: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  connectedAccount: {
    stripeAccountId: string;
  };
  status: ConnectedAccountSnapshot | null;
  isOwnedByViewer: boolean;
};

function summarizeRecipientAccount(account: Stripe.V2.Core.Account): ConnectedAccountSnapshot {
  const transferCapabilityStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ?? null;
  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status ?? null;
  const readyToReceivePayments = transferCapabilityStatus === "active";
  const onboardingComplete = requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";

  return {
    stripeAccountId: account.id,
    displayName: account.display_name ?? null,
    contactEmail: account.contact_email ?? null,
    readyToReceivePayments,
    onboardingComplete,
    requirementsStatus,
    transferCapabilityStatus
  };
}

export function calculateApplicationFeeAmount(amountCents: number) {
  return Math.max(50, Math.round((amountCents * CONNECT_APPLICATION_FEE_BPS) / 10_000));
}

export async function getConnectedAccountStatusFromStripe(stripeAccountId: string) {
  const stripeClient = getStripeClient();

  // The product requirement here is explicit: always fetch the latest status
  // from Stripe's API instead of storing onboarding completeness in our DB.
  const account = await stripeClient.v2.core.accounts.retrieve(stripeAccountId, {
    include: ["configuration.recipient", "requirements"]
  });

  return summarizeRecipientAccount(account);
}

export async function getConnectSellerState(userId?: string): Promise<ConnectSellerState> {
  if (!userId) {
    return {
      connectedAccount: null,
      stripeStatus: null
    };
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId }
  });

  if (!connectedAccount) {
    return {
      connectedAccount: null,
      stripeStatus: null
    };
  }

  const stripeStatus = isStripeConnectConfigured()
    ? await getConnectedAccountStatusFromStripe(connectedAccount.stripeAccountId).catch(() => null)
    : null;

  return {
    connectedAccount: {
      id: connectedAccount.id,
      stripeAccountId: connectedAccount.stripeAccountId,
      createdAt: connectedAccount.createdAt.toISOString()
    },
    stripeStatus
  };
}

export async function getConnectStorefrontProducts(viewerUserId?: string): Promise<ConnectStorefrontProduct[]> {
  const products = await prisma.connectProduct.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: {
      owner: true,
      connectedAccount: true
    }
  });

  const statusMap = new Map<string, ConnectedAccountSnapshot | null>();

  if (isStripeConnectConfigured()) {
    const uniqueStripeAccountIds = [...new Set(products.map((product) => product.connectedAccount.stripeAccountId))];
    const statuses = await Promise.all(
      uniqueStripeAccountIds.map(async (stripeAccountId) => {
        const snapshot = await getConnectedAccountStatusFromStripe(stripeAccountId).catch(() => null);
        return [stripeAccountId, snapshot] as const;
      })
    );

    for (const [stripeAccountId, snapshot] of statuses) {
      statusMap.set(stripeAccountId, snapshot);
    }
  }

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    priceCents: product.priceCents,
    currency: product.currency,
    createdAt: product.createdAt.toISOString(),
    seller: {
      id: product.owner.id,
      name: product.owner.name,
      username: product.owner.username,
      image: product.owner.image
    },
    connectedAccount: {
      stripeAccountId: product.connectedAccount.stripeAccountId
    },
    status: statusMap.get(product.connectedAccount.stripeAccountId) ?? null,
    isOwnedByViewer: viewerUserId === product.ownerUserId
  }));
}
