import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getStripeSellerProfileDefaults } from "@/lib/connect-onboarding";
import { prisma } from "@/lib/prisma";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";

export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ message: "Sign in with your UVA email before creating a connected account." }, { status: 401 });
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

  // We only keep a mapping between the app's user record and the Stripe
  // account ID. Onboarding completeness stays in Stripe and is fetched live.
  const existingAccount = await prisma.connectedAccount.findUnique({
    where: { userId: session.user.id }
  });

  if (existingAccount) {
    return NextResponse.json({
      connectedAccountId: existingAccount.id,
      stripeAccountId: existingAccount.stripeAccountId,
      created: false
    });
  }

  const stripeClient = getStripeClient();

  try {
    const accountDisplayName = session.user.name || session.user.username || session.user.email || "HoosFinds seller";
    const defaultProfile = getStripeSellerProfileDefaults({
      username: session.user.username,
      displayName: accountDisplayName
    });

    // The user asked for the V2 Accounts API and explicitly requested that we
    // only pass the documented recipient-focused properties below. We also
    // prefill the Stripe profile so student sellers do not have to invent a
    // "business website" during onboarding.
    const account = await stripeClient.v2.core.accounts.create({
      display_name: accountDisplayName,
      contact_email: session.user.email,
      identity: {
        country: "us"
      },
      dashboard: "express",
      defaults: {
        profile: defaultProfile,
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application"
        }
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: {
                requested: true
              }
            }
          }
        }
      }
    });

    const connectedAccount = await prisma.connectedAccount.create({
      data: {
        userId: session.user.id,
        stripeAccountId: account.id
      }
    });

    return NextResponse.json({
      connectedAccountId: connectedAccount.id,
      stripeAccountId: connectedAccount.stripeAccountId,
      created: true
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Stripe could not create the connected account."
      },
      { status: 500 }
    );
  }
}
