import { ConnectedAccountStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

// Connected-account lifecycle notes:
// - No ConnectedAccount row: seller has never connected payouts (fully disconnected).
// - ACTIVE row + Stripe requirements due: Stripe account still exists, but
//   onboarding/verification is incomplete on that live account.
// - REQUIRES_RECONNECT: the stored Stripe account ID is stale, closed, or no
//   longer accessible, so HoosFinds must create a fresh connected account.
const RECONNECTABLE_STRIPE_ERROR_CODES = new Set([
  "account_closed",
  "account_invalid",
  "authentication_error",
  "permission_error",
  "resource_missing"
]);

function getStripeErrorMetadata(error: unknown) {
  const candidate = error as Error & {
    statusCode?: number;
    code?: string;
    type?: string;
    raw?: {
      code?: string;
      message?: string;
      type?: string;
    };
  };

  return {
    code: candidate?.code ?? candidate?.raw?.code ?? null,
    statusCode: typeof candidate?.statusCode === "number" ? candidate.statusCode : null,
    type: candidate?.type ?? candidate?.raw?.type ?? null,
    message: candidate?.message ?? candidate?.raw?.message ?? null
  };
}

export function isReconnectableConnectedAccountError(error: unknown) {
  const metadata = getStripeErrorMetadata(error);
  const message = metadata.message?.toLowerCase() ?? "";

  return (
    metadata.statusCode === 403 ||
    metadata.statusCode === 404 ||
    (metadata.code ? RECONNECTABLE_STRIPE_ERROR_CODES.has(metadata.code) : false) ||
    message.includes("no such account") ||
    message.includes("could not be accessed") ||
    message.includes("do not have permission to access this account") ||
    message.includes("account is invalid")
  );
}

export function getReconnectReason(error: unknown) {
  const metadata = getStripeErrorMetadata(error);
  const parts = [metadata.code, metadata.type, metadata.message].filter((value): value is string => Boolean(value?.trim()));

  return parts.length > 0 ? parts.join(" | ") : "Stored Stripe account could not be accessed.";
}

export async function markConnectedAccountRequiresReconnect(params: {
  connectedAccountId: string;
  reason: string;
}) {
  await prisma.connectedAccount.update({
    where: { id: params.connectedAccountId },
    data: {
      status: ConnectedAccountStatus.REQUIRES_RECONNECT,
      statusReason: params.reason,
      disconnectedAt: new Date()
    }
  });
}

export async function markConnectedAccountRequiresReconnectByStripeAccountId(params: {
  stripeAccountId: string;
  reason: string;
}) {
  await prisma.connectedAccount.updateMany({
    where: { stripeAccountId: params.stripeAccountId },
    data: {
      status: ConnectedAccountStatus.REQUIRES_RECONNECT,
      statusReason: params.reason,
      disconnectedAt: new Date()
    }
  });
}
