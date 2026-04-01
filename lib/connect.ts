import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { publicUserSummarySelect, toPublicUserSummary } from "@/lib/public-user";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";

// Legacy Connect storefront helpers retained temporarily for migration
// reference. The canonical seller flow now uses Listing inventory plus
// lib/seller-payouts.ts for payout readiness and checkout routing.

// HoosFinds uses a simple 10% platform fee here so the destination
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
    profileImageUrl: string | null;
  };
  connectedAccount: {
    stripeAccountId: string;
  };
  status: ConnectedAccountSnapshot | null;
  isOwnedByViewer: boolean;
};

export type ConnectOrderSummary = {
  id: string;
  status: string;
  amountCents: number;
  applicationFeeCents: number;
  createdAt: string;
  productName: string;
  counterparty: {
    name: string | null;
    username: string;
  };
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
      owner: {
        select: publicUserSummarySelect
      },
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
      ...toPublicUserSummary(product.owner)
    },
    connectedAccount: {
      stripeAccountId: product.connectedAccount.stripeAccountId
    },
    status: statusMap.get(product.connectedAccount.stripeAccountId) ?? null,
    isOwnedByViewer: viewerUserId === product.ownerUserId
  }));
}

export async function getConnectUserOrders(userId?: string) {
  if (!userId) {
    return {
      sellerOrders: [] as ConnectOrderSummary[],
      buyerOrders: [] as ConnectOrderSummary[]
    };
  }

  const [sellerOrders, buyerOrders] = await Promise.all([
    prisma.connectOrder.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        buyer: {
          select: publicUserSummarySelect
        },
        connectProduct: true
      }
    }),
    prisma.connectOrder.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        seller: {
          select: publicUserSummarySelect
        },
        connectProduct: true
      }
    })
  ]);

  return {
    sellerOrders: sellerOrders.map((order) => ({
      id: order.id,
      status: order.status,
      amountCents: order.amountCents,
      applicationFeeCents: order.applicationFeeCents,
      createdAt: order.createdAt.toISOString(),
      productName: order.connectProduct.name,
      counterparty: {
        name: order.buyer.name,
        username: order.buyer.username
      }
    })),
    buyerOrders: buyerOrders.map((order) => ({
      id: order.id,
      status: order.status,
      amountCents: order.amountCents,
      applicationFeeCents: order.applicationFeeCents,
      createdAt: order.createdAt.toISOString(),
      productName: order.connectProduct.name,
      counterparty: {
        name: order.seller.name,
        username: order.seller.username
      }
    }))
  };
}
