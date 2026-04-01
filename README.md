# HoosFinds

UVA's fashion-first resale marketplace built with Next.js 14, TypeScript, Tailwind, shadcn/ui-style primitives, Prisma, NextAuth, Stripe, and UploadThing.

## Current Product Model

HoosFinds now has one canonical marketplace flow:

1. Sign up with a UVA email and password
2. Verify your email once
3. Connect payouts from `/payments`
4. Create listings through the normal `/sell` flow
5. Buyers purchase the real marketplace listing through Stripe Checkout
6. HoosFinds routes seller earnings to the seller's connected payout account

Important product decisions:

- `Listing` is the only seller-facing inventory model
- `/payments` is a payout setup and payout status center, not a second storefront
- Stripe Connect powers payouts underneath normal listings
- the old Connect storefront inventory flow is retired

## Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui-style component system
- Framer Motion for motion and transitions
- Prisma ORM + PostgreSQL
- NextAuth credentials auth with JWT sessions
- `bcryptjs` password hashing
- Nodemailer SMTP email delivery for verification and password reset
- UploadThing uploads
- Stripe Checkout for listing purchases
- Stripe Connect for seller onboarding and payout routing

## Core Features

- UVA-only auth gate for `@virginia.edu` and `@mail.virginia.edu`
- Email + password sign up
- Email verification
- Password sign in
- Forgot password / reset password
- Waitlist path for non-UVA emails
- Landing page, Browse, Following, listing detail, profiles, favorites, and purchases
- Protected multi-step sell flow
- Listing-backed checkout with seller payout routing
- Seller payout center at `/payments`
- Messaging between buyers and sellers
- Reporting, trust, and meetup flows around listings

## Auth Architecture

HoosFinds auth is now a standard UVA-only email + password flow.

### How auth works

- Users sign up with a UVA email and password
- HoosFinds stores only a hashed password in `User.passwordHash`
- New users are unverified until they complete email verification
- Users sign in through the NextAuth `CredentialsProvider`
- Sessions use NextAuth JWT strategy
- Users can request password reset without revealing whether an account exists

### UVA-only enforcement

Allowed domains:

- `virginia.edu`
- `mail.virginia.edu`

UVA gating exists both:

- client-side for fast feedback
- server-side for real enforcement

Non-UVA users are redirected to the existing waitlist / UVA-only flow instead of creating a real account.

### Existing user migration

Older HoosFinds accounts created during the magic-link era are not silently broken.

Migration path:

- if an older user record exists without `passwordHash`
- the user should use `/forgot-password`
- the reset flow becomes the safe first-password setup path

### Auth email delivery

Email is now used for:

- signup verification
- resend verification
- forgot password
- reset password

It is no longer used as the primary login method.

### Local development auth ergonomics

If `DEV_AUTH_BYPASS="true"` and the app is not running in production:

- the sign-in page shows a dev bypass button
- auth APIs can return preview verification/reset links when SMTP is not configured

This bypass is intentionally disabled in production code paths.

## Seller + Payments Architecture

HoosFinds now has one seller system instead of two disconnected ones.

### Canonical seller flow

- sellers connect payouts from `/payments`
- sellers create inventory through `/sell`
- buyers buy the real `Listing`
- Stripe Checkout creates payment for that listing
- Stripe Connect routes funds to the listing seller's connected account

### Single source of truth

The `Listing` model is the only live inventory buyers should ever see.

Marketplace surfaces all read from normal listings:

- Browse
- Following
- listing detail
- profiles
- purchases
- messaging
- checkout

### `/payments` now means

`/payments` is a seller payout center. It handles:

- connected account creation
- Stripe onboarding
- payout readiness status
- payout-related seller guidance
- recent listing-backed sales visibility

It does not create separate products or manage a second seller catalog.

### Checkout behavior

`POST /api/checkout/session` now:

- loads the real listing
- verifies the listing is still active
- verifies the buyer is not the seller
- checks the seller's payout readiness
- creates the Stripe Checkout session for the listing
- applies the platform fee
- routes payout funds to the seller's connected account

Webhook fulfillment continues to update the real marketplace `Order`, `Transaction`, and `Listing` records.

### Seller readiness rules

Sellers can prepare to sell through the normal product flow, but payouts must be ready before a listing can actually go live or receive routed checkout funds.

In seller-facing copy, the app should feel like:

1. Connect payouts
2. Post listing
3. Get paid

Stripe complexity stays underneath the marketplace UI.

## Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required environment variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DEV_AUTH_BYPASS`
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

Notes:

- `NEXTAUTH_URL` is required for verification and reset links
- `EMAIL_FROM` is required before the app can send auth emails
- `DEV_AUTH_BYPASS` should only be enabled locally
- Stripe payout onboarding depends on `STRIPE_SECRET_KEY`

## Local Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local notes

- Seeded users are already email-verified
- the shared seeded password is `hoosfinds123`
- if SMTP is not ready locally, set `DEV_AUTH_BYPASS="true"`
- with bypass enabled, auth routes can return preview verification/reset links instead of requiring live email delivery

## Seed Data

Current seed includes:

- 6 UVA users
- 28 UVA-themed listings
- favorites data for trending and social surfaces
- messages and conversations tied to listings

Seeded users are verified and use the shared password:

- `hoosfinds123`

## API Surface

