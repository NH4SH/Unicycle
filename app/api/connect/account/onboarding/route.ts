import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";

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

  const origin = new URL(request.url).origin;
  const stripeClient = getStripeClient();

  try {
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
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Stripe could not create the onboarding link."
      },
      { status: 500 }
    );
  }
}
