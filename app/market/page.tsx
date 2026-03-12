import { MarketClient } from "@/components/market/market-client";
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

  const initial = await getMarketListings({
    q: searchParams.q,
    category: searchParams.category,
    condition: searchParams.condition,
    location: searchParams.location,
    sort: searchParams.sort,
    min: searchParams.min ? Number(searchParams.min) : 100,
    max: searchParams.max ? Number(searchParams.max) : 250000,
    page: 1,
    userId: session?.user.id
  });

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Fresh drops from students across Grounds.</p>
        </div>
      </div>
      <MarketClient initialItems={initial.items} initialHasMore={initial.hasMore} />
    </div>
  );
}