### Active auth routes

- `POST /api/auth/register`
- `POST /api/auth/resend-verification`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/[...nextauth]`

### Active seller and checkout routes

- `POST /api/connect/account`
- `POST /api/connect/account/onboarding`
- `POST /api/connect/webhook`
- `POST /api/checkout/session`
- `POST /api/stripe/webhook`

### Retired legacy routes

These remain in the codebase only to fail clearly while old references are retired:

- `POST /api/connect/products` returns `410 Gone`
- `POST /api/connect/checkout` returns `410 Gone`

## Local Stripe Testing

### Listing checkout webhook

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed signing secret for `STRIPE_WEBHOOK_SECRET`.

### Connected-account thin events

```bash
stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' --forward-thin-to localhost:3000/api/connect/webhook
```

Use the printed signing secret for `STRIPE_CONNECT_WEBHOOK_SECRET`.

In the Stripe Dashboard, configure the connected-account event destination with:

1. Event source: `Connected accounts`
2. Payload style: `Thin`
3. Events:
   - `v2.account[requirements].updated`
   - `v2.account[configuration.recipient].capability_status_updated`

The Dashboard labels may omit `core`, but the Stripe Node SDK surfaces them in app code as:

- `v2.core.account[requirements].updated`
- `v2.core.account[configuration.recipient].capability_status_updated`

## Key Paths

### Marketplace

- App shell: `app/layout.tsx`
- Landing page: `app/page.tsx`
- Browse: `app/market/page.tsx`, `components/market/market-client.tsx`
- Following: `app/following/page.tsx`, `components/social/following-feed-section.tsx`
- Listing detail: `app/listing/[id]/page.tsx`, `components/sections/listing-detail-view.tsx`
- Sell flow: `app/sell/page.tsx`, `components/sell/sell-wizard.tsx`
- Messages: `app/messages/page.tsx`, `components/messages/messages-client.tsx`
- Profile: `app/u/[username]/page.tsx`, `components/profile/profile-view.tsx`

### Auth

- Auth config: `lib/auth.ts`
- Auth env helpers: `lib/auth-config.ts`
- Password helpers: `lib/auth-passwords.ts`
- Auth token helpers: `lib/auth-tokens.ts`
- Auth email helpers: `lib/auth-email.ts`
- Sign-in UI: `app/(auth)/sign-in/page.tsx`, `components/sections/sign-in-form.tsx`
- Sign-up UI: `app/(auth)/sign-up/page.tsx`, `components/sections/sign-up-form.tsx`
- Forgot/reset UI: `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`
- Verify UI: `app/(auth)/verify-email/page.tsx`
- UVA-only gate: `app/auth/uva-only/page.tsx`, `components/sections/uva-only-gate.tsx`

### Seller payouts

- Payout center: `app/payments/page.tsx`
- Payout actions: `components/payments/payout-actions.tsx`
- Seller payout readiness: `lib/seller-payouts.ts`
- Listing checkout: `app/api/checkout/session/route.ts`
- Stripe fulfillment webhook: `app/api/stripe/webhook/route.ts`
- Connect account creation: `app/api/connect/account/route.ts`
- Connect onboarding: `app/api/connect/account/onboarding/route.ts`
- Connect thin-event webhook: `app/api/connect/webhook/route.ts`

### Data model

- Prisma schema: `prisma/schema.prisma`
- Seed data: `prisma/seed.ts`
- Auth password migration: `prisma/migrations/20260401062854_auth_passwords/migration.sql`

## Legacy Notes

Some legacy structures remain temporarily so old data and adapter expectations do not break while the app transitions cleanly:

- `VerificationToken` remains because the NextAuth Prisma adapter still expects the model shape
- `ConnectProduct` and `ConnectOrder` remain in Prisma as legacy models for migration compatibility
- `lib/connect.ts` remains as legacy support code and should not be treated as the primary seller architecture

Canonical direction for future contributors:

- use `Listing` for inventory
- use `ConnectedAccount` only for payout routing
- keep `/payments` focused on payout setup and seller payout state
- do not build new seller-facing product creation flows outside `/sell`

## Netlify Deploy

Recommended database: Neon.

Set these env vars in Netlify for both builds and runtime functions:

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

Keep `DEV_AUTH_BYPASS` disabled in production.

This repo includes `netlify.toml` with:

```bash
npx prisma generate && npx prisma migrate deploy && next build
```

Deployment steps:

1. Create a Neon project
2. Add pooled and direct Postgres URLs
3. Add auth, email, UploadThing, and Stripe env vars
4. Deploy
5. Optionally run `npx prisma db seed` against the deployed database once

## Troubleshooting

### Auth

- If verification or reset email sending fails, check `NEXTAUTH_URL`, `EMAIL_FROM`, and SMTP vars
- If local SMTP is not ready yet, enable `DEV_AUTH_BYPASS="true"` and use preview links
- If an older account exists without a password, use `/forgot-password` to create the first password
- If a non-UVA user tries to sign up, they should be routed to the UVA-only waitlist flow

### Seller payouts

- If `/payments` says payouts are unavailable, confirm `STRIPE_SECRET_KEY` is configured
- If listing checkout says the seller is not ready, the seller still needs to finish payout onboarding
- If connected-account readiness looks stale, refresh `/payments` and confirm the Connect webhook secret is correct
