import { ConnectedAccountStatus, ListingStatus, OrderStatus, TransactionStatus } from "@prisma/client";
import type Stripe from "stripe";

import {
  getReconnectReason,
  isReconnectableConnectedAccountError,
  markConnectedAccountRequiresReconnect
} from "@/lib/connected-account-lifecycle";
import { prisma } from "@/lib/prisma";
import { publicUserSummarySelect } from "@/lib/public-user";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";

// Canonical marketplace sales use the Listing model. Stripe Connect only powers
// seller payouts underneath that flow, so platform-fee math now lives here.
export const SELLER_PAYOUT_APPLICATION_FEE_BPS = 1000;

type StripeCapabilityStatus = "active" | "pending" | "restricted" | "unsupported" | null;

type StripeCapabilityDetail = {
  code: string;
  resolution: string;
};

export type SellerPayoutStatus =
  | "not_connected"
  | "requires_reconnect"
  | "unavailable"
  | "verification_incomplete"
  | "payouts_paused"
  | "under_review"
  | "ready";

export type SellerPayoutCtaTarget = "stripe" | "refresh" | "sell" | "none";

export type ConnectedAccountSnapshot = {
  stripeAccountId: string;
  displayName: string | null;
  contactEmail: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  disabledReason: string | null;
  requirementsStatus: string | null;
  futureRequirementsStatus: string | null;
  transferCapabilityStatus: StripeCapabilityStatus;
  payoutCapabilityStatus: StripeCapabilityStatus;
  transferCapabilityDetails: StripeCapabilityDetail[];
  payoutCapabilityDetails: StripeCapabilityDetail[];
  currentDue: string[];
  pastDue: string[];
  pendingVerification: string[];
  eventuallyDue: string[];
  futureEventuallyDue: string[];
  futureCurrentDue: string[];
  requirementErrorMessages: string[];
  requirementHighlights: string[];
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  needsVerification: boolean;
  needsAttentionSoon: boolean;
  underReview: boolean;
  payoutsPaused: boolean;
};

export type SellerPayoutState = {
  status: SellerPayoutStatus;
  connectedAccount: {
    id: string;
    stripeAccountId: string;
    createdAt: string;
  } | null;
  stripeStatus: ConnectedAccountSnapshot | null;
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  actionRequired: boolean;
  statusLabel: string;
  headline: string;
  detail: string;
  ctaLabel: string;
  ctaTarget: SellerPayoutCtaTarget;
  requirementHighlights: string[];
};

export type SellerPayoutSaleSummary = {
  orderId: string;
  listingId: string;
  listingTitle: string;
  amountCents: number;
  applicationFeeCents: number;
  createdAt: string;
  orderStatus: OrderStatus;
  handoffStatus: TransactionStatus | null;
  buyer: {
    name: string | null;
    username: string;
  };
};

export type SellerPayoutDashboardData = {
  payoutState: SellerPayoutState;
  stats: {
    liveListings: number;
    pendingHandoffs: number;
    completedSales: number;
    grossSalesCents: number;
  };
  recentSales: SellerPayoutSaleSummary[];
};

function toConnectedAccountSummary(connectedAccount: {
  id: string;
  stripeAccountId: string;
  createdAt: Date;
}) {
  return {
    id: connectedAccount.id,
    stripeAccountId: connectedAccount.stripeAccountId,
    createdAt: connectedAccount.createdAt.toISOString()
  };
}

function toUniqueStrings(values: Array<string | null | undefined> | null | undefined) {
  return [...new Set((values ?? []).filter((value): value is string => Boolean(value?.trim())))];
}

function toCapabilityDetails(
  details:
    | Array<{
        code: string;
        resolution: string;
      }>
    | undefined
) {
  return (details ?? []).map((detail) => ({
    code: detail.code,
    resolution: detail.resolution
  }));
}

function humanizeFallbackRequirementName(requirement: string) {
  const lastSegment = requirement.split(".").pop() ?? requirement;

  return lastSegment
    .replaceAll("_", " ")
    .replace(/\bssn\b/gi, "SSN")
    .replace(/\bid\b/gi, "ID");
}

