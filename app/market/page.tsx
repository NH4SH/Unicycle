import { FollowingFeedSection } from "@/components/social/following-feed-section";
import { getAuthSession } from "@/lib/auth";
import { getFollowingFeedListings } from "@/lib/data";
import { getSuggestedSellers } from "@/lib/user-social";
import { MarketClient, type MarketFilters } from "@/components/market/market-client";
import { headers } from "next/headers";
import type { ListingCardData } from "@/lib/data";

export const dynamic = "force-dynamic";

type MarketPageProps = {
  searchParams: {
    q?: string;
    category?: string;
    condition?: string;
    location?: string;
    sort?: string;
    min?: string;
    max?: string;
  };
};

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const session = await getAuthSession();
  const parsedMin = Number(searchParams.min ?? "100");
  const normalizedMin = Number.isFinite(parsedMin) ? Math.max(100, parsedMin) : 100;
  const parsedMax = Number(searchParams.max ?? "250000");
  const normalizedMax = Number.isFinite(parsedMax) ? Math.max(normalizedMin, parsedMax) : 250000;

  const initialFilters: MarketFilters = {
    q: searchParams.q ?? "",
    category: searchParams.category ?? "all",
    condition: searchParams.condition ?? "all",
    location: searchParams.location ?? "all",
    sort: searchParams.sort ?? "newest",
    min: normalizedMin,
    max: normalizedMax
  };

  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const params = new URLSearchParams({
    sort: initialFilters.sort,
    min: String(initialFilters.min),
    max: String(initialFilters.max),
    page: "1"
  });

  if (initialFilters.q) params.set("q", initialFilters.q);
  if (initialFilters.category !== "all") params.set("category", initialFilters.category);
  if (initialFilters.condition !== "all") params.set("condition", initialFilters.condition);
  if (initialFilters.location !== "all") params.set("location", initialFilters.location);

  const response = await fetch(`${protocol}://${host}/api/listings?${params.toString()}`, {
    cache: "no-store",
    headers: {
      cookie: requestHeaders.get("cookie") ?? ""
    }
  });

  const initial = response.ok
    ? ((await response.json()) as { items: ListingCardData[]; hasMore: boolean })
    : { items: [], hasMore: false };
  const [followingFeed, suggestedSellers] = await Promise.all([
    session?.user.id ? getFollowingFeedListings(session.user.id, 1, 4) : Promise.resolve(null),
    getSuggestedSellers(session?.user.id, 4)
  ]);

  return (
    <div className="container space-y-4 pt-4 pb-8 md:space-y-6 md:pt-5 md:pb-10">
      <div className="grid gap-3 border-b border-border/80 pb-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Browse HoosFinds</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            UVA&apos;s fashion-first resale marketplace.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Start with vintage layers, game day pieces, everyday campus fits, sneakers, and accessories. Dorm, tech,
            tickets, and move-out finds still live here too.
          </p>
        </div>
        <div className="rounded-full border border-border bg-card/75 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
          Local pickup on Grounds
        </div>
      </div>

      <MarketClient
        initialItems={initial.items}
        initialHasMore={initial.hasMore}
        initialFilters={initialFilters}
        featuredSection={
          <FollowingFeedSection
            viewerSignedIn={Boolean(session?.user.id)}
            feed={followingFeed}
            suggested={suggestedSellers}
            maxItems={4}
            title={session?.user.id ? "From people you follow" : "Sellers to watch"}
            subtitle={
              session?.user.id
                ? "Stay on top of new drops from the closets already shaping your taste."
                : "Start with active UVA sellers, then browse the wider marketplace."
            }
            emptyTitle="Build your feed with a few strong closets"
            emptyDescription="Follow the sellers whose style feels right for you and their next drops will show up here."
            showSuggestedHeading={false}
          />
        }
      />
    </div>
  );
}
