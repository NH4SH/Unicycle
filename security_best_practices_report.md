# HoosFinds Defensive Security Audit

_Date:_ 2026-04-02  
_Auditor:_ Codex defensive review  
_Target:_ HoosFinds (`Next.js`, `TypeScript`, `Prisma`, `NextAuth`, `Stripe Checkout + Connect`, `UploadThing`, `Netlify`)

## Executive Summary

I reviewed HoosFinds as a defensive web-application security audit with three goals:
- map the real attack surface
- identify the most realistic exploitable failures
- separate production-safe checks from staging-only active testing

### Bottom line

I did **not** find an obvious unauthenticated remote-code-execution or direct payment-bypass bug in the current codebase. The strongest parts of the app are:
- production `NextAuth` cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`
- Stripe checkout webhooks verify signatures and implement event idempotency
- checkout reservation logic uses serializable transactions to reduce duplicate-purchase races
- sensitive admin mutation routes enforce server-side `ADMIN` checks
- auth email configuration is isolated to server-only modules, and I did not find client-bundle env leakage in the current code

The most important remaining risks are:
1. **runtime dependencies are in known-vulnerable ranges**, especially `next`
2. **there is no visible rate limiting** on auth and other abuse-prone write paths
3. **a banned seller can relist a cancelled item** because one route skips the moderation/ban gate
4. **user-controlled strings are interpolated directly into HTML emails**
5. **baseline browser security headers are still missing from live responses**

## Methodology

### Phase 1: Production-safe passive checks
- mapped routes and sensitive flows from `app/` and `app/api/`
- checked live production headers for [https://hoosfinds.com](https://hoosfinds.com) and auth endpoints
- verified auth provider exposure through [https://hoosfinds.com/api/auth/providers](https://hoosfinds.com/api/auth/providers)
- checked production cookie flags through [https://hoosfinds.com/api/auth/csrf](https://hoosfinds.com/api/auth/csrf)
- reviewed tracked files for `.env`, `.next`, `.netlify`, and source-map exposure
- ran `npm audit --omit=dev --json`

### Phase 2: Code and architecture review
- auth/session/runtime config
- admin and verified-seller role enforcement
- listings, messaging, follows, notifications, moderation, bans
- checkout/session creation and Stripe webhook reconciliation
- upload and server-side image processing
- email delivery and transaction emails

### Phase 3: Staging-only active testing
- **not executed against production**
- a separate plan is provided below

## Attack Surface Map

### Public pages
- `/`
- `/market`
- `/listing/[id]`
- `/u/[username]`
- `/verified-seller`
- `/verified-seller/apply`
- `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`
- `/auth/uva-only`

### Auth/session endpoints
- `/api/auth/[...nextauth]`
- `/api/auth/register`
- `/api/auth/forgot-password`
- `/api/auth/resend-verification`
- `/api/auth/reset-password`

### Marketplace and social endpoints
- `/api/listings`
- `/api/listings/[id]`
- `/api/listings/[id]/favorite`
- `/api/conversations`
- `/api/conversations/[id]/report`
- `/api/messages`
- `/api/feed/following`
- `/api/users/[id]/follow`
- `/api/users/[id]/unfollow`
- `/api/users/[id]/block`
- `/api/users/[id]/unblock`
- `/api/notifications`
- `/api/notifications/[id]`
- `/api/profile`

### Payments and seller endpoints
- `/api/checkout/session`
- `/api/stripe/webhook`
- `/payments`
- `/api/connect/account`
- `/api/connect/account/onboarding`
- `/api/connect/webhook`
- `/verified-seller/portal`

### Admin and moderation endpoints
- `/admin`
- `/admin/verified-sellers`
- `/api/admin/users/[id]`
- `/api/admin/listings/[id]`
- `/api/admin/verified-sellers/[id]`

### Upload and media handling
- `/api/uploadthing`
- server-side processing in `lib/image-upload-processing.server.ts`

## Findings

## High

### SEC-001: Runtime dependencies are in known-vulnerable ranges
- Severity: High
- OWASP: A06 Vulnerable and Outdated Components
- Affected files:
  - `package.json:32`
  - `package.json:41-52`
  - `next.config.mjs:6-20`
- Evidence:
  - `npm audit --omit=dev --json` reports high-severity advisories affecting runtime packages.
  - `next` is declared at `^14.2.25` and falls in multiple advisory ranges, including:
    - `GHSA-h25m-26qc-wcjf` (high): request deserialization DoS in Next.js
    - `GHSA-9g9p-9gw9-jx7f` (moderate): `next/image` remotePatterns DoS
    - `GHSA-ggv3-7p47-pfv8` (moderate): request smuggling in rewrites
    - `GHSA-3x4c-7xq6-9pq8` (moderate): unbounded image cache growth
  - `uploadthing` / `@uploadthing/react` also pull a high-severity advisory chain through `effect`.
- Why this matters:
  - This is not a hypothetical code smell. The deployed runtime is on a framework line with active security advisories.
  - The `next/image` advisory is more relevant because HoosFinds uses remote image hosts in `remotePatterns`.
- Safe reproduction:
  - Run `npm audit --omit=dev --json` locally.
- Recommended fix:
  - Upgrade `next` to a patched supported release and revalidate Netlify/plugin compatibility.
  - Upgrade `uploadthing` to a patched release and retest upload flows.
  - Re-run audit after each upgrade and document accepted residual advisories.
- Notes:
  - The `prisma` CLI advisory reported by `npm audit` appears more build-time than runtime in this app. I would still upgrade it, but `next` is the first priority.

## Medium

### SEC-002: No visible rate limiting on auth and abuse-prone write flows
- Severity: Medium
- OWASP: A07 Identification and Authentication Failures / Abuse Controls
- Affected files:
  - `app/api/auth/register/route.ts:10-84`
  - `app/api/auth/forgot-password/route.ts:11-50`
  - `app/api/auth/resend-verification/route.ts:11-50`
  - `app/api/waitlist/route.ts:6-22`
  - `lib/auth.ts:51-116`
- Evidence:
  - I found **no repo-visible rate limiter** (`rg -n "rate.?limit|throttle|limiter|upstash|Ratelimit"` returned nothing).
  - Registration, forgot-password, resend-verification, and waitlist endpoints accept repeated requests with no IP/email backoff.
  - Credentials login relies on `NextAuth` credentials auth, but there is no repo-visible throttle around the credentials callback path.
- Why this matters:
  - Attackers can password-spray UVA emails, hammer password reset delivery, flood verification emails, or spam the waitlist table.
  - Even when enumeration messaging is fairly controlled, lack of throttling still creates brute-force and quota-abuse risk.
- Safe reproduction:
  - In staging, repeatedly POST to:
    - `/api/auth/forgot-password`
    - `/api/auth/resend-verification`
    - `/api/auth/register`
    - `/api/waitlist`
  - Confirm there is no IP or account backoff and no 429 behavior.
- Recommended fix:
  - Add centralized edge or route-layer rate limiting keyed by IP and normalized email.
  - Apply stricter limits to auth and email-triggering routes than to normal application writes.
  - Add duplicate suppression to `waitlist` and optional CAPTCHA for public forms.

### SEC-003: Banned sellers can relist cancelled inventory through a route that skips moderation checks
- Severity: Medium
- OWASP: A01 Broken Access Control
- Affected files:
  - `app/api/transactions/[id]/relist/route.ts:14-49`
  - compare with the expected guard in `lib/moderation.ts:48-57`
- Evidence:
  - The relist route authenticates the seller and checks transaction ownership.
  - It **does not** call `assertUserCanAccessMarketplace(session.user.id)` before setting the listing back to `ACTIVE`.
  - Other seller-facing mutation routes do enforce that ban/moderation gate.
- Why this matters:
  - A seller who has been banned from marketplace actions can still reactivate previously cancelled inventory if they control a cancelled transaction.
  - That undermines the intended moderation model and creates an inconsistent trust boundary.
- Safe reproduction:
  - In staging:
    1. Ban a seller account.
    2. Ensure that seller has a cancelled transaction tied to a cancelled listing.
    3. POST to `/api/transactions/[id]/relist` as that seller.
    4. Observe the listing return to `ACTIVE` despite the ban.
- Recommended fix:
  - Add `assertUserCanAccessMarketplace(session.user.id)` to the relist route.
  - Consider sharing one seller mutation guard helper across relist, cancel, edit, and publish paths so moderation rules stay consistent.

### SEC-004: User-controlled strings are interpolated directly into HTML email templates
- Severity: Medium
- OWASP: A03 Injection
- Affected files:
  - `lib/transaction-email.ts:26-65`
  - `lib/auth-email.ts:24-37`
  - `lib/auth-email.ts:55-68`
  - `lib/auth-email.ts:85-98`
- Evidence:
  - Transactional email HTML is built with raw string interpolation.
  - Examples include `buyerName`, `listingTitle`, `sellerName`, `businessName`, and `displayName` inserted directly into HTML nodes and attributes.
  - There is no HTML escaping helper before interpolation.
- Why this matters:
  - A malicious user can inject arbitrary HTML into emails received by other users.
  - Many mail clients block script, but HTML injection is still enough for deceptive links, layout spoofing, remote-image beacons, or phishing-style content inside trusted HoosFinds emails.
  - The cleanest cross-user path is the seller sale email, where a buyer-controlled display name is emailed to the seller.
- Safe reproduction:
  - In staging, set a buyer display name to something like:
    - `</p><p><a href="https://example.com">View secure pickup instructions</a></p><p>`
  - Complete a test purchase and inspect the seller’s received email HTML.
- Recommended fix:
  - Escape all user-controlled strings before interpolation.
  - Sanitize/validate URLs used in `<a href>` and `<img src>` contexts.
  - Prefer a templating approach that defaults to escaping rather than raw string concatenation.

## Low

### SEC-005: Live responses are missing baseline browser hardening headers
- Severity: Low
- OWASP: A05 Security Misconfiguration
- Affected files:
  - `next.config.mjs:1-24`
  - `netlify.toml:1-6`
- Runtime evidence:
  - `curl -I https://hoosfinds.com` and `curl -D - https://hoosfinds.com/sign-in -o /dev/null` showed:
    - present: `Strict-Transport-Security`, `X-Content-Type-Options`
    - missing: `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`
    - exposed: `X-Powered-By: Next.js`
