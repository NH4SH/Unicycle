"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Compass, MapPin, Sparkles } from "lucide-react";

import { ListingCard } from "@/components/cards/listing-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import type { MapBrowseCommunityData, MapBrowseData } from "@/lib/data";
import { cn } from "@/lib/utils";

const DynamicMapBrowseMap = dynamic(
  () => import("@/components/market/map-browse-map").then((module) => module.MapBrowseMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-[1.6rem] bg-white/45 dark:bg-white/5" />
  }
);

type MapBrowseClientProps = {
  data: MapBrowseData;
};

type CommunityFilter = MapBrowseCommunityData | { id: "all"; name: string; shortLabel: string; description: string; totalCount: number; fashionCount: number; locationCount: number };

export function MapBrowseClient({ data }: MapBrowseClientProps) {
  const [isCompactMobile, setIsCompactMobile] = useState(false);

  const communityFilters = useMemo<CommunityFilter[]>(() => {
    return [
      {
        id: "all",
        name: "All pickup areas",
        shortLabel: "All areas",
        description: "See the full spread of HoosFinds pickups across Grounds and nearby student living zones.",
        totalCount: data.summary.totalCount,
        fashionCount: data.summary.fashionCount,
        locationCount: data.summary.locationCount
      },
      ...data.communities
    ];
  }, [data.communities, data.summary.fashionCount, data.summary.locationCount, data.summary.totalCount]);

  const [selectedCommunityId, setSelectedCommunityId] = useState<CommunityFilter["id"]>(communityFilters[1]?.id ?? "all");
  const filteredLocations = useMemo(() => {
    return selectedCommunityId === "all"
      ? data.locations
      : data.locations.filter((location) => location.communityId === selectedCommunityId);
  }, [data.locations, selectedCommunityId]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(filteredLocations[0]?.id ?? null);

  useEffect(() => {
    if (!filteredLocations.length) {
      setSelectedLocationId(null);
      return;
    }

    if (!selectedLocationId || !filteredLocations.some((location) => location.id === selectedLocationId)) {
      setSelectedLocationId(filteredLocations[0]?.id ?? null);
    }
  }, [filteredLocations, selectedLocationId]);

  const selectedCommunity = communityFilters.find((community) => community.id === selectedCommunityId) ?? communityFilters[0];
  const selectedLocation = filteredLocations.find((location) => location.id === selectedLocationId) ?? filteredLocations[0] ?? null;
  const styleListings = selectedLocation?.fashionListings ?? [];
  const secondaryListings = selectedLocation?.secondaryListings ?? [];

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsCompactMobile(media.matches);

    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  if (!data.locations.length) {
    return (
      <EmptyState
        title="No mapped pickups yet"
        description="Once live listings use known Grounds pickup spots, they’ll appear here so shoppers can browse by neighborhood."
        ctaHref="/sell"
        ctaLabel="List something"
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)]">
      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <section className="surface-panel-strong space-y-4 p-4 md:p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="blue">Pickup communities</Badge>
              <Badge variant="outline">{selectedCommunity.totalCount} live listings</Badge>
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-[2rem]">
                Shop by where the handoff happens.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-foreground/72 dark:text-white/74">
                Start with the communities students actually move through, then zoom into one pickup spot at a time.
              </p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
            {communityFilters.map((community) => {
              const active = community.id === selectedCommunityId;

              return (
                <button
                  key={community.id}
                  type="button"
                  onClick={() => setSelectedCommunityId(community.id)}
                  className={cn(
                    "touch-chip inline-flex shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                    active
                      ? "border-uva-orange/28 bg-uva-orange/[0.14] text-foreground dark:border-uva-orange/36 dark:bg-uva-orange/[0.2] dark:text-white"
                      : "surface-chip hover:border-uva-blue/24 hover:text-foreground dark:hover:border-white/24 dark:hover:text-white"
                  )}
                >
                  <span>{community.shortLabel}</span>
                  <span className="rounded-full bg-black/6 px-2 py-0.5 text-[0.7rem] text-foreground/62 dark:bg-white/[0.08] dark:text-white/68">
                    {community.fashionCount}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="surface-subtle space-y-3 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="editorial-eyebrow">Selected community</p>
                <p className="font-medium text-foreground dark:text-white">{selectedCommunity.name}</p>
                <p className="max-w-xl text-sm leading-6 text-foreground/68 dark:text-white/72">
                  {selectedCommunity.description}
                </p>
              </div>
              <div className="surface-inset rounded-[1.1rem] px-3 py-2 text-left sm:text-right">
                <p className="text-sm font-semibold text-foreground dark:text-white">{filteredLocations.length} pickup {filteredLocations.length === 1 ? "spot" : "spots"}</p>
                <p className="text-xs text-foreground/58 dark:text-white/62">{selectedCommunity.totalCount} listings mapped here</p>
              </div>
            </div>

            <div className="relative h-[300px] overflow-hidden rounded-[1.6rem] sm:h-[430px]">
              <DynamicMapBrowseMap
                locations={filteredLocations}
                selectedLocationId={selectedLocation?.id ?? null}
                onSelectLocation={setSelectedLocationId}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-white">
              <Compass className="h-4 w-4 text-uva-orange" />
              Pick a spot
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
              {filteredLocations.map((location) => {
                const active = location.id === selectedLocation?.id;
                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => setSelectedLocationId(location.id)}
                    className={cn(
                      "touch-chip inline-flex min-w-[11rem] shrink-0 snap-start flex-col items-start rounded-[1.15rem] border px-4 py-3 text-left transition",
                      active
                        ? "border-uva-blue/28 bg-uva-blue/[0.12] text-foreground shadow-soft dark:border-uva-blue/36 dark:bg-uva-blue/[0.18] dark:text-white"
                        : "surface-subtle hover:border-uva-blue/18 hover:text-foreground dark:hover:border-white/16 dark:hover:text-white"
                    )}
                  >
                    <span className="text-sm font-semibold">{location.name}</span>
                    <span className="text-xs text-foreground/62 dark:text-white/66">{location.fashionCount} style {location.fashionCount === 1 ? "pick" : "picks"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-4">
        {selectedLocation ? (
          <section className="surface-panel-strong space-y-4 p-4 md:p-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="orange">Selected pickup area</Badge>
                <Badge variant="outline">{selectedLocation.totalCount} listings</Badge>
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-[1.9rem] font-extrabold tracking-tight md:text-[2.3rem]">
                  Explore {selectedLocation.shortLabel}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-foreground/72 dark:text-white/74">
                  {selectedLocation.communityName} pickup zone. Fashion listings lead here first, with everything else tucked underneath.
                </p>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
              <div className="surface-inset min-w-[12rem] rounded-[1.2rem] px-4 py-3 sm:min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-foreground/54 dark:text-white/56">Community</p>
                <p className="mt-2 text-sm font-semibold text-foreground dark:text-white">{selectedLocation.communityName}</p>
              </div>
              <div className="surface-inset min-w-[12rem] rounded-[1.2rem] px-4 py-3 sm:min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-foreground/54 dark:text-white/56">Style nearby</p>
                <p className="mt-2 text-sm font-semibold text-foreground dark:text-white">{selectedLocation.fashionCount} fashion-forward listings</p>
              </div>
              <div className="surface-inset min-w-[12rem] rounded-[1.2rem] px-4 py-3 sm:min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-foreground/54 dark:text-white/56">Pickup spot</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground dark:text-white">
                  <MapPin className="h-3.5 w-3.5 text-uva-orange" />
                  {selectedLocation.name}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="editorial-eyebrow">Style first</p>
              <h3 className="font-display text-2xl font-extrabold tracking-tight">Fresh around this pickup zone</h3>
            </div>
            {selectedLocation ? (
              <p className="inline-flex items-center gap-1.5 text-sm text-foreground/66 dark:text-white/68">
                <Sparkles className="h-4 w-4 text-uva-orange" />
                {selectedLocation.fashionCount} fashion picks near {selectedLocation.name}
              </p>
            ) : null}
          </div>

          {styleListings.length ? (
            <div className="grid gap-4">
              {styleListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} layout={isCompactMobile ? "default" : "featured"} />
              ))}
            </div>
          ) : (
            <div className="surface-panel-dashed p-6 text-sm leading-6 text-foreground/68 dark:text-white/70">
              No clothing-heavy listings are pinned to this spot yet. Try another pickup area nearby or switch back to all communities.
            </div>
          )}
        </section>

        {secondaryListings.length ? (
          <section className="space-y-4">
            <div className="space-y-1">
              <p className="editorial-eyebrow">Also nearby</p>
              <h3 className="font-display text-xl font-extrabold tracking-tight">More from this pickup zone</h3>
              <p className="text-sm leading-6 text-foreground/66 dark:text-white/68">
                Secondary marketplace categories stay here, but the map still keeps fashion front and center.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {secondaryListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
