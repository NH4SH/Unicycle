import { ConnectedAccountStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import {
  getReconnectReason,
  isReconnectableConnectedAccountError,
  markConnectedAccountRequiresReconnect
} from "@/lib/connected-account-lifecycle";
import { getStripeSellerProfileDefaults } from "@/lib/connect-onboarding";
import { prisma } from "@/lib/prisma";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";
import { getAccountDisplayName } from "@/lib/user-identity";

function getReconnectRequiredResponse() {
  return NextResponse.json(
    {
      code: "RECONNECT_REQUIRED",
      message: "Your previous Stripe connection is no longer available. Reconnect payouts to continue."
    },
    { status: 409 }
  );
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Sign in before starting Stripe onboarding." }, { status: 401 });
  }

  if (!isStripeConnectConfigured()) {
    return NextResponse.json(
      {
        message:
          'Stripe Connect is not configured yet. Add STRIPE_SECRET_KEY to ".env" locally and to your deploy environment before trying again.'
      },
      { status: 503 }
    );
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId: session.user.id }
  });

  if (!connectedAccount) {
    return NextResponse.json(
      { message: "Create the connected account first, then Stripe can generate an onboarding link." },
      { status: 404 }
    );
  }

  if (connectedAccount.status === ConnectedAccountStatus.REQUIRES_RECONNECT) {
    return getReconnectRequiredResponse();
  }

  const origin = new URL(request.url).origin;
  const stripeClient = getStripeClient();

  try {
    const accountDisplayName = getAccountDisplayName({
      name: session.user.name,
      username: session.user.username,
      usernameConfirmed: session.user.usernameConfirmed,
      sellerKind: session.user.sellerKind
    });
    const defaultProfile = getStripeSellerProfileDefaults({
      username: session.user.username,
      displayName: accountDisplayName
    });

    // Best effort: refresh the Stripe-side profile each time onboarding opens
    // so existing sellers also get the HoosFinds profile URL + product
    // description prefill. If this refresh fails, sellers should still be able
    // to continue onboarding rather than being blocked from payout setup.
    try {
      await stripeClient.v2.core.accounts.update(connectedAccount.stripeAccountId, {
        display_name: accountDisplayName,
        contact_email: session.user.email || undefined,
        defaults: {
          profile: defaultProfile
        }
      });
    } catch (error) {
      if (isReconnectableConnectedAccountError(error)) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[connect/account/onboarding] stale connected account while refreshing profile", {
            connectedAccountId: connectedAccount.id,
            stripeAccountId: connectedAccount.stripeAccountId,
            reason: getReconnectReason(error)
          });
        }

        await markConnectedAccountRequiresReconnect({
          connectedAccountId: connectedAccount.id,
          reason: getReconnectReason(error)
        });

        return getReconnectRequiredResponse();
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[connect/account/onboarding] could not refresh Stripe profile defaults", error);
      }
    }

    const accountLink = await stripeClient.v2.core.accountLinks.create({
      account: connectedAccount.stripeAccountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: `${origin}/payments?refresh=1`,
          return_url: `${origin}/payments?accountId=${connectedAccount.stripeAccountId}`
        }
      }
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    if (isReconnectableConnectedAccountError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[connect/account/onboarding] stale connected account while creating account link", {
          connectedAccountId: connectedAccount.id,
          stripeAccountId: connectedAccount.stripeAccountId,
          reason: getReconnectReason(error)
        });
      }

      await markConnectedAccountRequiresReconnect({
        connectedAccountId: connectedAccount.id,
        reason: getReconnectReason(error)
      });

      return getReconnectRequiredResponse();
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Stripe could not create the onboarding link."
      },
      { status: 500 }
    );
  }
}
