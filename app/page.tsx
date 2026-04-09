import Link from "next/link";
import { ArrowRight, MapPin, Search, ShieldCheck, Store } from "lucide-react";

import { ListingCard } from "@/components/cards/listing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthSession } from "@/lib/auth";
import { HOME_PRIMARY_LANES } from "@/lib/constants";
import { getMarketCuratedSections, getMarketListings, type MarketCuratedSection } from "@/lib/data";


export const dynamic = "force-dynamic";

const TRUST_MARKERS = [
  { icon: ShieldCheck, label: "UVA-only buyers" },
  { icon: Store, label: "Trusted local sellers" },
  { icon: MapPin, label: "Pickup near Grounds" }
] as const;

const SEARCH_SHORTCUTS = [
  { label: "Ralph Lauren", href: "/market?q=Ralph+Lauren" },
  { label: "Vintage jacket", href: "/market?q=vintage+jacket" },
  { label: "Women's denim", href: "/market?q=women%27s+denim" },
  { label: "Sneakers", href: "/market?q=sneakers" },
  { label: "Hoodie", href: "/market?q=hoodie" }
] as const;

type HomeShelfProps = {
  section: MarketCuratedSection;
  sticker: string;
  eyebrow: string;
};

function HomeSectionHeader({
  eyebrow,
  title,
  description,
  href,
  ctaLabel
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5">
        <p className="editorial-eyebrow">{eyebrow}</p>
        <h2 className="font-display text-[1.7rem] font-extrabold tracking-tight md:text-[2.2rem]">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-foreground/74 dark:text-white/78">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-semibold text-foreground/88 transition hover:gap-2 hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange"
      >
        {ctaLabel} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function HomeShelf({ section, sticker, eyebrow }: HomeShelfProps) {
  if (!section.items.length) {
    return null;
  }

  const [featured, ...rest] = section.items;

  return (
    <section className="space-y-4">
      <HomeSectionHeader
        eyebrow={eyebrow}
        title={section.title}
        description={section.description}
        href={section.href}
        ctaLabel="Browse more"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ListingCard listing={featured} layout="featured" sticker={sticker} />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {rest.slice(0, 6).map((listing, index) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              sticker={index === 0 && section.id === "brands" ? "Trending" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const session = await getAuthSession();
  const [curatedSections, marketListings] = await Promise.all([
    getMarketCuratedSections(session?.user.id),
    getMarketListings({
      page: 1,
      limit: 32,
      sort: "newest",
      userId: session?.user.id
    })
  ]);

  const freshShelf = curatedSections.primary.find((section) => section.id === "fresh") ?? null;
  const trendingShelf = curatedSections.primary.find((section) => section.id === "brands") ?? null;
  const liveInventory = marketListings.items;

  return (
    <div className="container space-y-8 py-4 md:space-y-10 md:py-6">
      <section className="rounded-[2rem] border border-border/80 bg-card/72 p-5 shadow-card backdrop-blur-sm md:p-6">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="orange">HoosFinds</Badge>
              <Badge variant="outline">UVA fashion resale</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="max-w-3xl font-display text-[2.4rem] font-extrabold tracking-[-0.04em] leading-[0.95] sm:text-[3.2rem] md:text-[4rem]">
                Your next favorite fit is already on Grounds.
              </h1>
              <p className="max-w-2xl text-[0.98rem] leading-6 text-foreground/78 dark:text-white/80">
                Shop clothes, shoes, and accessories from UVA students and trusted local sellers. Search fast, check out securely,
                and pick up near the places you already know.
              </p>
            </div>
          </div>

          <form action="/market" method="get" className="space-y-3">
            <div className="surface-panel-strong flex items-center gap-2 rounded-[1.4rem] p-2">
              <Search className="ml-2 h-5 w-5 shrink-0 text-foreground/58 dark:text-white/62" />
              <Input
                name="q"
                type="search"
                placeholder="Search brands, pieces, styles, or categories"
                className="h-12 border-0 bg-transparent px-1 text-base shadow-none ring-0 focus-visible:ring-0"
              />
              <Button type="submit" size="lg" className="h-12 rounded-[1.05rem] px-5">
                Search
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SEARCH_SHORTCUTS.map((shortcut) => (
                <Link
                  key={shortcut.label}
                  href={shortcut.href}
                  className="surface-pill px-3.5 py-2 text-sm font-medium text-foreground/82 transition hover:text-uva-orange dark:text-white/82"
                >
                  {shortcut.label}
                </Link>
              ))}
            </div>
          </form>

          <div className="space-y-3">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {HOME_PRIMARY_LANES.map((lane) => (
                <Link
                  key={lane.label}
                  href={lane.href}
                  className="surface-pill inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-uva-orange/35 hover:text-uva-orange dark:text-white"
                >
                  {lane.label}
                </Link>
              ))}
              <Link
                href="/market"
                className="surface-pill inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground/82 transition hover:border-uva-orange/35 hover:text-uva-orange dark:text-white/84"
              >
                More
              </Link>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {TRUST_MARKERS.map((marker) => (
                <span
                  key={marker.label}
                  className="surface-subtle inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-foreground/78 dark:text-white/80"
                >
                  <marker.icon className="h-4 w-4 text-uva-orange" />
                  {marker.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {freshShelf ? <HomeShelf section={freshShelf} eyebrow="Start here" sticker="Fresh" /> : null}

      {trendingShelf ? <HomeShelf section={trendingShelf} eyebrow="Trending brands" sticker="Trending" /> : null}

      <section className="space-y-4">
        <HomeSectionHeader
          eyebrow="Everything live"
          title="Browse the full inventory."
          description="Every active listing on HoosFinds, in one clean grid. Start with the latest drops and keep scrolling."
          href="/market"
          ctaLabel="Open full browse"
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {liveInventory.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <footer className="grid gap-4 border-t border-border/80 pb-4 pt-6 md:grid-cols-3">
        <div className="space-y-2">
          <p className="font-display text-2xl font-extrabold tracking-tight">HoosFinds</p>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            UVA&apos;s clothing-first resale marketplace for local pickup, better campus finds, and the closets worth browsing between classes.
          </p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <Link href="/safety" className="block font-medium text-foreground hover:text-uva-blue">
            Safety & meetup guidance
          </Link>
          <p>UVA-only buyers keep the marketplace local, trusted, and grounded in student life.</p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Questions or launch interest</p>
          <p>hoosfinders@gmail.com</p>
          <p>Built for better resale on Grounds.</p>
        </div>
      </footer>
    </div>
  );
}