function toFriendlyRequirementLabel(requirement: string) {
  const normalized = requirement.toLowerCase();

  if (
    normalized.includes("ssn") ||
    normalized.includes("id_number") ||
    normalized.includes("tax_id") ||
    normalized.includes("ein")
  ) {
    return "your SSN or taxpayer information";
  }

  if (normalized.includes("verification.document") || normalized.includes("document")) {
    return "a government ID or verification document";
  }

  if (normalized.includes("external_account") || normalized.includes("bank_account")) {
    return "your bank account details";
  }

  if (normalized.includes("address")) {
    return "your address";
  }

  if (normalized.includes("dob") || normalized.includes("date_of_birth")) {
    return "your date of birth";
  }

  if (normalized.includes("phone")) {
    return "your phone number";
  }

  if (normalized.includes("email")) {
    return "your email address";
  }

  if (
    normalized.includes("business_profile") ||
    normalized.includes("product_description") ||
    normalized.includes(".url")
  ) {
    return "your HoosFinds profile or business details";
  }

  if (normalized.includes("representative")) {
    return "your representative details";
  }

  if (normalized.includes("owner")) {
    return "owner details";
  }

  if (normalized.includes("director") || normalized.includes("executive")) {
    return "director or executive details";
  }

  if (normalized.includes("company")) {
    return "business details";
  }

  if (normalized.includes("person")) {
    return "identity details";
  }

  return humanizeFallbackRequirementName(requirement);
}

function buildRequirementHighlights(params: {
  currentDue: string[];
  pastDue: string[];
  pendingVerification: string[];
  eventuallyDue: string[];
  detailsSubmitted: boolean;
}) {
  const actionable = [...params.currentDue, ...params.pastDue, ...params.eventuallyDue].map(toFriendlyRequirementLabel);
  const review = params.pendingVerification.map(toFriendlyRequirementLabel);

  const highlights = toUniqueStrings([...actionable, ...review]);
  if (highlights.length > 0) {
    return highlights.slice(0, 3);
  }

  if (!params.detailsSubmitted) {
    return ["identity details"];
  }

  return [];
}

function hasCapabilityDetailResolution(details: StripeCapabilityDetail[], resolution: string) {
  return details.some((detail) => detail.resolution === resolution);
}

function hasCapabilityDetailCode(details: StripeCapabilityDetail[], code: string) {
  return details.some((detail) => detail.code === code);
}

