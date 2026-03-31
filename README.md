# HoosFinds

UVA's fashion-first resale marketplace built with Next.js 14, TypeScript, Tailwind, shadcn/ui, Framer Motion, Prisma, NextAuth, and UploadThing.

## Stack

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + shadcn/ui-style component system
- Framer Motion for micro-interactions and transitions
- Prisma ORM
- NextAuth email magic links + UVA domain gating
- UploadThing uploads
- Unified listing search + filters + trending logic
- Sample Stripe Connect seller onboarding + storefront flow

## Features

- UVA-only auth gate (`@virginia.edu` and `@mail.virginia.edu`)
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
- `TEST_AUTH_BYPASS` (`true` enables the team testing bypass on hosted environments)
- `TEST_AUTH_BYPASS_CODE` (required when `TEST_AUTH_BYPASS` is enabled)
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
The sign-in flow now sends a magic link to UVA inboxes only. You need working SMTP credentials for the email provider you choose.
For local development without SMTP, set `DEV_AUTH_BYPASS="true"` and use the dev bypass button on `/sign-in`.
For hosted team testing without SMTP, set `TEST_AUTH_BYPASS="true"` and `TEST_AUTH_BYPASS_CODE` to a private shared code. The hosted sign-in form will require both a UVA email and that code.
For database hosting, use Neon and place the pooled URL in `DATABASE_URL` and the direct URL in `DIRECT_URL`.
For Stripe checkout, create a Stripe account, add `STRIPE_SECRET_KEY`, and point a webhook endpoint at `/api/stripe/webhook` using `STRIPE_WEBHOOK_SECRET`.
For the Stripe Connect sample, add `STRIPE_CONNECT_WEBHOOK_SECRET` and use the demo at `/connect-demo`.

## Demo Data

Seed includes:

- 6 UVA users
- 28 realistic UVA listings across categories
- Favorites data for trending
- Conversations/messages tied to listings

## Key Paths

- App shell/layout: `app/layout.tsx`
- Landing page: `app/page.tsx`
- Marketplace: `app/market/page.tsx`, `components/market/market-client.tsx`
- Listing detail: `app/listing/[id]/page.tsx`, `components/sections/listing-detail-view.tsx`
- Sell flow: `app/sell/page.tsx`, `components/sell/sell-wizard.tsx`
- Messages: `app/messages/page.tsx`, `components/messages/messages-client.tsx`
- Profile: `app/u/[username]/page.tsx`, `components/profile/profile-view.tsx`
- Auth config + UVA gate: `lib/auth.ts`, `app/auth/uva-only/page.tsx`
- Prisma schema + seed: `prisma/schema.prisma`, `prisma/seed.ts`
- UploadThing router: `app/api/uploadthing/core.ts`
- Stripe Connect demo: `app/connect-demo/page.tsx`, `components/connect/connect-demo-client.tsx`
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
- `TEST_AUTH_BYPASS` and `TEST_AUTH_BYPASS_CODE` if you want a shared testing login instead of live email delivery

This repo includes [netlify.toml](/Users/noelsierra/Unicycle/netlify.toml) with the build command:

```bash
npx prisma generate && npx prisma migrate deploy && next build
```

Deployment steps:

1. Create a Neon project and copy both the pooled and direct connection strings.
2. Add the env vars in Netlify.
3. Deploy the site.
4. If you want seeded demo data in that database, run `npx prisma db seed` against the Neon database once.

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

## Stripe Connect Sample

This repo also includes a sample Stripe Connect integration that demonstrates:

- creating recipient-style connected accounts with the V2 Accounts API
- generating Stripe-hosted onboarding links
- creating platform-level products that map back to connected accounts
- a demo storefront that charges customers through hosted Checkout
- destination charges with an application fee
- persisted Connect orders that are fulfilled by Stripe webhooks
- thin connected-account webhooks for onboarding requirement changes

Main routes:

- `/connect-demo` seller tools + customer storefront
- `POST /api/connect/account` creates the connected account mapping
- `POST /api/connect/account/onboarding` creates the onboarding Account Link
- `POST /api/connect/products` creates a platform-level Stripe product
- `POST /api/connect/checkout` starts hosted Checkout for the storefront
- `POST /api/connect/webhook` handles thin connected-account events

Connect storefront payments are fulfilled by the existing standard Stripe
webhook endpoint:

- `POST /api/stripe/webhook`

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

The sample intentionally does not persist onboarding status in Prisma. `/connect-demo` asks Stripe for the latest connected-account status every time it renders so sellers always see live readiness data.
