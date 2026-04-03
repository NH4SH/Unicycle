import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck, Sparkles } from "lucide-react";

import { ListingCard } from "@/components/cards/listing-card";
import { FollowingFeedSection } from "@/components/social/following-feed-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth";
import { HOW_IT_WORKS_STEPS, TRUST_MARKERS } from "@/lib/constants";
import { getFollowingFeedListings, getLandingDrops } from "@/lib/data";
import { isFashionBrowseListing } from "@/lib/market-browse";
import { prisma } from "@/lib/prisma";
import { getSuggestedSellers } from "@/lib/user-social";
import { cn, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80";

const HERO_CARD_PILL_CLASS =
  "border-white/14 bg-black/56 font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.26)] backdrop-blur-md dark:border-white/16 dark:bg-black/60 dark:text-white";

export default async function HomePage() {
  const session = await getAuthSession();
  const [landing, waitlistCount, interviewsCount, partnersCount, followingFeed, suggestedSellers] = await Promise.all([
    getLandingDrops(session?.user.id),
    prisma.waitlistEntry.count(),
    prisma.conversation.count(),
    prisma.user.count({
      where: {
        sellerKind: "VERIFIED_SHOP",
        verifiedShopApprovedAt: {
          not: null
        }
      }
    }),
    session?.user.id ? getFollowingFeedListings(session.user.id, 1, 4) : Promise.resolve(null),
    getSuggestedSellers(session?.user.id, 6)
  ]);
  const { todaysDrops, hotOnGrounds } = landing;

  const heroLead = todaysDrops[0] ?? hotOnGrounds[0] ?? null;
  const heroSide = [...todaysDrops.slice(1, 3), ...hotOnGrounds.slice(0, 2)].slice(0, 2);
  const freshFinds = todaysDrops.filter((listing) => isFashionBrowseListing(listing)).slice(0, 8);
  const trendingBrandFinds = hotOnGrounds.filter((listing) => isFashionBrowseListing(listing) && Boolean(listing.brand)).slice(0, 8);
  const hotFinds = (trendingBrandFinds.length ? trendingBrandFinds : hotOnGrounds.filter((listing) => isFashionBrowseListing(listing))).slice(0, 8);
  const underThirtyFinds = [...todaysDrops, ...hotOnGrounds]
    .filter((listing, index, array) => array.findIndex((entry) => entry.id === listing.id) === index)
    .filter((listing) => isFashionBrowseListing(listing) && listing.priceCents <= 3000)
    .slice(0, 8);

  return (
    <div className="container space-y-12 py-5 md:space-y-16 md:py-8">
      <section className="space-y-10 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(20rem,35rem)] xl:items-start xl:gap-x-8 xl:gap-y-8 xl:space-y-0">
        <div className="space-y-5 sm:space-y-6 xl:max-w-[40rem]">
          <div className="space-y-2.5 sm:space-y-3.5">
            <p className="editorial-eyebrow">UVA-only resale for fellow Hoos</p>
            <h1 className="max-w-4xl font-display text-[3.4rem] font-extrabold tracking-[-0.04em] leading-[0.94] sm:text-5xl md:text-7xl md:leading-[0.92]">
              The best fits on <span className="font-editorial italic font-semibold text-uva-orange">Grounds</span>.
            </h1>
            <p className="max-w-2xl text-[0.98rem] leading-7 text-foreground/72 dark:text-white/76 md:text-lg">
              HoosFinds is UVA&apos;s fashion-first resale marketplace for vintage layers, outerwear, sneakers, accessories,
              and the campus finds worth grabbing before someone else does.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-0.5">
            <Button asChild size="lg">
              <Link href="/market">Browse Finds</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/sell">Sell a Find</Link>
            </Button>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {TRUST_MARKERS.map((item) => (
              <span key={item} className="surface-pill shrink-0 px-4 py-2 text-sm">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-[1.08fr_0.92fr] xl:row-span-2 xl:row-start-1 xl:max-w-[35rem] xl:justify-self-end xl:self-start">
          {heroLead ? (
            <Link href={`/listing/${heroLead.id}`} className="group relative block overflow-hidden rounded-[2.2rem] border border-border/80 bg-card shadow-card">
              <div className="relative aspect-[4/5] overflow-hidden xl:aspect-[4/4.7]">
                <Image
                  src={heroLead.images[0] || FALLBACK_IMAGE}
                  alt={heroLead.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.035]"
                  sizes="(max-width: 640px) 100vw, 42vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/24 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                  <div className="space-y-3">
                    <Badge variant="outline" className={cn("inline-flex", HERO_CARD_PILL_CLASS)}>
                      Fresh listing
                    </Badge>
                    <div className="rounded-[1.35rem] bg-black/45 px-4 py-3 text-white backdrop-blur-sm">
                      <p className="max-w-xs font-display text-[2rem] font-extrabold leading-[0.95] tracking-tight [text-wrap:balance]">
                        {heroLead.title}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full bg-card/88 px-4 py-2 text-sm font-semibold text-foreground shadow-soft">
                    {formatCurrency(heroLead.priceCents / 100)}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="soft-panel flex aspect-[4/5] flex-col justify-between p-8">
              <div>
                <p className="editorial-eyebrow">HoosFinds mood</p>
                <h2 className="mt-4 max-w-sm font-display text-4xl font-extrabold tracking-tight">
                  Good finds. Better fits. Right here at UVA.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Once listings are live, this spotlight becomes the first thing fellow Hoos see when they open the app.
              </p>
            </div>
          )}

          <div className="hidden gap-4 sm:grid">
            {heroSide.length ? (
              heroSide.map((listing, index) => (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.id}`}
                  className="group relative block overflow-hidden rounded-[1.9rem] border border-border/80 bg-card shadow-soft"
                >
                  <div className="relative aspect-[4/4.5] overflow-hidden xl:aspect-[4/4.05]">
                    <Image
                      src={listing.images[0] || FALLBACK_IMAGE}
                      alt={listing.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.035]"
                      sizes="(max-width: 640px) 100vw, 24vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/16 to-transparent" />
                    <div className="absolute left-4 top-4">
                      <Badge variant="outline" className={HERO_CARD_PILL_CLASS}>
                        {index === 0 ? "Just posted" : "Campus favorite"}
                      </Badge>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="rounded-[1.15rem] border border-white/10 bg-black/68 px-3 py-3 text-white shadow-[0_14px_36px_rgba(0,0,0,0.34)]">
                        <p className="font-display text-xl font-extrabold leading-tight tracking-tight text-white [text-wrap:balance]">
                          {listing.title}
                        </p>
                        <p className="mt-2 text-sm font-medium text-white/88">{formatCurrency(listing.priceCents / 100)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="soft-panel flex h-full flex-col justify-between p-6">
                <div>
                  <p className="editorial-eyebrow">Built for style</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    HoosFinds puts clothing first, but still leaves room for the dorm, tech, textbook, and ticket finds
                    students actually need.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground/88 dark:text-white/92">
                  <Sparkles className="h-4 w-4 text-uva-orange" />
                  Editorial, local, and easy to trust
                </div>
              </div>
            )}

            <div className="soft-panel flex items-center justify-between gap-4 p-5">
              <div>
                <p className="editorial-eyebrow">UVA-only access</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Every listing, save, and message stays inside the UVA student community.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-uva-orange/10 text-uva-orange">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="xl:min-w-0 xl:max-w-[42rem] xl:pt-1">
          <FollowingFeedSection
            viewerSignedIn={Boolean(session?.user.id)}
            feed={followingFeed}
            suggested={suggestedSellers}
            title={session?.user.id ? "New drops from sellers you follow" : "Popular on Grounds"}
            subtitle={
              session?.user.id
                ? "Follow closets you trust and HoosFinds turns that into a cleaner feed of future listings."
                : "The fastest way to understand HoosFinds is to start with the closets already putting up sharp campus finds."
            }
            emptyTitle="Follow a few closets and your feed starts here"
            emptyDescription="When you follow sellers whose style you like, their newest listings land in one place instead of getting lost in the full marketplace."
          />
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-eyebrow">Fresh on Grounds</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">New finds from across Grounds.</h2>
          </div>
          <Link
            href="/market"
            className="inline-flex items-center gap-1 text-sm font-semibold text-foreground/88 transition hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange"
          >
            Browse everything <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {freshFinds.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {freshFinds.map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} sticker={index === 0 ? "New Find" : undefined} />
            ))}
          </div>
        ) : (
          <div className="surface-panel-dashed p-8 text-center">
            <p className="font-display text-2xl font-bold">No finds live yet</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              HoosFinds is ready for the first wave of campus listings. Once students start posting, this section becomes
              the live front page for student style on Grounds.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-eyebrow">Trending Brands</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">The labels fellow Hoos are saving fastest.</h2>
          </div>
          <div className="surface-pill inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.18em]">
            <MapPin className="h-3.5 w-3.5 text-uva-orange" />
            Last 72 hours
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {hotFinds.map((listing, index) => (
            <ListingCard key={listing.id} listing={listing} sticker={index < 2 ? "Trending brand" : undefined} />
          ))}
        </div>
      </section>

      {underThirtyFinds.length ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="editorial-eyebrow">Under $30</p>
              <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Good style still shows up on a student budget.</h2>
            </div>
            <Link
              href="/market?max=3000"
              className="inline-flex items-center gap-1 text-sm font-semibold text-foreground/88 transition hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange"
            >
              Shop the edit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {underThirtyFinds.map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} sticker={index === 0 ? "Budget pick" : undefined} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-8 border-t border-border/80 pt-8 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-4">
          <p className="editorial-eyebrow">How it works</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Curated campus resale without the friction.
          </h2>
          <p className="max-w-lg text-sm leading-7 text-muted-foreground">
            HoosFinds keeps the flow simple: better photos, tighter search, local pickup, and a feed that feels more like
            campus style than classifieds.
          </p>
        </div>

        <div className="surface-panel-strong overflow-hidden">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <div
              key={step.number}
              className={cn(
                "grid gap-3 px-5 py-5 sm:grid-cols-[70px_minmax(0,1fr)] sm:px-6 sm:py-6 lg:grid-cols-[70px_minmax(0,1fr)_170px] lg:gap-6",
                index !== HOW_IT_WORKS_STEPS.length - 1 && "border-b border-border/80"
              )}
            >
              <p className="font-editorial text-4xl italic leading-none text-uva-orange">{step.number}</p>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold">{step.title}</h3>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">{step.description}</p>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:pt-2">
                {step.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-[2.4rem] border border-border/80 bg-card/80 p-6 shadow-card md:grid-cols-[1.15fr_0.85fr_0.85fr] md:p-7">
        <div className="md:pr-6">
          <p className="editorial-eyebrow">Building with students</p>
          <h3 className="mt-3 font-display text-3xl font-extrabold tracking-tight">A real campus product, not a placeholder brand.</h3>
        </div>
        <div className="surface-subtle rounded-[1.5rem] p-5">
          <p className="editorial-eyebrow">Waitlist</p>
          <p className="mt-3 font-display text-4xl font-extrabold">{waitlistCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">Students raising their hand for better local resale.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
          <div className="surface-subtle rounded-[1.5rem] p-5">
            <p className="editorial-eyebrow">Conversations</p>
            <p className="mt-3 font-display text-3xl font-extrabold">{interviewsCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Campus demand signals flowing through the marketplace.</p>
          </div>
          <div className="surface-subtle rounded-[1.5rem] p-5">
            <p className="editorial-eyebrow">Verified shops</p>
            <p className="mt-3 font-display text-3xl font-extrabold">{partnersCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Reviewed local thrift and vintage partners inside the marketplace.</p>
          </div>
        </div>
      </section>

      <footer className="grid gap-5 border-t border-border/80 pb-4 pt-7 md:grid-cols-3">
        <div className="space-y-2">
          <p className="font-display text-2xl font-extrabold tracking-tight">HoosFinds</p>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            UVA&apos;s fashion-first resale marketplace for student style, local pickup, and the kinds of finds worth sharing with fellow Hoos.
          </p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <Link href="/safety" className="block font-medium text-foreground hover:text-uva-blue">
            Safety & meetup guidance
          </Link>
          <p>UVA-only access keeps the marketplace local, trusted, and grounded in student life.</p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Questions or launch interest</p>
          <p>hello@hoosfinds.com</p>
          <p>Built for style finds, move-out gems, and better campus resale on Grounds.</p>
        </div>
      </footer>
    </div>
  );
}