function summarizeRecipientAccount(accountV2: Stripe.V2.Core.Account, accountV1: Stripe.Account): ConnectedAccountSnapshot {
  const transferCapability = accountV2.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
  const payoutCapability = accountV2.configuration?.recipient?.capabilities?.stripe_balance?.payouts;
  const transferCapabilityStatus = transferCapability?.status ?? null;
  const payoutCapabilityStatus = payoutCapability?.status ?? null;
  const transferCapabilityDetails = toCapabilityDetails(transferCapability?.status_details);
  const payoutCapabilityDetails = toCapabilityDetails(payoutCapability?.status_details);

  const currentDue = toUniqueStrings(accountV1.requirements?.currently_due);
  const pastDue = toUniqueStrings(accountV1.requirements?.past_due);
  const pendingVerification = toUniqueStrings(accountV1.requirements?.pending_verification);
  const eventuallyDue = toUniqueStrings(accountV1.requirements?.eventually_due);
  const futureCurrentDue = toUniqueStrings(accountV1.future_requirements?.currently_due);
  const futureEventuallyDue = toUniqueStrings(accountV1.future_requirements?.eventually_due);
  const requirementErrorMessages = toUniqueStrings(
    accountV1.requirements?.errors?.map((error) => error.reason || error.code || null)
  );
  const requirementHighlights = buildRequirementHighlights({
    currentDue,
    pastDue,
    pendingVerification,
    eventuallyDue: [...eventuallyDue, ...futureCurrentDue],
    detailsSubmitted: accountV1.details_submitted
  });

  const requirementsStatus = accountV2.requirements?.summary?.minimum_deadline?.status ?? null;
  const futureRequirementsStatus = accountV2.future_requirements?.summary?.minimum_deadline?.status ?? null;
  const disabledReason = accountV1.requirements?.disabled_reason ?? accountV1.future_requirements?.disabled_reason ?? null;

  const verificationBlockedByRequirements = currentDue.length > 0 || pastDue.length > 0;
  const needsAttentionSoon = eventuallyDue.length > 0 || futureCurrentDue.length > 0 || futureEventuallyDue.length > 0;
  const capabilityNeedsInfo =
    hasCapabilityDetailResolution(transferCapabilityDetails, "provide_info") ||
    hasCapabilityDetailResolution(payoutCapabilityDetails, "provide_info");
  const capabilityPendingReview =
    hasCapabilityDetailCode(transferCapabilityDetails, "requirements_pending_verification") ||
    hasCapabilityDetailCode(payoutCapabilityDetails, "requirements_pending_verification") ||
    hasCapabilityDetailCode(transferCapabilityDetails, "determining_status") ||
    hasCapabilityDetailCode(payoutCapabilityDetails, "determining_status");

  const underReview =
    pendingVerification.length > 0 ||
    disabledReason === "under_review" ||
    disabledReason === "requirements.pending_verification" ||
    capabilityPendingReview;

  const payoutsPaused =
    !underReview &&
    (pastDue.length > 0 ||
      disabledReason === "requirements.past_due" ||
      (accountV1.details_submitted &&
        (!accountV1.payouts_enabled || transferCapabilityStatus === "restricted" || payoutCapabilityStatus === "restricted")));

  // Recipient accounts in this marketplace flow do not need charges_enabled to
  // accept destination-charge payouts, but we still inspect Stripe's v1 fields
  // so restricted accounts with missing KYC or review holds are detected.
  const recipientCapabilitiesReady =
    transferCapabilityStatus === "active" && (payoutCapabilityStatus === null || payoutCapabilityStatus === "active");

  const needsVerification =
    verificationBlockedByRequirements ||
    !accountV1.details_submitted ||
    !accountV1.payouts_enabled ||
    needsAttentionSoon ||
    capabilityNeedsInfo ||
    disabledReason === "action_required.requested_capabilities" ||
    disabledReason === "requirements.past_due" ||
    disabledReason === "rejected.incomplete_verification";

  const readyToReceivePayments =
    accountV1.details_submitted &&
    accountV1.payouts_enabled &&
    recipientCapabilitiesReady &&
    !verificationBlockedByRequirements &&
    !underReview &&
    !capabilityNeedsInfo;

  return {
    stripeAccountId: accountV2.id,
    displayName: accountV2.display_name ?? accountV1.business_profile?.name ?? null,
    contactEmail: accountV2.contact_email ?? accountV1.email ?? null,
    chargesEnabled: accountV1.charges_enabled,
    payoutsEnabled: accountV1.payouts_enabled,
    detailsSubmitted: accountV1.details_submitted,
    disabledReason,
    requirementsStatus,
    futureRequirementsStatus,
    transferCapabilityStatus,
    payoutCapabilityStatus,
    transferCapabilityDetails,
    payoutCapabilityDetails,
    currentDue,
    pastDue,
    pendingVerification,
    eventuallyDue,
    futureEventuallyDue,
    futureCurrentDue,
    requirementErrorMessages,
    requirementHighlights,
    readyToReceivePayments,
    onboardingComplete: accountV1.details_submitted && currentDue.length === 0 && pastDue.length === 0,
    needsVerification,
    needsAttentionSoon,
    underReview,
    payoutsPaused
  };
}

function buildVerificationDetail(snapshot: ConnectedAccountSnapshot) {
  if (snapshot.needsAttentionSoon && snapshot.currentDue.length === 0 && snapshot.pastDue.length === 0) {
    if (snapshot.requirementHighlights.length > 0) {
      return `Stripe will need a little more information soon to keep payouts running smoothly. Open Stripe now and add ${snapshot.requirementHighlights.join(", ")} before payouts pause.`;
    }

    return "Stripe will need a little more information soon to keep payouts running smoothly. Open Stripe now and finish verification before payouts pause.";
  }

  if (snapshot.requirementHighlights.length > 0) {
    const formatted = snapshot.requirementHighlights.join(", ");
    return `Stripe still needs more information before HoosFinds can send your earnings. Most sellers can fix this by reopening Stripe and adding ${formatted}.`;
  }

  return "Stripe still needs more information before HoosFinds can send your earnings. Reopen Stripe and finish verification before publishing listings or accepting checkout.";
}

function buildPausedDetail(snapshot: ConnectedAccountSnapshot) {
  if (snapshot.requirementHighlights.length > 0) {
    return `Stripe has temporarily paused payouts until a few details are fixed. Reopen Stripe and update ${snapshot.requirementHighlights.join(", ")} to start receiving earnings again.`;
  }

  return "Stripe has temporarily paused payouts on this account. Reopen Stripe and finish the requested verification steps before you can receive earnings again.";
}

export function calculateApplicationFeeAmount(amountCents: number) {
  return Math.max(50, Math.round((amountCents * SELLER_PAYOUT_APPLICATION_FEE_BPS) / 10_000));
}

