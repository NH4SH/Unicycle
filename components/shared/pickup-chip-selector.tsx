"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Check, MapPin, Plus, Search, ShieldCheck, X } from "lucide-react";

import {
  FEATURED_PICKUP_LOCATIONS,
  getCampusPickupLocation,
  getPickupLocationPublicLabel,
  normalizePickupLocationValue,
  searchCampusPickupLocations,
  type CampusPickupLocation
} from "@/lib/campus-pickup-locations";
import {
  buildFeaturedPickupEntries,
  buildRestrictedPickupEntries,
  getSelectablePickupValue,
  getSelectedPickupLocationNames,
  type PickupSearchEntry,
  togglePickupSelection
} from "@/lib/pickup-option-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DynamicCampusPickupMap = dynamic(
  () => import("@/components/shared/campus-pickup-map").then((module) => module.CampusPickupMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-white/40 dark:bg-white/5" />
  }
);

type PickupChipSelectorProps = {
  options?: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  maxSelections?: number;
  label?: string;
  description?: string;
  allowCustom?: boolean;
  restrictToOptions?: boolean;
};

function buildFeaturedLocations(options?: readonly string[]) {
  if (!options?.length) {
    return FEATURED_PICKUP_LOCATIONS;
  }

  return options
    .map((option) => getCampusPickupLocation(option) ?? null)
    .filter((location): location is CampusPickupLocation => Boolean(location));
}

