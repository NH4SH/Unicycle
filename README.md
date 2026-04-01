# HoosFinds

UVA's fashion-first resale marketplace built with Next.js 14, TypeScript, Tailwind, shadcn/ui, Framer Motion, Prisma, NextAuth, and UploadThing.

## Stack

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + shadcn/ui-style component system
- Framer Motion for micro-interactions and transitions
- Prisma ORM
- NextAuth credentials auth + UVA domain gating
- UploadThing uploads
- Unified listing search + filters + trending logic
- Stripe Connect seller onboarding + payouts through listing checkout

## Features

- UVA-only auth gate (`@virginia.edu` and `@mail.virginia.edu`)
- Email + password signup with email verification
- Password sign-in plus forgot/reset password flows
- Friendly blocked-domain screen with waitlist form
- Landing page with fresh finds + Hot on Grounds (last 72h favorites)
- Marketplace with sticky unified search, filters, sorting, and infinite loading
- Listing detail with carousel, seller card, favorites, reporting, and similar items
- Protected multi-step Sell flow (upload, details, meetup, review)
- Messaging (conversation per buyer/seller/listing with read states)
- Profile pages with active/sold listings, favorites, and editable user profile
- Favorites page
- Safety and rules page

## Environment

Copy `.env.example` to `.env` and set values:

```bash
cp .env.example .env
```

Required vars:

- `DATABASE_URL` (pooled Postgres runtime URL)
- `DIRECT_URL` (direct Postgres URL for Prisma CLI/migrations)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DEV_AUTH_BYPASS` (`true` enables local-only auth bypass outside production)
- `EMAIL_SERVER` or the split SMTP vars below
- `EMAIL_SERVER_HOST`
- `EMAIL_SERVER_PORT`
- `EMAIL_SERVER_SECURE`
- `EMAIL_SERVER_USER`
- `EMAIL_SERVER_PASSWORD`
- `EMAIL_FROM`
- `UPLOADTHING_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`

## Local Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
HoosFinds now uses UVA email + password auth with email verification and password reset.
You need working SMTP credentials for verification and reset emails unless you are using local dev preview mode.
For local development without SMTP, set `DEV_AUTH_BYPASS="true"`. That unlocks the dev bypass button on `/sign-in` and returns preview verification/reset links from the auth APIs instead of sending live email.
For database hosting, use Neon and place the pooled URL in `DATABASE_URL` and the direct URL in `DIRECT_URL`.
For Stripe checkout, create a Stripe account, add `STRIPE_SECRET_KEY`, and point a webhook endpoint at `/api/stripe/webhook` using `STRIPE_WEBHOOK_SECRET`.
For Stripe Connect seller payouts, add `STRIPE_CONNECT_WEBHOOK_SECRET` and use the payments workspace at `/payments`.

## Seed Data

Seed includes:

- 6 UVA users
- 28 realistic UVA listings across categories
- Favorites data for trending
- Conversations/messages tied to listings

Seeded users are email-verified and use the shared local password:

- `hoosfinds123`

## Key Paths

- App shell/layout: `app/layout.tsx`
- Landing page: `app/page.tsx`
- Marketplace: `app/market/page.tsx`, `components/market/market-client.tsx`
- Listing detail: `app/listing/[id]/page.tsx`, `components/sections/listing-detail-view.tsx`
- Sell flow: `app/sell/page.tsx`, `components/sell/sell-wizard.tsx`
- Messages: `app/messages/page.tsx`, `components/messages/messages-client.tsx`
- Profile: `app/u/[username]/page.tsx`, `components/profile/profile-view.tsx`
- Auth config + UVA gate: `lib/auth.ts`, `app/auth/uva-only/page.tsx`, `app/(auth)/*`
- Prisma schema + seed: `prisma/schema.prisma`, `prisma/seed.ts`
- UploadThing router: `app/api/uploadthing/core.ts`
- Stripe Connect seller payments: `app/payments/page.tsx`, `components/connect/connect-demo-client.tsx`
- Stripe Connect API: `app/api/connect/*`, `lib/connect.ts`

## Netlify Deploy

Recommended database: Neon.

Why Neon:

- Serverless Postgres fits Netlify's function-based runtime well.
- Prisma documents Neon specifically for Postgres deployments and notes its generous free tier.
- Neon gives you both pooled and direct connection strings, which matches Prisma's runtime + migration split cleanly.

Set these Netlify environment variables in the Netlify UI with scopes that include both Builds and Functions:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `EMAIL_SERVER` or the split `EMAIL_SERVER_*` vars
- `EMAIL_FROM`
- `UPLOADTHING_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `DEV_AUTH_BYPASS` if you want local-only bypass and preview auth links without live email delivery

This repo includes [netlify.toml](/Users/noelsierra/Unicycle/netlify.toml) with the build command:

```bash
npx prisma generate && npx prisma migrate deploy && next build
```

Deployment steps:

1. Create a Neon project and copy both the pooled and direct connection strings.
2. Add the env vars in Netlify.
3. Deploy the site.
4. If you want starter data in that database, run `npx prisma db seed` against the Neon database once.

## Stripe Checkout

This repo includes a hosted Stripe Checkout flow for listing purchases:

- `POST /api/checkout/session` creates a Checkout Session for an active listing
- `POST /api/stripe/webhook` fulfills the order on `checkout.session.completed`
- `/checkout/success` and `/checkout/cancel` handle buyer redirects

Local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the webhook signing secret Stripe prints in the CLI or Dashboard for `STRIPE_WEBHOOK_SECRET`.

## Auth

HoosFinds auth is now:

- sign up with UVA email + password
- verify your email once
- sign in with credentials after that
- use forgot password to reset or create your first password

Notes:

- only `@virginia.edu` and `@mail.virginia.edu` are allowed
- existing magic-link-era users are not silently broken
- if an older account has no password yet, use `/forgot-password` to create one
- the old NextAuth magic-link `VerificationToken` table remains only as legacy adapter baggage

Troubleshooting:

- if signup or reset says email delivery is not configured, set `NEXTAUTH_URL`, `EMAIL_FROM`, and your SMTP vars
- if local email delivery is not ready yet, set `DEV_AUTH_BYPASS="true"` and use the preview links returned by auth flows
- if an older account cannot sign in yet, use `/forgot-password` to create the first password for that account

Main auth routes:

- `/sign-in`
- `/sign-up`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `POST /api/auth/register`
- `POST /api/auth/resend-verification`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Stripe Connect

This repo includes a Stripe Connect integration that powers seller payouts underneath normal marketplace listings:

- sellers connect payouts from `/payments`
- sellers create inventory through the normal `/sell` listing flow
- buyers check out the real listing through hosted Checkout
- HoosFinds routes payout funds to the listing seller's connected account
- thin connected-account webhooks keep payout readiness current

Main routes:

- `/payments` seller payout center
- `POST /api/connect/account` creates the connected account mapping
- `POST /api/connect/account/onboarding` creates the onboarding Account Link
- `POST /api/connect/webhook` handles thin connected-account events
- `POST /api/checkout/session` starts listing checkout
- `POST /api/stripe/webhook` fulfills listing payments

Thin-event local listener:

```bash
stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' --forward-thin-to localhost:3000/api/connect/webhook
```

Use the webhook signing secret printed by the Stripe CLI or Dashboard for `STRIPE_CONNECT_WEBHOOK_SECRET`.

In the Stripe Dashboard, configure the connected-account event destination with:

1. Event source: `Connected accounts`
2. Payload style: `Thin`
3. Events:
   - `v2.account[requirements].updated`
   - `v2.account[configuration.recipient].capability_status_updated`

The Dashboard labels may omit `core`, but the current Stripe Node SDK surfaces
these notifications inside the app as:

- `v2.core.account[requirements].updated`
- `v2.core.account[configuration.recipient].capability_status_updated`

The payments workspace intentionally does not persist onboarding status in Prisma. `/payments` asks Stripe for the latest connected-account status every time it renders so sellers always see live readiness data.