export async function getConnectedAccountStatusFromStripe(stripeAccountId: string) {
  const stripeClient = getStripeClient();
  const [accountV2, accountV1] = await Promise.all([
    stripeClient.v2.core.accounts.retrieve(stripeAccountId, {
      include: ["configuration.recipient", "future_requirements", "requirements"]
    }),
    stripeClient.accounts.retrieve(stripeAccountId)
  ]);

  return summarizeRecipientAccount(accountV2, accountV1);
}

function getDisconnectedPayoutState(): SellerPayoutState {
  return {
    status: "not_connected",
    connectedAccount: null,
    stripeStatus: null,
    readyToReceivePayments: false,
    onboardingComplete: false,
    actionRequired: true,
    statusLabel: "Payouts not connected",
    headline: "Connect payouts before you sell",
    detail: "Before your listing can go live, connect where you want HoosFinds to send your earnings.",
    ctaLabel: "Connect Stripe payouts",
    ctaTarget: "stripe",
    requirementHighlights: []
  };
}

function getReconnectRequiredPayoutState(): SellerPayoutState {
  return {
    status: "requires_reconnect",
    connectedAccount: null,
    stripeStatus: null,
    readyToReceivePayments: false,
    onboardingComplete: false,
    actionRequired: true,
    statusLabel: "Reconnect payouts",
    headline: "Reconnect Stripe payouts",
    detail:
      "Your previous Stripe connection is no longer available. Reconnect payouts so HoosFinds knows where to send your earnings.",
    ctaLabel: "Reconnect Stripe payouts",
    ctaTarget: "stripe",
    requirementHighlights: []
  };
}

export async function getSellerPayoutState(userId?: string): Promise<SellerPayoutState> {
  if (!userId) {
    return getDisconnectedPayoutState();
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId }
  });

  if (!connectedAccount) {
    return getDisconnectedPayoutState();
  }

  if (connectedAccount.status === ConnectedAccountStatus.REQUIRES_RECONNECT) {
    return getReconnectRequiredPayoutState();
  }

  if (!isStripeConnectConfigured()) {
    return {
      status: "unavailable",
      connectedAccount: toConnectedAccountSummary(connectedAccount),
      stripeStatus: null,
      readyToReceivePayments: false,
      onboardingComplete: false,
      actionRequired: true,
      statusLabel: "Payouts unavailable",
      headline: "Payout setup is temporarily unavailable",
      detail: "HoosFinds cannot confirm payout readiness until Stripe is configured for this environment.",
      ctaLabel: "Refresh status",
      ctaTarget: "refresh",
      requirementHighlights: []
    };
  }

  let stripeStatus: ConnectedAccountSnapshot | null = null;

  try {
    stripeStatus = await getConnectedAccountStatusFromStripe(connectedAccount.stripeAccountId);
  } catch (error) {
    if (isReconnectableConnectedAccountError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[seller-payouts] stale or inaccessible connected account", {
          connectedAccountId: connectedAccount.id,
          stripeAccountId: connectedAccount.stripeAccountId,
          reason: getReconnectReason(error)
        });
      }

      await markConnectedAccountRequiresReconnect({
        connectedAccountId: connectedAccount.id,
        reason: getReconnectReason(error)
      });

      return getReconnectRequiredPayoutState();
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[seller-payouts] could not fetch Stripe connected account status", {
        connectedAccountId: connectedAccount.id,
        stripeAccountId: connectedAccount.stripeAccountId,
        error
      });
    }
  }

  if (!stripeStatus) {
    return {
      status: "verification_incomplete",
      connectedAccount: toConnectedAccountSummary(connectedAccount),
      stripeStatus: null,
      readyToReceivePayments: false,
      onboardingComplete: false,
      actionRequired: true,
      statusLabel: "Verification incomplete",
      headline: "Finish Stripe verification",
      detail:
        "We could not confirm your payout status right now. Open Stripe again and finish verification before your listing goes live or accepts checkout.",
      ctaLabel: "Finish Stripe verification",
      ctaTarget: "stripe",
      requirementHighlights: []
    };
  }

  if (stripeStatus.readyToReceivePayments) {
    return {
      status: "ready",
      connectedAccount: toConnectedAccountSummary(connectedAccount),
      stripeStatus,
      readyToReceivePayments: true,
      onboardingComplete: stripeStatus.onboardingComplete,
      actionRequired: false,
      statusLabel: "Ready to sell",
      headline: "You're ready to sell",
      detail: "Payouts are enabled and HoosFinds can route listing earnings to your connected payout account automatically.",
      ctaLabel: "Create listing",
      ctaTarget: "sell",
      requirementHighlights: []
    };
  }

  if (stripeStatus.payoutsPaused) {
    return {
      status: "payouts_paused",
      connectedAccount: toConnectedAccountSummary(connectedAccount),
      stripeStatus,
      readyToReceivePayments: false,
      onboardingComplete: stripeStatus.onboardingComplete,
      actionRequired: true,
      statusLabel: "Payouts paused",
      headline: "Continue in Stripe",
      detail: buildPausedDetail(stripeStatus),
      ctaLabel: "Continue in Stripe",
      ctaTarget: "stripe",
      requirementHighlights: stripeStatus.requirementHighlights
    };
  }

  if (stripeStatus.underReview && !stripeStatus.needsVerification) {
    return {
      status: "under_review",
      connectedAccount: toConnectedAccountSummary(connectedAccount),
      stripeStatus,
      readyToReceivePayments: false,
      onboardingComplete: stripeStatus.onboardingComplete,
      actionRequired: false,
      statusLabel: "Stripe reviewing your account",
      headline: "Stripe is reviewing your account",
      detail:
        "You've already submitted the main details, but Stripe is still reviewing them. Listings and checkout stay paused until that review clears.",
      ctaLabel: "Refresh status",
      ctaTarget: "refresh",
      requirementHighlights: stripeStatus.requirementHighlights
    };
  }

  return {
    status: "verification_incomplete",
    connectedAccount: toConnectedAccountSummary(connectedAccount),
    stripeStatus,
    readyToReceivePayments: false,
    onboardingComplete: stripeStatus.onboardingComplete,
    actionRequired: true,
    statusLabel: "Verification incomplete",
    headline: "Finish Stripe verification",
    detail: buildVerificationDetail(stripeStatus),
    ctaLabel:
      stripeStatus.currentDue.length > 0 || stripeStatus.pastDue.length > 0 || !stripeStatus.detailsSubmitted
        ? "Finish Stripe verification"
        : "Continue in Stripe",
    ctaTarget: "stripe",
    requirementHighlights: stripeStatus.requirementHighlights
  };
}

