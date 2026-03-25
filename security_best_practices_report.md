# Security Best Practices Report

## Executive Summary

I reviewed the UniCycle Next.js application as a hostile-code-path security audit, focusing on authentication, authorization, state-changing routes, uploads, stored content, deployment posture, and dependency risk. The most serious issue is a production-capable testing bypass that can impersonate any UVA account if enabled. I also found a stored denial-of-service vector through unvalidated image hosts, an authorization flaw in conversation read-state updates, and a high-severity `next` dependency advisory affecting the currently deployed version.

## Scope

- Frameworks reviewed: Next.js App Router, React, NextAuth, Prisma, UploadThing
- Deployment surface reviewed: Netlify config, environment-driven auth behavior, dependency advisories
- Runtime verification limits: I reviewed code and current dependency advisory data. Edge/WAF/rate-limit/security-header controls outside the repo are not visible here and should be verified separately.

## Critical Findings

### SEC-001: Production auth bypass can impersonate any UVA user if enabled
- Severity: Critical
- Rule ID: NEXT-AUTHZ-001
- Location:
  - `lib/auth.ts:44-47`
  - `lib/auth.ts:75-113`
  - `lib/auth.ts:49-63`
- Evidence:
  - `TEST_AUTH_BYPASS` enables the credentials provider in production.
  - The provider accepts any `@virginia.edu` / `@mail.virginia.edu` string plus a shared code.
  - `findOrCreateUserByEmail()` loads or creates the account solely from the supplied email address.
- Impact:
  - Anyone who learns the shared bypass code can sign in as **any existing UVA user** by typing that person’s email address.
  - This is not just a testing shortcut; it is a full account impersonation path across the production app.
- Fix:
  - Remove the hosted bypass entirely from production, or restrict it to a fixed allowlist of specific test accounts that cannot overlap with real users.
  - If a hosted test flow is required, gate it behind a separate admin identity provider or one-time emailed links to pre-approved addresses.
- Mitigation:
  - Rotate `TEST_AUTH_BYPASS_CODE` immediately if it has been shared broadly.
  - Audit whether `TEST_AUTH_BYPASS=true` is currently set in Netlify.
- False positive notes:
  - This finding is configuration-dependent. If `TEST_AUTH_BYPASS` is never enabled outside local/dev, the critical impact is not reachable. If it is enabled on Netlify, the impact is immediate.

## High Findings

### SEC-002: Any authenticated seller can store image URLs that crash listing pages
- Severity: High
- Rule ID: NEXT-FILE-001
- Location:
  - `lib/validators.ts:9-18`
  - `app/api/listings/route.ts:42-55`
  - `app/api/listings/[id]/route.ts:20-39`
  - `next.config.mjs:2-14`
  - `components/cards/listing-card.tsx:25-31`
  - `components/sections/listing-detail-view.tsx:121-127`
- Evidence:
  - Listing creation/update accepts `images` as any `z.string().url()` values.
  - Next/Image only allows remote hosts `images.unsplash.com` and `utfs.io`.
  - Listing cards and detail views render stored `images[]` values directly via `<Image src={...} />`.
- Impact:
  - A logged-in attacker can create or edit a listing with a non-allowlisted image URL and trigger server render failures when that listing appears on `/`, `/market`, favorites, or detail pages.
  - This is a stored application-layer DoS reachable by any authenticated seller.
- Fix:
  - Enforce an allowlist of image hosts in server-side validation, ideally only accepting UploadThing-owned URLs or server-issued upload IDs.
  - Reject listing writes whose `images[]` do not match the allowed storage origin.
- Mitigation:
  - Add server-side fallback handling so a single bad image cannot fail the entire page render.
- False positive notes:
  - If the app later broadens `remotePatterns`, this exact crash vector changes, but the core issue remains: stored untrusted image origins are not validated at write time.

### SEC-003: The deployed Next.js version is affected by current security advisories
- Severity: High
- Rule ID: NEXT-SUPPLY-001
- Location:
  - `package.json:40`
- Evidence:
  - The repo declares `next: ^14.2.25` and the current lock/install resolved to `14.2.35` during recent deploys.
  - `npm audit --omit=dev --json` reported:
    - `GHSA-h25m-26qc-wcjf` (High): HTTP request deserialization can lead to DoS in Next.js.
    - `GHSA-9g9p-9gw9-jx7f` (Moderate): Image optimizer DoS affecting `remotePatterns` configurations.