- Why this matters:
  - Missing CSP and frame protections weaken defense-in-depth for auth, admin, and payment-adjacent pages.
  - This does not create XSS by itself, but it makes any future injection bug easier to weaponize.
- Recommended fix:
  - Add baseline headers through Next config or Netlify headers.
  - Minimum useful set:
    - `Content-Security-Policy`
    - `frame-ancestors 'none'` or `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy` with only necessary features
    - disable `x-powered-by`
- Notes:
  - Because the app uses an inline theme script, CSP rollout needs either a nonce/hash or a small refactor.

## Open Questions / Privacy Notes

These are worth product review, but I am **not** classifying them as confirmed security findings without your intent clarified:
- Public profile pages expose each user’s `Saved` tab to any viewer (`components/profile/profile-view.tsx:404-456`, `lib/data.ts:1084-1099`, `lib/data.ts:1194-1199`). If favorites are meant to be private, this is a privacy leak.
- Verified Shop profiles expose the exact shop address publicly. That may be intentional for local partners.

## Positive Security Signals

These parts are in good shape and should be preserved during remediation:
- Production NextAuth cookies are secure:
  - `__Host-next-auth.csrf-token` and `__Secure-next-auth.callback-url` are `HttpOnly`, `Secure`, `SameSite=Lax` on the live site.
