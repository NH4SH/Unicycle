# UniCycle

UVA-only resale marketplace built with Next.js 14, TypeScript, Tailwind, shadcn/ui, Framer Motion, Prisma, NextAuth, and UploadThing.

## Stack

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + shadcn/ui-style component system
- Framer Motion for micro-interactions and transitions
- Prisma ORM
- NextAuth email magic links + UVA domain gating
- UploadThing uploads
- Unified listing search + filters + trending logic

## Features

- UVA-only auth gate (`@virginia.edu` and `@mail.virginia.edu`)
- Friendly blocked-domain screen with waitlist form
- Landing page with Today’s Drops + Hot on Grounds (last 72h favorites)
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

- `DATABASE_URL` (default local SQLite: `file:./dev.db`)
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

## Local Setup

```bash
npm install
# one-time local SQLite bootstrap (avoids first-run SQLite file creation issue in some environments)
touch prisma/dev.db
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
The sign-in flow now sends a magic link to UVA inboxes only. You need working SMTP credentials for the email provider you choose.
For local development without SMTP, set `DEV_AUTH_BYPASS="true"` and use the dev bypass button on `/sign-in`.

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

## Postgres Notes

Schema and queries are compatible with Postgres. For Postgres deployment:

1. Change datasource provider in `prisma/schema.prisma` from `sqlite` to `postgresql`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run migrations again:

```bash
npx prisma migrate dev
```
