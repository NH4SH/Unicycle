"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

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
import type { ListingCardData, MarketCuratedSections } from "@/lib/data";
import {
  PRIMARY_MARKET_BROWSE_PILLS,
  SECONDARY_MARKET_BROWSE_PILLS,
  getMarketBrowsePillLabel,
  type MarketBrowseLaneId
} from "@/lib/market-browse";
import { cn, formatCurrency } from "@/lib/utils";

export type MarketFilters = {
  q: string;
  lane: string;
  category: string;
  condition: string;
  location: string;
  brand: string;
  size: string;
  color: string;
  sort: string;
  min: number;
  max: number;
};

type MarketClientProps = {
  initialItems: ListingCardData[];
  initialHasMore: boolean;
  initialTotal: number;
  initialFilters: MarketFilters;
  curatedSections: MarketCuratedSections;
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

const DEFAULT_MARKET_FILTERS: MarketFilters = {
  q: "",
  lane: "all",
  category: "all",
  condition: "all",
  location: "all",
  brand: "all",
  size: "all",
  color: "all",
  sort: "newest",
  min: MARKET_PRICE_MIN_CENTS,
  max: MARKET_PRICE_OPEN_MAX_CENTS
};

function buildMarketQueryString(filters: MarketFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.lane !== "all") params.set("lane", filters.lane);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.condition !== "all") params.set("condition", filters.condition);
  if (filters.location !== "all") params.set("location", filters.location);
  if (filters.brand !== "all") params.set("brand", filters.brand);
  if (filters.size !== "all") params.set("size", filters.size);
  if (filters.color !== "all") params.set("color", filters.color);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.min !== MARKET_PRICE_MIN_CENTS) params.set("min", String(filters.min));
  if (filters.max < MARKET_PRICE_OPEN_MAX_CENTS) params.set("max", String(filters.max));
  return params.toString();
}

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

function compareSizes(a: string, b: string) {
  const priority = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "One Size", "OS"];
  const aIndex = priority.indexOf(a);
  const bIndex = priority.indexOf(b);

  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }

  return a.localeCompare(b, undefined, { numeric: true });
}

function buildFacetOptions(values: string[], selectedValue: string, sorter?: (a: string, b: string) => number) {
  const uniqueValues = new Set(values.filter(Boolean));

  if (selectedValue !== "all") {
    uniqueValues.add(selectedValue);
  }

  const nextValues = [...uniqueValues];
  nextValues.sort(sorter ?? ((a, b) => a.localeCompare(b)));
  return nextValues;
}