- Production auth surface is clean:
  - `https://hoosfinds.com/api/auth/providers` exposes only the `credentials` provider.
  - The dev bypass is guarded by `process.env.NODE_ENV !== "production"` in `lib/auth-runtime.ts:16-18`.
- Stripe webhook handling is stronger than average:
  - signatures are verified
  - webhook events are claimed idempotently and marked processed/failed
  - checkout/order reconciliation uses transactions and duplicate guards
- Sensitive server config does not appear to leak into tracked client bundles from current source review.
- `.env`, `.next`, and `.netlify` are not tracked in git; only `.env.example` is tracked.

## Fix First Shortlist

1. Upgrade `next` and `uploadthing` to patched versions and retest deploy + upload behavior.
2. Add rate limiting/backoff to auth and public write endpoints.
3. Close the banned-seller relist bypass in `app/api/transactions/[id]/relist/route.ts`.
4. Escape all user-controlled strings in HTML email templates.
5. Add a baseline CSP and clickjacking protections.

## Production-Safe Passive Checks Completed

Completed in this audit:
- route and surface mapping from `app/` and `app/api/`
- live header inspection
- production auth provider exposure check
- cookie flag inspection via `/api/auth/csrf`
- repo secret/build artifact hygiene check
- dependency audit
- code review of:
  - auth/session handling
  - admin role checks
  - verified seller approval flow
  - listing and transaction mutation routes
  - checkout/session creation
  - Stripe checkout webhook and Connect webhook
  - upload/image processing pipeline
  - email delivery/templates

