"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { ListingCard } from "@/components/cards/listing-card";
import { PriceRangeSlider } from "@/components/market/price-range-slider";
import { EmptyState } from "@/components/shared/empty-state";
import { GridSkeleton } from "@/components/shared/grid-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CATEGORY_OPTIONS,
  CONDITION_OPTIONS,
  LISTING_SORT_OPTIONS,
  MARKET_PRICE_MIN_CENTS,
  MARKET_PRICE_OPEN_MAX_CENTS,
  PICKUP_LOCATIONS
} from "@/lib/constants";
import { type ListingCardData } from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";

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
  initialTotal: number;
  initialFilters: MarketFilters;
};

type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

type MarketCardLayout = {
  className: string;
  layout?: "default" | "featured" | "lead";
  sticker?: string;
};

function buildMarketQueryString(filters: MarketFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.condition !== "all") params.set("condition", filters.condition);
  if (filters.location !== "all") params.set("location", filters.location);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.min !== MARKET_PRICE_MIN_CENTS) params.set("min", String(filters.min));
  if (filters.max < MARKET_PRICE_OPEN_MAX_CENTS) params.set("max", String(filters.max));
  return params.toString();
}

const DEFAULT_MARKET_FILTERS: MarketFilters = {
  q: "",
  category: "all",
  condition: "all",
  location: "all",
  sort: "newest",
  min: MARKET_PRICE_MIN_CENTS,
  max: MARKET_PRICE_OPEN_MAX_CENTS
};

function getListingFeatureScore(listing: ListingCardData) {
  return {
    hasExtraImages: listing.images.length > 1,
    hasFavorites: listing.favoriteCount > 0,
    hasSellerProof: Boolean(listing.sellerRating) || listing.sellerCompletedSales > 1,
    isFashionFirst: listing.category === "STREETWEAR" || listing.category === "MISC"
  };
}

function getFeaturedListingLayouts(items: ListingCardData[]) {
  const layouts = new Map<number, MarketCardLayout>();

  if (!items.length) {
    return layouts;
  }

  layouts.set(0, {
    className: "col-span-2 md:col-span-4 xl:col-span-6",
    layout: "lead"
  });

  const candidateLimit = Math.min(items.length, 10);
  let accentIndex = -1;
  let accentSticker: string | undefined;
  const candidateChecks = [
    {
      sticker: "Style pick",
      matches: (listing: ListingCardData) => {
        const score = getListingFeatureScore(listing);
        return score.isFashionFirst && score.hasExtraImages;
      }
    },
    {
      sticker: "Popular now",
      matches: (listing: ListingCardData) => {
        const score = getListingFeatureScore(listing);
        return score.hasFavorites && score.hasExtraImages;
      }
    },
    {
      sticker: "Trusted seller",
      matches: (listing: ListingCardData) => {
        const score = getListingFeatureScore(listing);
        return score.hasSellerProof && score.hasExtraImages;
      }
    }
  ];

  for (const check of candidateChecks) {
    for (let index = 3; index < candidateLimit; index += 1) {
      if (check.matches(items[index])) {
        accentIndex = index;
        accentSticker = check.sticker;
        break;
      }
    }

    if (accentIndex !== -1) {
      break;
    }
  }

  if (accentIndex !== -1) {
    layouts.set(accentIndex, {
      className: "col-span-1 md:col-span-3 xl:col-span-4",
      layout: "featured",
      sticker: accentSticker
    });
  }

  return layouts;
}