export function MarketClient({
  initialItems,
  initialHasMore,
  initialTotal,
  initialFilters,
  curatedSections
}: MarketClientProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MarketFilters>(initialFilters);
  const [committedQueryString, setCommittedQueryString] = useState(() => buildMarketQueryString(initialFilters));
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(() => SECONDARY_MARKET_BROWSE_PILLS.some((pill) => pill.id === initialFilters.lane));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);
  const activeRequestRef = useRef<AbortController | null>(null);
  const loadedPagesRef = useRef(new Set(initialItems.length ? [1] : []));
  const recoveryAttemptedRef = useRef(false);
  const advancedPanelId = "market-advanced-filters";
  const morePanelId = "market-more-categories";

  const queryString = useMemo(() => buildMarketQueryString(filters), [filters]);
  const hasPendingQuerySync = queryString !== committedQueryString;
  const featuredLayouts = useMemo(() => getFeaturedListingLayouts(items), [items]);

  const allFacetListings = useMemo(() => {
    const byId = new Map<string, ListingCardData>();

    for (const listing of items) {
      byId.set(listing.id, listing);
    }

    for (const section of [...curatedSections.primary, ...curatedSections.secondary]) {
      for (const listing of section.items) {
        if (!byId.has(listing.id)) {
          byId.set(listing.id, listing);
        }
      }
    }

    return [...byId.values()];
  }, [curatedSections.primary, curatedSections.secondary, items]);

  const brandOptions = useMemo(
    () => buildFacetOptions(allFacetListings.map((listing) => listing.brand).filter(Boolean), filters.brand),
    [allFacetListings, filters.brand]
  );
  const sizeOptions = useMemo(
    () => buildFacetOptions(allFacetListings.map((listing) => listing.size).filter(Boolean), filters.size, compareSizes),
    [allFacetListings, filters.size]
  );
  const colorOptions = useMemo(
    () => buildFacetOptions(allFacetListings.map((listing) => listing.color).filter(Boolean), filters.color),
    [allFacetListings, filters.color]
  );

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

    if (filters.lane !== DEFAULT_MARKET_FILTERS.lane) {
      chips.push({
        key: "lane",
        label: getMarketBrowsePillLabel(filters.lane as MarketBrowseLaneId),
        onRemove: () => removeFilter("lane")
      });
    }

    if (filters.brand !== DEFAULT_MARKET_FILTERS.brand) {
      chips.push({
        key: "brand",
        label: `Brand: ${filters.brand}`,
        onRemove: () => removeFilter("brand")
      });
    }

    if (filters.size !== DEFAULT_MARKET_FILTERS.size) {
      chips.push({
        key: "size",
        label: `Size: ${filters.size}`,
        onRemove: () => removeFilter("size")
      });
    }

    if (filters.color !== DEFAULT_MARKET_FILTERS.color) {
      chips.push({
        key: "color",
        label: `Color: ${filters.color}`,
        onRemove: () => removeFilter("color")
      });
    }

    if (filters.category !== DEFAULT_MARKET_FILTERS.category) {
      const label = CATEGORY_OPTIONS.find((option) => option.value === filters.category)?.label ?? filters.category;
      chips.push({
        key: "category",
        label,
        onRemove: () => removeFilter("category")
      });
    }

    if (filters.condition !== DEFAULT_MARKET_FILTERS.condition) {
      const label = CONDITION_OPTIONS.find((option) => option.value === filters.condition)?.label ?? filters.condition;
      chips.push({
        key: "condition",
        label: `Condition: ${label}`,
        onRemove: () => removeFilter("condition")
      });
    }

    if (filters.location !== DEFAULT_MARKET_FILTERS.location) {
      chips.push({
        key: "location",
        label: filters.location,
        onRemove: () => removeFilter("location")
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

  const exploreFiltersActive =
    Boolean(filters.q.trim()) ||
    filters.lane !== DEFAULT_MARKET_FILTERS.lane ||
    filters.category !== DEFAULT_MARKET_FILTERS.category ||
    filters.condition !== DEFAULT_MARKET_FILTERS.condition ||
    filters.location !== DEFAULT_MARKET_FILTERS.location ||
    filters.brand !== DEFAULT_MARKET_FILTERS.brand ||
    filters.size !== DEFAULT_MARKET_FILTERS.size ||
    filters.color !== DEFAULT_MARKET_FILTERS.color ||
    filters.min !== DEFAULT_MARKET_FILTERS.min ||
    filters.max !== DEFAULT_MARKET_FILTERS.max;
  const hasActiveFilters = exploreFiltersActive || filters.sort !== DEFAULT_MARKET_FILTERS.sort;
  const activeControlCount = activeFilterChips.length;
  const advancedFilterCount =
    Number(filters.location !== DEFAULT_MARKET_FILTERS.location);
  const visibleCount = items.length ? Math.min(items.length, total) : 0;
  const resultSummary =
    total === 0
      ? "No listings live right now"
      : visibleCount >= total
        ? `${total} listings live now`
        : `Showing ${visibleCount} of ${total} listings`;
  const statusCopy =
    hasPendingQuerySync
      ? "Updating results..."
      : loading && !booting
        ? "Loading more listings..."
        : hasActiveFilters
          ? `${activeControlCount} filters active`
          : "";
  const showCuratedSections = !exploreFiltersActive;

  useEffect(() => {
    if (SECONDARY_MARKET_BROWSE_PILLS.some((pill) => pill.id === filters.lane)) {
      setMoreOpen(true);
    }
  }, [filters.lane]);

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
  }, [fetchPage, initialItems.length]);

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
  }, [booting, error, fetchPage, hasMore, items.length, loading, page]);

  function clearFilters() {
    setFilters(DEFAULT_MARKET_FILTERS);
    setAdvancedFiltersOpen(false);
  }

  function toggleLane(nextLane: string) {
    setFilters((prev) => ({
      ...prev,
      lane: prev.lane === nextLane ? "all" : nextLane
    }));
  }

  return (
    <div className="space-y-6 pb-16 md:space-y-8">
      <section className="surface-floating overflow-hidden">
        <div className="space-y-3.5 px-4 py-4 md:px-5 md:py-5">
          <div className="space-y-2.5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <p className="editorial-eyebrow">Shop clothing first</p>
                <h2 className="font-display text-[1.55rem] font-extrabold tracking-tight md:text-[1.95rem]">
                  Browse the strongest finds first.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-foreground/70 dark:text-white/74">
                  Women&apos;s, men&apos;s, vintage, streetwear, shoes, and accessories stay up front. Dorm, tech, textbooks, tickets, and extras live under More.
                </p>
              </div>
              <div className="hidden rounded-full border border-border/70 bg-card/75 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground shadow-soft md:block">
                {resultSummary}
              </div>
            </div>

            <div className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
              <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
                {PRIMARY_MARKET_BROWSE_PILLS.map((pill) => {
                  const active = filters.lane === pill.id;

                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => toggleLane(pill.id)}
                      className={cn(
                        "touch-chip rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                        active
                          ? "border-uva-orange/45 bg-uva-orange/[0.10] text-foreground shadow-soft"
                          : "surface-chip text-foreground/82 hover:border-uva-orange/35 hover:text-uva-orange"
                      )}
                    >
                      {pill.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  aria-expanded={moreOpen}
                  aria-controls={morePanelId}
                  className={cn(
                    "touch-chip inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                    moreOpen || SECONDARY_MARKET_BROWSE_PILLS.some((pill) => pill.id === filters.lane)
                      ? "border-uva-blue/30 bg-uva-blue/[0.08] text-foreground shadow-soft"
                      : "surface-chip text-foreground/82 hover:border-uva-blue/28 hover:text-uva-blue"
                  )}
                >
                  More
                  <ChevronDown className={cn("h-4 w-4 transition", moreOpen && "rotate-180")} />
                </button>
              </div>
            </div>

            <div
              id={morePanelId}
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
                moreOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="surface-inset mt-1 rounded-[1.55rem] p-3.5 md:p-4">
                  <p className="mb-3 editorial-eyebrow">More categories</p>
                  <div className="flex flex-wrap gap-2">
                    {SECONDARY_MARKET_BROWSE_PILLS.map((pill) => {
                      const active = filters.lane === pill.id;

                      return (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => toggleLane(pill.id)}
                          className={cn(
                            "touch-chip rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                            active
                              ? "border-uva-orange/40 bg-card text-foreground shadow-soft"
                              : "surface-chip text-foreground/82 hover:border-uva-orange/35 hover:text-uva-orange"
                          )}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end lg:grid-cols-[minmax(0,1.45fr)_minmax(13rem,0.55fr)_auto]">
            <label className="relative block min-w-0">
              <span className="mb-1.5 block text-[0.78rem] font-medium text-muted-foreground">Search</span>
              <Search className="pointer-events-none absolute left-4 top-[calc(50%+0.65rem)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                className="pl-10"
                placeholder="Search jackets, vintage hoodies, sneakers, and more"
                aria-label="Search listings"
              />
            </label>

            <div className="hidden min-w-0 lg:block">
              <span className="mb-1.5 block text-[0.78rem] font-medium text-muted-foreground">Sort</span>
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

            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                className={cn(
                  "h-11 w-full justify-center md:w-auto",
                  (advancedFiltersOpen || advancedFilterCount > 0) && "border-uva-orange/40 bg-card text-foreground"
                )}
                onClick={() => setAdvancedFiltersOpen((open) => !open)}
                aria-expanded={advancedFiltersOpen}
                aria-controls={advancedPanelId}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4 text-uva-orange" />
                {advancedFiltersOpen ? "Hide filters" : `Filters${advancedFilterCount ? ` (${advancedFilterCount})` : ""}`}
              </Button>
            </div>
          </div>

          <div className="hidden gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <p className="text-[0.78rem] font-medium text-muted-foreground">Size</p>
              <Select value={filters.size} onValueChange={(value) => setFilters((prev) => ({ ...prev, size: value }))}>
                <SelectTrigger aria-label="Filter by size">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sizes</SelectItem>
                  {sizeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-[0.78rem] font-medium text-muted-foreground">Brand</p>
              <Select value={filters.brand} onValueChange={(value) => setFilters((prev) => ({ ...prev, brand: value }))}>
                <SelectTrigger aria-label="Filter by brand">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brandOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
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
              <p className="text-[0.78rem] font-medium text-muted-foreground">Color</p>
              <Select value={filters.color} onValueChange={(value) => setFilters((prev) => ({ ...prev, color: value }))}>
                <SelectTrigger aria-label="Filter by color">
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All colors</SelectItem>
                  {colorOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <PriceRangeSlider
            min={MARKET_PRICE_MIN_CENTS}
            max={MARKET_PRICE_OPEN_MAX_CENTS}
            step={100}
            value={[filters.min, filters.max]}
            onValueChange={([min, max]) => setFilters((prev) => ({ ...prev, min, max }))}
          />

          <div
            id={advancedPanelId}
            className={cn(
              "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
              advancedFiltersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="space-y-3 border-t border-border/70 pt-4">
                <div className="grid gap-2.5 sm:grid-cols-2 md:hidden">
                  <div className="space-y-2">
                    <p className="text-[0.78rem] font-medium text-muted-foreground">Sort</p>
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
                    <p className="text-[0.78rem] font-medium text-muted-foreground">Size</p>
                    <Select value={filters.size} onValueChange={(value) => setFilters((prev) => ({ ...prev, size: value }))}>
                      <SelectTrigger aria-label="Filter by size">
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sizes</SelectItem>
                        {sizeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[0.78rem] font-medium text-muted-foreground">Brand</p>
                    <Select value={filters.brand} onValueChange={(value) => setFilters((prev) => ({ ...prev, brand: value }))}>
                      <SelectTrigger aria-label="Filter by brand">
                        <SelectValue placeholder="Brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All brands</SelectItem>
                        {brandOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-[0.78rem] font-medium text-muted-foreground">Color</p>
                    <Select value={filters.color} onValueChange={(value) => setFilters((prev) => ({ ...prev, color: value }))}>
                      <SelectTrigger aria-label="Filter by color">
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All colors</SelectItem>
                        {colorOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
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
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/70 pt-3 md:flex-row md:items-center md:justify-between">
            <div aria-live="polite" className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-[1.15rem] font-bold tracking-tight text-foreground md:text-[1.3rem]">{resultSummary}</p>
                {statusCopy ? <p className="text-sm text-muted-foreground">{statusCopy}</p> : null}
              </div>
            </div>

            {hasActiveFilters ? (
              <Button type="button" size="sm" variant="ghost" onClick={clearFilters} className="self-start md:self-auto">
                <X className="mr-1 h-3.5 w-3.5" />
                Reset all
              </Button>
            ) : null}
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
                      className="surface-chip inline-flex min-h-10 max-w-[14rem] shrink-0 snap-start items-center gap-2 px-3.5 py-2 text-[0.78rem] font-medium text-foreground transition hover:border-uva-orange/35 hover:text-uva-orange md:max-w-none"
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

      {showCuratedSections && (curatedSections.primary.length || curatedSections.secondary.length) ? (
        <div className="space-y-8">
          {curatedSections.primary.map((section, index) => (
            <section key={section.id} className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1.5">
                  <p className="editorial-eyebrow">{index === 0 ? "Shopping edit" : "Style section"}</p>
                  <h2 className="font-display text-[1.75rem] font-extrabold tracking-tight md:text-[2.2rem]">{section.title}</h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{section.description}</p>
                </div>
                <Link
                  href={section.href}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-foreground/88 transition hover:text-uva-orange"
                >
                  Shop section <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {section.items.map((listing, index2) => (
                  <ListingCard
                    key={`${section.id}-${listing.id}`}
                    listing={listing}
                    sticker={
                      index2 === 0
                        ? section.id === "fresh"
                          ? "New drop"
                          : section.id === "brands"
                            ? "Trending brand"
                            : "Budget pick"
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ))}

          {curatedSections.secondary.length ? (
            <section className="space-y-5 border-t border-border/80 pt-8">
              <div className="space-y-1.5">
                <p className="editorial-eyebrow">More on HoosFinds</p>
                <h2 className="font-display text-[1.65rem] font-extrabold tracking-tight md:text-[2rem]">
                  Beyond the closet, still easy to shop.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Dorm, tech, furniture, tickets, and the rest still belong in HoosFinds. They just show up lower and quieter than the main style sections.
                </p>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                {curatedSections.secondary.map((section) => (
                  <div key={section.id} className="surface-panel overflow-hidden p-4 md:p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1.5">
                        <p className="editorial-eyebrow">{section.title}</p>
                        <p className="max-w-lg text-sm leading-6 text-muted-foreground">{section.description}</p>
                      </div>
                      <Link
                        href={section.href}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-foreground/88 transition hover:text-uva-orange"
                      >
                        See all <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {section.items.map((listing, index2) => (
                        <ListingCard
                          key={`${section.id}-${listing.id}`}
                          listing={listing}
                          sticker={index2 === 0 ? "Campus find" : undefined}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

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
          {showCuratedSections ? (
            <div className="flex flex-col gap-2 border-t border-border/80 pt-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="editorial-eyebrow">All live finds</p>
                <h2 className="font-display text-[1.7rem] font-extrabold tracking-tight md:text-[2rem]">
                  Keep browsing the full marketplace.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                The edit above keeps the first impression sharp. Everything live still lands below in one feed.
              </p>
            </div>
          ) : null}

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
                ? "Try a wider price range, switch sections, or reset a filter to open the market back up."
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