export function PickupChipSelector({
  options,
  value,
  onChange,
  maxSelections = 8,
  label = "Pickup on Grounds",
  description = "Choose public UVA-area meetup spots first, then add handoff notes for timing or landmarks.",
  allowCustom = true,
  restrictToOptions = false
}: PickupChipSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [pendingMapSelection, setPendingMapSelection] = useState<string[]>(value);

  const featuredLocations = useMemo(() => buildFeaturedLocations(options), [options]);
  const availableEntries = useMemo<PickupSearchEntry[]>(() => {
    if (!restrictToOptions || !options?.length) {
      const locations = searchTerm.trim() ? searchCampusPickupLocations(searchTerm).slice(0, 12) : searchCampusPickupLocations(searchTerm).slice(0, 12);
      return buildFeaturedPickupEntries(locations);
    }

    return buildRestrictedPickupEntries(options)
      .filter((entry) => {
        if (!searchTerm.trim()) {
          return true;
        }

        const query = searchTerm.trim().toLowerCase();
        return `${entry.value} ${entry.displayName} ${entry.context}`.toLowerCase().includes(query);
      })
      .slice(0, 12);
  }, [options, restrictToOptions, searchTerm]);

  useEffect(() => {
    if (!mapOpen) {
      return;
    }

    setPendingMapSelection(value);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mapOpen, value]);

  function applyInlineSelection(locationValue: string) {
    onChange(togglePickupSelection(value, locationValue, maxSelections, { normalize: !restrictToOptions }));
  }

  function applyPendingSelection(locationValue: string) {
    setPendingMapSelection((current) =>
      togglePickupSelection(current, locationValue, maxSelections, { normalize: !restrictToOptions })
    );
  }

  function addCustomLocation() {
    const normalized = normalizePickupLocationValue(customValue);
    if (!normalized || value.includes(normalized)) {
      setCustomValue("");
      return;
    }

    onChange(togglePickupSelection(value, normalized, maxSelections, { normalize: false }));
    setCustomValue("");
  }

  function confirmMapSelection() {
    onChange(pendingMapSelection);
    setMapOpen(false);
  }

  const visibleEntries = searchTerm
    ? availableEntries
    : restrictToOptions && options?.length
      ? availableEntries
      : buildFeaturedPickupEntries(featuredLocations);
  const selectedMapLocations = useMemo(() => getSelectedPickupLocationNames(pendingMapSelection, availableEntries), [availableEntries, pendingMapSelection]);

  return (
    <>
      <div className="surface-panel-strong space-y-4 p-4 md:p-5">
        <div className="space-y-2">
          <p className="editorial-eyebrow">{label}</p>
          <p className="max-w-2xl text-sm leading-6 text-foreground/72 dark:text-white/76">{description}</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="surface-field flex min-w-0 flex-1 items-center gap-3 rounded-[1.2rem] px-3.5 py-3">
                <Search className="h-4 w-4 text-foreground/42 dark:text-white/46" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search Newcomb, the Corner, Rice Hall..."
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button type="button" variant="secondary" className="touch-target shrink-0" onClick={() => setMapOpen(true)}>
                <MapPin className="mr-1.5 h-4 w-4" />
                Choose on map
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {visibleEntries.map((entry) => {
                const selected = value.includes(entry.value);
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => applyInlineSelection(entry.value)}
                    className={cn(
                      "touch-chip inline-flex items-center gap-2 rounded-full border text-sm font-semibold transition",
                      selected
                        ? "border-uva-blue/28 bg-uva-blue/[0.08] text-uva-blue dark:border-uva-blue/34 dark:bg-uva-blue/[0.18] dark:text-blue-50"
                        : "border-border bg-background/80 text-foreground/76 hover:border-uva-orange/35 hover:text-uva-orange dark:border-white/14 dark:bg-white/[0.06] dark:text-white/82 dark:hover:border-white/22 dark:hover:bg-white/[0.09] dark:hover:text-white"
                    )}
                    aria-pressed={selected}
                  >
                    {selected ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    {entry.displayName}
                  </button>
                );
              })}
            </div>

            {allowCustom ? (
              <div className="surface-subtle space-y-3 rounded-[1.2rem] p-3.5">
                <div className="flex items-start gap-2 text-sm text-foreground/72 dark:text-white/76">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-uva-orange" />
                  <p>Custom meetup text still works, but HoosFinds nudges sellers toward recognizable public spots first.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={customValue}
                    onChange={(event) => setCustomValue(event.target.value)}
                    placeholder="Add a custom public spot or landmark"
                  />
                  <Button type="button" variant="outline" onClick={addCustomLocation} disabled={!customValue.trim()}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add spot
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="surface-subtle rounded-[1.3rem] p-3.5">
            <p className="editorial-eyebrow">Selected spots</p>
            {value.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {value.map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => applyInlineSelection(location)}
                    className="inline-flex items-center gap-2 rounded-full border border-uva-blue/18 bg-uva-blue/[0.08] px-3.5 py-2 text-sm font-medium text-foreground/92 dark:border-uva-blue/28 dark:bg-uva-blue/[0.16] dark:text-white/94"
                  >
                    <MapPin className="h-4 w-4 text-uva-orange" />
                    <span>{getPickupLocationPublicLabel(location)}</span>
                    <X className="h-3.5 w-3.5 text-foreground/42 dark:text-white/52" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-foreground/64 dark:text-white/68">
                Pick at least one meetup zone so buyers know where the handoff can happen.
              </p>
            )}
          </div>
        </div>
      </div>

      {mapOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/70 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6">
          <div className="surface-overlay-strong max-h-[92vh] w-full overflow-hidden rounded-t-[2rem] md:max-w-6xl md:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-4 md:px-6">
              <div>
                <p className="editorial-eyebrow">Pickup map</p>
                <h3 className="font-display text-2xl font-extrabold tracking-tight">Choose a UVA meetup spot</h3>
              </div>
              <Button type="button" variant="ghost" size="icon" className="touch-icon" onClick={() => setMapOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-0 md:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)]">
              <div className="order-2 max-h-[45vh] overflow-y-auto border-t border-border/70 p-4 md:order-1 md:max-h-[calc(92vh-10rem)] md:border-r md:border-t-0 md:p-5">
                <div className="surface-field flex items-center gap-3 rounded-[1.15rem] px-3.5 py-3">
                  <Search className="h-4 w-4 text-foreground/42 dark:text-white/46" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search Grounds spots"
                    className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {availableEntries.map((entry) => {
                    const selected = pendingMapSelection.includes(entry.value);
                    return (
                      <button
                        key={entry.key}
                        type="button"
                        onClick={() => applyPendingSelection(entry.value)}
                        className={cn(
                          "flex w-full items-start justify-between rounded-[1.2rem] border px-4 py-3 text-left transition",
                          selected
                            ? "border-uva-blue/24 bg-uva-blue/[0.08] dark:border-uva-blue/28 dark:bg-uva-blue/[0.15]"
                            : "border-border bg-background/72 hover:border-uva-orange/24 dark:border-white/14 dark:bg-white/[0.05] dark:hover:border-white/22 dark:hover:bg-white/[0.08]"
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground/92 dark:text-white/92">{entry.displayName}</p>
                          <p className="text-xs text-foreground/62 dark:text-white/68">{entry.context}</p>
                        </div>
                        <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/80 text-foreground/58 dark:border-white/14 dark:bg-white/[0.05] dark:text-white/72">
                          {selected ? <Check className="h-3.5 w-3.5 text-uva-orange" /> : <MapPin className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="order-1 flex min-h-[26rem] flex-col p-4 md:order-2 md:min-h-[calc(92vh-10rem)] md:p-5">
                <div className="surface-subtle flex items-center justify-between rounded-[1.2rem] px-4 py-3 text-sm text-foreground/72 dark:text-white/76">
                  <p>Tap a marker to preview the spot, then confirm it below.</p>
                  <span className="hidden md:inline">Map data: OpenStreetMap + CARTO</span>
                </div>
                <div className="mt-4 min-h-[20rem] flex-1 overflow-hidden rounded-[1.5rem]">
                  <DynamicCampusPickupMap
                    locations={availableEntries.map((entry) => entry.location).filter((entry): entry is CampusPickupLocation => Boolean(entry))}
                    selectedLocations={selectedMapLocations}
                    onSelectLocation={(locationName) => applyPendingSelection(getSelectablePickupValue(locationName, availableEntries))}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <p className="text-sm text-foreground/72 dark:text-white/76">
                {pendingMapSelection.length
                  ? `${pendingMapSelection.length} meetup ${pendingMapSelection.length === 1 ? "spot" : "spots"} selected`
                  : "Choose at least one public meetup spot to add it to the listing."}
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setMapOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={confirmMapSelection} disabled={pendingMapSelection.length === 0}>
                  Confirm pickup spot
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
