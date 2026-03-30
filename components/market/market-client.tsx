"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { ListingCard } from "@/components/cards/listing-card";
import { EmptyState } from "@/components/shared/empty-state";
import { GridSkeleton } from "@/components/shared/grid-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  CATEGORY_OPTIONS,
  CONDITION_OPTIONS,
  LISTING_SORT_OPTIONS,
  MARKET_STYLE_FILTERS,
  PICKUP_LOCATIONS,
  STICKER_TAGS
} from "@/lib/constants";
import { type ListingCardData } from "@/lib/data";
import { cn } from "@/lib/utils";

export type MarketFilters = {
  q: string;
  category: string;
  condition: string;
  location: string;
  sort: string;
  min: number;
  max: number;
};

type MarketClientProps = {
  initialItems: ListingCardData[];
  initialHasMore: boolean;
  initialFilters: MarketFilters;
};

export function MarketClient({ initialItems, initialHasMore, initialFilters }: MarketClientProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MarketFilters>(initialFilters);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);
  const activeRequestRef = useRef<AbortController | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.condition !== "all") params.set("condition", filters.condition);
    if (filters.location !== "all") params.set("location", filters.location);
    if (filters.sort) params.set("sort", filters.sort);
    params.set("min", String(filters.min));
    params.set("max", String(filters.max));
    return params.toString();
  }, [filters]);

  const fetchPage = useCallback(
    async (nextPage: number, reset = false) => {
      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;
      setLoading(true);
      try {
        const response = await fetch(`/api/listings?${queryString}&page=${nextPage}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Failed to load listings");
        }

        const data = (await response.json()) as { items: ListingCardData[]; hasMore: boolean };

        setError(null);
        setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setError("Could not refresh listings. Give it another shot.");
        }
      } finally {
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
          setLoading(false);
        }
      }
    },
    [queryString]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(async () => {
      setBooting(true);
      await fetchPage(1, true);
      setBooting(false);
    }, 220);

    return () => clearTimeout(timeout);
  }, [queryString, fetchPage]);

  useEffect(() => {
    const nextUrl = queryString ? `/market?${queryString}` : "/market";
    window.history.replaceState(null, "", nextUrl);
  }, [queryString]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !booting) {
          void fetchPage(page + 1);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading, booting, fetchPage]);

  function clearFilters() {
    setFilters({
      q: "",
      category: "all",
      condition: "all",
      location: "all",
      sort: "newest",
      min: 100,
      max: 250000
    });
  }

  return (
    <div className="space-y-7 pb-16">
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {MARKET_STYLE_FILTERS.map((filter) => {
            const active = filters.q === filter.q && filters.category === filter.category;
            return (
              <button
                key={filter.label}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    q: filter.q,
                    category: filter.category,
                    condition: "all",
                    location: "all"
                  }))
                }
                className={cn(
                  "touch-chip rounded-full border text-sm font-medium transition",
                  active
                    ? "border-uva-blue/25 bg-uva-blue/8 text-uva-blue"
                    : "surface-chip hover:border-uva-orange/35 hover:text-uva-orange"
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="surface-floating sticky top-16 z-30 space-y-4 p-4 md:top-[4.25rem] md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              className="pl-10"
              placeholder="Search vintage hoodies, jackets, sneakers, game day fits..."
              aria-label="Search listings"
            />
          </label>

          <div className="surface-subtle flex items-center justify-between px-4 py-3 text-sm">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4 text-uva-orange" />
              Refine by style lane, price, and pickup spot.
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" />
              Clear filters
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Category</p>
            <Select value={filters.category} onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}>
              <SelectTrigger aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Condition</p>
            <Select value={filters.condition} onValueChange={(value) => setFilters((prev) => ({ ...prev, condition: value }))}>
              <SelectTrigger aria-label="Filter by condition">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All conditions</SelectItem>
                {CONDITION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pickup</p>
            <Select value={filters.location} onValueChange={(value) => setFilters((prev) => ({ ...prev, location: value }))}>
              <SelectTrigger aria-label="Filter by pickup location">
                <SelectValue placeholder="Pickup spot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All spots</SelectItem>
                {PICKUP_LOCATIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sort</p>
            <Select value={filters.sort} onValueChange={(value) => setFilters((prev) => ({ ...prev, sort: value }))}>
              <SelectTrigger aria-label="Sort listings">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {LISTING_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="surface-subtle p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Price ${Math.round(filters.min / 100)} - ${Math.round(filters.max / 100)}
            </p>
            <Slider
              className="mt-4"
              min={100}
              max={250000}
              step={100}
              value={[filters.min, filters.max]}
              onValueChange={([min, max]) => setFilters((prev) => ({ ...prev, min, max }))}
              aria-label="Price range"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {STICKER_TAGS.map((tag) => (
          <span key={tag} className="surface-chip px-3 py-1.5 text-xs uppercase tracking-[0.18em]">
            {tag}
          </span>
        ))}
      </div>

      {error ? (
        <div className="flex flex-col gap-3 rounded-[1.4rem] border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <p>{error.replace("Give it another shot.", "Try again or clear a filter.")}</p>
          <Button type="button" variant="outline" onClick={() => void fetchPage(1, true)}>
            Reload listings
          </Button>
        </div>
      ) : null}

      {booting ? (
        <GridSkeleton count={8} />
      ) : items.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((listing, idx) => (
            <ListingCard key={listing.id} listing={listing} sticker={idx % 7 === 0 ? STICKER_TAGS[idx % STICKER_TAGS.length] : undefined} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No finds match this lane yet"
          description="Try a wider price range, another pickup spot, or clear the filters to see more on-Grounds finds."
          ctaHref="/sell"
          ctaLabel="Post a find"
        />
      )}

      {loading && !booting ? <GridSkeleton count={4} /> : null}
      <div ref={sentinelRef} className="h-8" />
    </div>
  );
}