export async function getSellerPayoutDashboardData(userId?: string): Promise<SellerPayoutDashboardData> {
  const payoutState = await getSellerPayoutState(userId);

  if (!userId) {
    return {
      payoutState,
      stats: {
        liveListings: 0,
        pendingHandoffs: 0,
        completedSales: 0,
        grossSalesCents: 0
      },
      recentSales: []
    };
  }

  const [liveListings, pendingHandoffs, completedSales, grossSales, recentSales] = await Promise.all([
    prisma.listing.count({
      where: {
        sellerId: userId,
        status: ListingStatus.ACTIVE
      }
    }),
    prisma.transaction.count({
      where: {
        sellerId: userId,
        status: TransactionStatus.PENDING_CONFIRMATION
      }
    }),
    prisma.transaction.count({
      where: {
        sellerId: userId,
        status: TransactionStatus.COMPLETED
      }
    }),
    prisma.order.aggregate({
      where: {
        sellerId: userId,
        status: OrderStatus.PAID
      },
      _sum: {
        amountCents: true
      }
    }),
    prisma.order.findMany({
      where: {
        sellerId: userId,
        status: OrderStatus.PAID
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 6,
      include: {
        listing: {
          select: {
            id: true,
            title: true
          }
        },
        buyer: {
          select: publicUserSummarySelect
        },
        transaction: {
          select: {
            status: true
          }
        }
      }
    })
  ]);

  return {
    payoutState,
    stats: {
      liveListings,
      pendingHandoffs,
      completedSales,
      grossSalesCents: grossSales._sum.amountCents ?? 0
    },
    recentSales: recentSales.map((order) => ({
      orderId: order.id,
      listingId: order.listingId,
      listingTitle: order.listing.title,
      amountCents: order.amountCents,
      applicationFeeCents: calculateApplicationFeeAmount(order.amountCents),
      createdAt: order.createdAt.toISOString(),
      orderStatus: order.status,
      handoffStatus: order.transaction?.status ?? null,
      buyer: {
        name: order.buyer.name,
        username: order.buyer.username
      }
    }))
  };
}
