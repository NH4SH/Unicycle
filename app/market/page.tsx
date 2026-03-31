import { MarketClient, type MarketFilters } from "@/components/market/market-client";
import { getAuthSession } from "@/lib/auth";
import { getMarketListings } from "@/lib/data";

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

  const initial = await getMarketListings({
    q: initialFilters.q,
    category: initialFilters.category,
    condition: initialFilters.condition,
    location: initialFilters.location,
    sort: initialFilters.sort,
    min: initialFilters.min,
    max: initialFilters.max,
    page: 1,
    userId: session?.user.id
  });

  return (
    <div className="container space-y-6 py-8 md:space-y-8 md:py-10">
      <div className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
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

      <MarketClient initialItems={initial.items} initialHasMore={initial.hasMore} initialFilters={initialFilters} />
    </div>
  );
}