## Staging-Only Active Test Plan

Do **not** run these against production.

### Authentication and abuse
- Password-spray simulation against the credentials callback to verify 429/backoff behavior.
- Forgot-password and resend-verification flood test using a staging inbox.
- Signup flood test and waitlist spam test.

### Authorization and role isolation
- Cross-role API fuzzing with at least four accounts:
  - anonymous
  - normal UVA buyer/seller
  - verified shop
  - admin
- Attempt forbidden access to:
  - `/api/admin/*`
  - `/api/transactions/[id]/*` across non-participants
  - `/api/users/[id]/block|follow|unfollow` against invalid/self targets
  - `/api/checkout/session` against own listing, sold listing, and hidden listing
- Specifically test the relist path after bans until fixed.

### Payments and Stripe
- Replay the same Stripe webhook event multiple times and confirm idempotent behavior.
- Attempt duplicate checkout creation for one listing from two buyers simultaneously.
- Test checkout expiration and refund paths for stale reservations.
- Test seller payout reconnect / restricted-account states during checkout gating.

### Upload pipeline
- Upload malformed JPEG/PNG/HEIC files.
- Upload maximum-size HEIC files and extreme-dimension images.
- Test whether image processing can be forced into CPU/memory stress.
- Verify rejected files do not leave raw originals behind.

### Messaging and notifications
- Send repeated message/follow events to test for notification spam and missing backoff.
- Confirm blocked users cannot message through alternate paths or stale conversations.

### Browser security
- Run ZAP baseline first, then authenticated staging scan.
- Verify clickjacking with a staging iframe proof-of-concept before CSP/frame protections are added.
- Enumerate CSP violations once a policy is introduced.

## Recommended Remediation Plan

### Sprint 1
- Upgrade vulnerable runtime dependencies.
- Add auth/public route rate limiting.
- Fix relist ban bypass.
- Escape HTML emails.

### Sprint 2
- Add CSP/frame/referrer hardening.
- Add abuse telemetry for auth, waitlist, messaging, and follow endpoints.
- Review privacy intent for public favorites and shop-address visibility.

### Sprint 3
- Execute the staging active test plan.
- Add regression tests for:
  - banned seller relist denial
  - webhook replay idempotency
  - HTML escaping in outbound emails
  - auth route throttling
