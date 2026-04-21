import { getAuthSession } from "@/lib/auth";
import { getMarketCuratedSections, getMarketListings } from "@/lib/data";
import { BrowseModeTabs } from "@/components/market/browse-mode-tabs";
import { MarketClient, type MarketFilters } from "@/components/market/market-client";
import { MARKET_PRICE_MIN_CENTS, MARKET_PRICE_OPEN_MAX_CENTS } from "@/lib/constants";
import { normalizeMarketAudience, normalizeMarketBrowseLane } from "@/lib/market-browse";

export const dynamic = "force-dynamic";

type MarketPageProps = {
  searchParams: {
    q?: string;
    audience?: string;
    lane?: string;
    category?: string;
    condition?: string;
    location?: string;
    brand?: string;
    size?: string;
    color?: string;
    sort?: string;
    min?: string;
    max?: string;
  };
};

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const session = await getAuthSession();
  const hasMinParam = typeof searchParams.min === "string";
  const hasMaxParam = typeof searchParams.max === "string";
  const parsedMin = Number(searchParams.min ?? String(MARKET_PRICE_MIN_CENTS));
  const normalizedMin = Number.isFinite(parsedMin) ? Math.max(MARKET_PRICE_MIN_CENTS, parsedMin) : MARKET_PRICE_MIN_CENTS;
  const parsedMax = Number(searchParams.max ?? String(MARKET_PRICE_OPEN_MAX_CENTS));
  const normalizedMax = Number.isFinite(parsedMax)
    ? Math.max(normalizedMin, Math.min(MARKET_PRICE_OPEN_MAX_CENTS, parsedMax))
    : MARKET_PRICE_OPEN_MAX_CENTS;
  const requestedLane = normalizeMarketBrowseLane(searchParams.lane ?? "all") ?? "all";
  const normalizedAudience =
    normalizeMarketAudience(searchParams.audience) ?? (requestedLane === "womens" || requestedLane === "mens" ? requestedLane : undefined);
  const normalizedLane = requestedLane === "womens" || requestedLane === "mens" ? "all" : requestedLane;

  const initialFilters: MarketFilters = {
    q: searchParams.q ?? "",
    audience: normalizedAudience ?? "all",
    lane: normalizedLane,
    category: searchParams.category ?? "all",
    condition: searchParams.condition ?? "all",
    location: searchParams.location ?? "all",
    brand: searchParams.brand ?? "all",
    size: searchParams.size ?? "all",
    color: searchParams.color ?? "all",
    sort: searchParams.sort ?? "newest",
    min: normalizedMin,
    max: normalizedMax
  };

  const [initial, curatedSections] = await Promise.all([
    getMarketListings({
      q: initialFilters.q,
      audience: initialFilters.audience,
      lane: initialFilters.lane,
      category: initialFilters.category,
      condition: initialFilters.condition,
      location: initialFilters.location,
      brand: initialFilters.brand,
      size: initialFilters.size,
      color: initialFilters.color,
      sort: initialFilters.sort,
      min: hasMinParam ? normalizedMin : undefined,
      max: hasMaxParam ? normalizedMax : undefined,
      page: 1,
      userId: session?.user.id
    }),
    getMarketCuratedSections(session?.user.id)
  ]);

  return (
    <div className="container space-y-3 pt-2 pb-8 md:space-y-4 md:pt-3 md:pb-10">
      <div className="grid gap-1.5 border-b border-border/80 pb-3">
        <div className="space-y-1">
          <p className="editorial-eyebrow">Browse HoosFinds</p>
          <h1 className="font-display text-[2rem] font-extrabold tracking-tight sm:text-[2.35rem] md:text-[2.8rem]">
            Browse the best finds on Grounds.
          </h1>
          <p className="text-sm text-foreground/72 dark:text-white/74 md:text-[0.98rem]">
            Start with Women&apos;s or Men&apos;s, then narrow by style, price, brand, or pickup spot. Everything outside clothing stays tucked under More.
          </p>
        </div>
        <BrowseModeTabs active="feed" />
      </div>

      <MarketClient
        initialItems={initial.items}
        initialHasMore={initial.hasMore}
        initialTotal={initial.total}
        initialFilters={initialFilters}
        curatedSections={curatedSections}
      />
    </div>
  );
}