- Impact:
  - The app is deployed on a known-vulnerable framework line, including an advisory relevant to the project’s `remotePatterns` usage.
- Fix:
  - Upgrade `next` to a currently supported patched release and retest the Netlify deployment path.
  - Re-run dependency audit after upgrade.
- Mitigation:
  - Put dependency advisories into CI so framework security updates do not stall behind manual checks.
- False positive notes:
  - Advisory exploitability depends on runtime behavior, but the package version is objectively in the vulnerable range according to npm’s advisory service.

## Medium Findings

### SEC-004: Conversation read-state updates happen on GET and lack ownership validation
- Severity: Medium
- Rule ID: NEXT-AUTHZ-002
- Location:
  - `app/api/conversations/route.ts:13-16`
  - `lib/data.ts:394-404`
- Evidence:
  - `GET /api/conversations?conversationId=...` calls `markConversationAsRead()`.
  - `markConversationAsRead()` updates messages by `conversationId` only and never confirms that the caller belongs to that conversation.
- Impact:
  - If a conversation ID leaks, any authenticated user can mutate another conversation’s read receipts.
  - Because the mutation is on a GET route, prefetches, crawlers, or accidental link visits can also change state unexpectedly.
- Fix:
  - Move read-state mutation to a dedicated POST/PATCH endpoint.
  - Verify the caller is the buyer or seller on the target conversation before updating any messages.
- Mitigation:
  - At minimum, add a membership check inside `markConversationAsRead()` before `updateMany()`.
- False positive notes:
  - Conversation IDs are not trivially guessable, which limits reachability, but this is still an authorization gap once any ID is exposed.

## Low Findings

### SEC-005: No visible CSP or baseline security headers in app/hosting config
- Severity: Low
- Rule ID: NEXT-HEADERS-001
- Location:
  - `next.config.mjs:1-17`
  - `netlify.toml:1-6`
- Evidence:
  - No `headers()` configuration is present in Next.js config.
  - No Netlify header rules are defined.
- Impact:
  - The app lacks defense-in-depth protections such as CSP, clickjacking controls, `X-Content-Type-Options`, and a stricter referrer policy in repo-visible config.
- Fix:
  - Add a baseline CSP and standard security headers either in `next.config.mjs` or Netlify headers config.
- Mitigation:
  - If headers are managed elsewhere, document that and verify the live responses.
- False positive notes:
  - This may already be enforced by platform or CDN settings not visible in this repo.

### SEC-006: No visible rate limiting or abuse controls on public unauthenticated flows
- Severity: Low
- Rule ID: NEXT-ABUSE-001
- Location:
  - `app/api/waitlist/route.ts:6-21`
  - `lib/auth.ts:114-120`
- Evidence:
  - The public waitlist endpoint inserts rows without any visible throttling, CAPTCHA, duplicate suppression, or abuse controls.
  - The app’s email sign-in flow uses magic-link email auth, but there is no repo-visible throttling around sign-in attempts.
- Impact:
  - Attackers can spam the waitlist table or abuse sign-in email delivery to harass UVA inboxes and consume service quotas.
- Fix:
  - Add IP/email-based throttling at the edge or route layer.
  - Consider duplicate suppression and basic abuse friction for the waitlist flow.
- Mitigation:
  - Platform-level rate limiting may reduce risk; verify whether Netlify or a proxy is enforcing it.
- False positive notes:
  - This is “not visible in app code” rather than proof that no edge controls exist.

## Open Questions / Assumptions

- `/u/[username]` currently exposes a user’s favorites tab to any visitor. That may be intended product behavior, but if favorites are meant to be private, it is a privacy leak rather than a feature.
- The report assumes Netlify environment flags may enable `TEST_AUTH_BYPASS`; if they are not set, SEC-001 is dormant.

## Recommended Remediation Order

1. Remove or redesign the hosted auth bypass so it cannot impersonate arbitrary accounts.
2. Lock down `images[]` validation to approved storage origins and reject hostile image URLs server-side.
3. Upgrade Next.js to a patched supported release and re-run audit/build verification.
4. Move conversation read updates off GET and enforce conversation membership checks.
5. Add baseline headers and abuse controls.
