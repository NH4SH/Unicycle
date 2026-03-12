"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { ListingCard } from "@/components/cards/listing-card";
import { EmptyState } from "@/components/shared/empty-state";
import { GridSkeleton } from "@/components/shared/grid-skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  CATEGORY_OPTIONS,
  CONDITION_OPTIONS,
  LISTING_SORT_OPTIONS,
  PICKUP_LOCATIONS,
  STICKER_TAGS
} from "@/lib/constants";
import { type ListingCardData } from "@/lib/data";

type MarketClientProps = {
  initialItems: ListingCardData[];
  initialHasMore: boolean;
};

type Filters = {
  q: string;
  category: string;
  condition: string;
  location: string;
  sort: string;
  min: number;
  max: number;
};

const defaultFilters: Filters = {
  q: "",
  category: "all",
  condition: "all",
  location: "all",
  sort: "newest",
  min: 100,
  max: 250000
};

export function MarketClient({ initialItems, initialHasMore }: MarketClientProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
      setLoading(true);
      const response = await fetch(`/api/listings?${queryString}&page=${nextPage}`);
      const data = await response.json();

      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
      setPage(nextPage);
      setLoading(false);
    },
    [queryString]
  );

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setBooting(true);
      await fetchPage(1, true);
      setBooting(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [queryString, fetchPage]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
          void fetchPage(page + 1);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading, queryString, fetchPage]);

  return (
    <div className="space-y-6 pb-16">
      <section className="sticky top-16 z-30 -mx-4 border-b border-border/70 bg-background/95 px-4 py-4 backdrop-blur-xl md:top-[4.05rem] md:mx-0 md:rounded-3xl md:border md:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            className="pl-10"
            placeholder="Search drops by title, brand, class..."
            aria-label="Search listings"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
          <Select
            value={filters.category}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
          >
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

          <Select
            value={filters.condition}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, condition: value }))}
          >
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

          <Select
            value={filters.location}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, location: value }))}
          >
            <SelectTrigger aria-label="Filter by pickup location">
              <SelectValue placeholder="Pickup" />
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

          <div className="col-span-2 rounded-2xl border border-border bg-white p-3 md:col-span-1">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Price ({Math.round(filters.min / 100)}-{Math.round(filters.max / 100)})</p>
            <Slider
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
          <Badge key={tag} variant={tag.includes("Hot") ? "orange" : "blue"}>
            {tag}
          </Badge>
        ))}
      </div>

      {booting ? (
        <GridSkeleton count={10} />
      ) : items.length ? (
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
          {items.map((listing, idx) => (
            <div key={listing.id} className="mb-3 break-inside-avoid">
              <ListingCard listing={listing} sticker={idx % 7 === 0 ? STICKER_TAGS[idx % STICKER_TAGS.length] : undefined} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No drops match yet"
          description="Try widening your filters or searching with fewer words to catch more listings."
          ctaHref="/sell"
          ctaLabel="List something fresh"
        />
      )}

      {loading && !booting ? <GridSkeleton count={4} /> : null}
      <div ref={sentinelRef} className="h-8" />
    </div>
  );
}