export function MarketClient({ initialItems, initialHasMore, initialTotal, initialFilters }: MarketClientProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MarketFilters>(initialFilters);
  const [committedQueryString, setCommittedQueryString] = useState(() => buildMarketQueryString(initialFilters));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);
  const activeRequestRef = useRef<AbortController | null>(null);
  const loadedPagesRef = useRef(new Set(initialItems.length ? [1] : []));
  const recoveryAttemptedRef = useRef(false);
  const filtersPanelId = "market-filters-panel";

  const queryString = useMemo(() => buildMarketQueryString(filters), [filters]);
  const hasPendingQuerySync = queryString !== committedQueryString;
  const featuredLayouts = useMemo(() => getFeaturedListingLayouts(items), [items]);

  const removeFilter = useCallback((key: keyof MarketFilters | "price") => {
    setFilters((prev) => {
      if (key === "price") {
        return {
          ...prev,
          min: DEFAULT_MARKET_FILTERS.min,
          max: DEFAULT_MARKET_FILTERS.max
        };
      }

      return {
        ...prev,
        [key]: DEFAULT_MARKET_FILTERS[key]
      };
    });
  }, []);

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    if (filters.q.trim()) {
      chips.push({
        key: "q",
        label: `Search: ${filters.q.trim()}`,
        onRemove: () => removeFilter("q")
      });
    }

    if (filters.sort !== DEFAULT_MARKET_FILTERS.sort) {
      const label = LISTING_SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ?? filters.sort;
      chips.push({
        key: "sort",
        label: `Sort: ${label}`,
        onRemove: () => removeFilter("sort")
      });
    }

    if (filters.category !== "all") {
      const label = CATEGORY_OPTIONS.find((option) => option.value === filters.category)?.label ?? filters.category;
      chips.push({
        key: "category",
        label,
        onRemove: () => removeFilter("category")
      });
    }

    if (filters.condition !== "all") {
      const label = CONDITION_OPTIONS.find((option) => option.value === filters.condition)?.label ?? filters.condition;
      chips.push({
        key: "condition",
        label,
        onRemove: () => removeFilter("condition")
      });
    }

    if (filters.location !== "all") {
      chips.push({
        key: "location",
        label: filters.location,
        onRemove: () => removeFilter("location")
      });
    }

    if (filters.min !== DEFAULT_MARKET_FILTERS.min || filters.max !== DEFAULT_MARKET_FILTERS.max) {
      const minLabel = formatCurrency(filters.min / 100);
      const maxLabel =
        filters.max >= MARKET_PRICE_OPEN_MAX_CENTS
          ? `${formatCurrency(MARKET_PRICE_OPEN_MAX_CENTS / 100)}+`
          : formatCurrency(filters.max / 100);

      chips.push({
        key: "price",
        label:
          filters.max >= MARKET_PRICE_OPEN_MAX_CENTS
            ? `From ${minLabel}`
            : filters.min === MARKET_PRICE_MIN_CENTS
              ? `Up to ${maxLabel}`
              : `${minLabel} - ${maxLabel}`,
        onRemove: () => removeFilter("price")
      });
    }

    return chips;
  }, [filters, removeFilter]);

  const hasSearch = Boolean(filters.q.trim());
  const hasSortOverride = filters.sort !== DEFAULT_MARKET_FILTERS.sort;
  const activeControlCount =
    Number(hasSearch) +
    Number(hasSortOverride) +
    Number(filters.category !== DEFAULT_MARKET_FILTERS.category) +
    Number(filters.condition !== DEFAULT_MARKET_FILTERS.condition) +
    Number(filters.location !== DEFAULT_MARKET_FILTERS.location) +
    Number(filters.min !== DEFAULT_MARKET_FILTERS.min || filters.max !== DEFAULT_MARKET_FILTERS.max);
  const hasActiveFilters =
    hasSearch ||
    hasSortOverride ||
    filters.category !== DEFAULT_MARKET_FILTERS.category ||
    filters.condition !== DEFAULT_MARKET_FILTERS.condition ||
    filters.location !== DEFAULT_MARKET_FILTERS.location ||
    filters.min !== DEFAULT_MARKET_FILTERS.min ||
    filters.max !== DEFAULT_MARKET_FILTERS.max;
  const quickFilterCount = activeFilterChips.filter((chip) => chip.key !== "q" && chip.key !== "sort").length;
  const visibleCount = items.length ? Math.min(items.length, total) : 0;
  const resultSummary =
    total === 0
      ? "No listings live right now"
      : visibleCount >= total
        ? `${total} listings live now`
        : `Showing ${visibleCount} of ${total} listings`;
  const statusCopy =
    hasPendingQuerySync
      ? "Updating results…"
      : loading && !booting
        ? "Loading more listings…"
      : hasActiveFilters
        ? `${activeControlCount} filters active`
        : "Search or open filters to narrow the feed.";

  const fetchPage = useCallback(
    async (nextPage: number, reset = false) => {
      if (reset) {
        activeRequestRef.current?.abort();
        loadedPagesRef.current = new Set();
      } else if (activeRequestRef.current || loadedPagesRef.current.has(nextPage)) {
        return;
      }

      const controller = new AbortController();
      activeRequestRef.current = controller;
      setLoading(true);
      try {
        const response = await fetch(`/api/listings?${committedQueryString}&page=${nextPage}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Failed to load listings");
        }

        const data = (await response.json()) as { items: ListingCardData[]; hasMore: boolean; total: number };

        setError(null);
        setTotal(data.total);
        setItems((prev) => {
          if (reset) {
            return data.items;
          }

          const seen = new Set(prev.map((item) => item.id));
          const nextItems = data.items.filter((item) => !seen.has(item.id));
          return [...prev, ...nextItems];
        });
        setHasMore(data.hasMore);
        setPage(nextPage);
        loadedPagesRef.current =
          reset ? new Set(data.items.length ? [nextPage] : []) : new Set([...loadedPagesRef.current, nextPage]);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError("Could not refresh listings. Try again, or loosen a filter.");
        }
      } finally {
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
          setLoading(false);
        }
      }
    },
    [committedQueryString]
  );

  useEffect(() => {
    if (initialItems.length || recoveryAttemptedRef.current) {
      return;
    }

    recoveryAttemptedRef.current = true;
    setBooting(true);
    void fetchPage(1, true).finally(() => {
      setBooting(false);
    });
  }, [initialItems.length, fetchPage]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setBooting(true);
    loadedPagesRef.current = new Set();
    void fetchPage(1, true).finally(() => {
      setBooting(false);
    });
  }, [committedQueryString, fetchPage]);

  useEffect(() => {
    if (queryString === committedQueryString) {
      return;
    }

    const timeout = setTimeout(() => {
      setCommittedQueryString((previous) => (previous === queryString ? previous : queryString));
    }, 260);

    return () => clearTimeout(timeout);
  }, [queryString, committedQueryString]);

  useEffect(() => {
    const nextUrl = committedQueryString ? `/market?${committedQueryString}` : "/market";
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl === nextUrl) {
      return;
    }

    window.history.replaceState(null, "", nextUrl);
  }, [committedQueryString]);

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
        if (!first.isIntersecting || !items.length) return;
        if (hasMore && !loading && !booting && !error) {
          void fetchPage(page + 1);
        }
      },
      { rootMargin: "240px 0px 320px 0px", threshold: 0.01 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading, booting, error, items.length, fetchPage]);

  function clearFilters() {
    setFilters(DEFAULT_MARKET_FILTERS);
    setFiltersOpen(false);
  }

  return (
    <div className="space-y-4 pb-16 md:space-y-5">
      <section className="surface-floating overflow-hidden">
        <div className="space-y-3 px-4 py-3 md:px-5 md:py-4">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(13rem,0.55fr)_auto] lg:items-end">
            <label className="relative col-span-2 block min-w-0 lg:col-span-1">
              <span className="mb-1.5 block text-[0.78rem] font-medium text-muted-foreground">
                Search
              </span>
              <Search className="pointer-events-none absolute left-4 top-[calc(50%+0.65rem)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                className="pl-10"
                placeholder="Search jackets, vintage hoodies, sneakers, and more"
                aria-label="Search listings"
              />
            </label>

            <div className="min-w-0">
              <span className="mb-1.5 block text-[0.78rem] font-medium text-muted-foreground">
                Sort
              </span>
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

            <div className="space-y-1">
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(
                    "h-11 w-full lg:w-auto",
                    (filtersOpen || quickFilterCount > 0) && "border-uva-orange/40 bg-card text-foreground"
                  )}
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  aria-controls={filtersPanelId}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4 text-uva-orange" />
                  {filtersOpen ? "Hide filters" : `Filters${quickFilterCount ? ` (${quickFilterCount})` : ""}`}
                </Button>
              </div>
              <p className="hidden text-[0.72rem] text-muted-foreground sm:block md:text-right">
                Category, condition, pickup spot, and price
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/70 pt-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0" aria-live="polite">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-[1.15rem] font-bold tracking-tight text-foreground md:text-[1.3rem]">{resultSummary}</p>
                <p className="text-sm text-muted-foreground">{statusCopy}</p>
              </div>
            </div>

            {hasActiveFilters ? (
              <Button type="button" size="sm" variant="ghost" onClick={clearFilters} className="self-start md:self-auto">
                <X className="mr-1 h-3.5 w-3.5" />
                Reset all
              </Button>
            ) : null}
          </div>

          <div
            id={filtersPanelId}
            className={cn(
              "space-y-3 border-t border-border/70 pt-3",
              filtersOpen ? "block" : "hidden"
            )}
          >
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(17rem,1fr)]">
              <div className="space-y-2">
                <p className="text-[0.78rem] font-medium text-muted-foreground">Category</p>
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
                <p className="text-[0.78rem] font-medium text-muted-foreground">Condition</p>
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
                <p className="text-[0.78rem] font-medium text-muted-foreground">Pickup spot</p>
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

              <PriceRangeSlider
                min={MARKET_PRICE_MIN_CENTS}
                max={MARKET_PRICE_OPEN_MAX_CENTS}
                step={100}
                value={[filters.min, filters.max]}
                onValueChange={([min, max]) => setFilters((prev) => ({ ...prev, min, max }))}
              />
            </div>
          </div>

          {activeFilterChips.length ? (
            <div className="border-t border-border/70 pt-3">
              <div className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
                <div className="flex w-max snap-x snap-mandatory gap-2 md:w-auto md:flex-wrap">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onRemove}
                      className="surface-chip inline-flex min-h-10 max-w-[12rem] shrink-0 snap-start items-center gap-2 px-3.5 py-2 text-[0.78rem] font-medium text-foreground transition hover:border-uva-orange/35 hover:text-uva-orange sm:max-w-[15rem] md:max-w-none"
                    >
                      <span className="truncate">{chip.label}</span>
                      <X className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="flex flex-col gap-3 rounded-[1.4rem] border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">We couldn&apos;t refresh the marketplace.</p>
            <p className="text-destructive/80">Try again, or reset a filter if the current mix is too narrow.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void fetchPage(1, true)}>
            Reload listings
          </Button>
        </div>
      ) : null}

      {booting ? (
        <GridSkeleton count={8} />
      ) : items.length ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 md:grid-cols-6 md:gap-x-5 md:gap-y-8 xl:grid-cols-12">
            {items.map((listing, index) => {
              const cardLayout = featuredLayouts.get(index) ?? {
                className: "col-span-1 md:col-span-2 xl:col-span-3",
                layout: "default" as const
              };

              return (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  layout={cardLayout.layout}
                  sticker={cardLayout.sticker}
                  className={cardLayout.className}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <EmptyState
            title={hasActiveFilters ? "Nothing matches this filter mix yet" : "No listings live right now"}
            description={
              hasActiveFilters
                ? "Try a wider price range, switch pickup spots, or reset a filter to open the market back up."
                : "Check back soon or post something from your own closet."
            }
            ctaHref={hasActiveFilters ? undefined : "/sell"}
            ctaLabel={hasActiveFilters ? undefined : "Post a listing"}
          />
          {hasActiveFilters ? (
            <div className="flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={clearFilters}>
                Reset filters
              </Button>
              <Button type="button" variant="ghost" onClick={() => removeFilter("price")}>
                Widen the price range
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {loading && !booting ? <GridSkeleton count={4} /> : null}
      <div ref={sentinelRef} className="h-8" />
    </div>
  );
}
