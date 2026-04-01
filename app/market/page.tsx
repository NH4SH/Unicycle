import { getAuthSession } from "@/lib/auth";
import { getMarketListings } from "@/lib/data";
import { MarketClient, type MarketFilters } from "@/components/market/market-client";
import { MARKET_PRICE_MIN_CENTS, MARKET_PRICE_OPEN_MAX_CENTS } from "@/lib/constants";

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
  const hasMinParam = typeof searchParams.min === "string";
  const hasMaxParam = typeof searchParams.max === "string";
  const parsedMin = Number(searchParams.min ?? String(MARKET_PRICE_MIN_CENTS));
  const normalizedMin = Number.isFinite(parsedMin) ? Math.max(MARKET_PRICE_MIN_CENTS, parsedMin) : MARKET_PRICE_MIN_CENTS;
  const parsedMax = Number(searchParams.max ?? String(MARKET_PRICE_OPEN_MAX_CENTS));
  const normalizedMax = Number.isFinite(parsedMax)
    ? Math.max(normalizedMin, Math.min(MARKET_PRICE_OPEN_MAX_CENTS, parsedMax))
    : MARKET_PRICE_OPEN_MAX_CENTS;

  const initialFilters: MarketFilters = {
    q: searchParams.q ?? "",
    category: searchParams.category ?? "all",
    condition: searchParams.condition ?? "all",
    location: searchParams.location ?? "all",
    sort: searchParams.sort ?? "newest",
    min: normalizedMin,
    max: normalizedMax
  };

  const initial = await getMarketListings({
    q: initialFilters.q,
    category: initialFilters.category,
    condition: initialFilters.condition,
    location: initialFilters.location,
    sort: initialFilters.sort,
    min: hasMinParam ? normalizedMin : undefined,
    max: hasMaxParam ? normalizedMax : undefined,
    page: 1,
    userId: session?.user.id
  });

  return (
    <div className="container space-y-3.5 pt-2.5 pb-8 md:space-y-5 md:pt-4 md:pb-10">
      <div className="grid gap-1.5 border-b border-border/80 pb-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-2">
        <div className="space-y-1">
          <p className="editorial-eyebrow">Browse HoosFinds</p>
          <h1 className="font-display text-[2rem] font-extrabold tracking-tight sm:text-[2.35rem] md:text-[2.8rem]">
            Fresh finds on Grounds.
          </h1>
          <p className="text-sm text-muted-foreground md:text-[0.98rem]">
            Search fast, sort fast, and lock in local pickup.
          </p>
        </div>
        <div className="hidden text-sm text-muted-foreground sm:block md:text-right">
          Streetwear, vintage, outerwear, and game day fits.
        </div>
      </div>

      <MarketClient initialItems={initial.items} initialHasMore={initial.hasMore} initialTotal={initial.total} initialFilters={initialFilters} />
    </div>
  );
}
