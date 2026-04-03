"use client";

import dynamic from "next/dynamic";
import { ExternalLink, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getKnownCampusPickupLocations, getPickupLocationArea, getPickupLocationMapHref, getPickupLocationShortLabel } from "@/lib/campus-pickup-locations";
import { cn } from "@/lib/utils";

const DynamicCampusPickupMap = dynamic(
  () => import("@/components/shared/campus-pickup-map").then((module) => module.CampusPickupMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-white/40 dark:bg-white/5" />
  }
);

type PickupMapPreviewProps = {
  locations: string[];
  className?: string;
  compact?: boolean;
  title?: string;
  detail?: string;
};

export function PickupMapPreview({
  locations,
  className,
  compact = false,
  title = "Pickup map",
  detail = "Public meetup spots show up here so buyers know exactly where the handoff starts."
}: PickupMapPreviewProps) {
  const knownLocations = getKnownCampusPickupLocations(locations);
  const primaryLocation = locations[0] ?? null;
  const mapsHref = primaryLocation ? getPickupLocationMapHref(primaryLocation) : null;

  if (!primaryLocation) {
    return null;
  }

  return (
    <div className={cn("surface-panel-strong overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="space-y-1">
          <p className="editorial-eyebrow">{title}</p>
          <p className="text-sm font-medium text-foreground/92 dark:text-white/92">Pickup {getPickupLocationShortLabel(primaryLocation)}</p>
          {getPickupLocationArea(primaryLocation) ? (
            <p className="text-xs text-foreground/62 dark:text-white/68">{getPickupLocationArea(primaryLocation)}</p>
          ) : null}
        </div>
        {mapsHref ? (
          <Button asChild size="sm" variant="secondary" className="shrink-0">
            <a href={mapsHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open maps
            </a>
          </Button>
        ) : null}
      </div>

      {knownLocations.length > 0 ? (
        <div className={cn(compact ? "h-48" : "h-64", "relative")}> 
          <DynamicCampusPickupMap locations={knownLocations} selectedLocation={knownLocations[0]?.name ?? null} interactive={false} />
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
            {locations.slice(0, 3).map((location) => (
              <span
                key={location}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/92 px-3 py-1.5 text-[0.72rem] font-medium text-slate-800 shadow-soft dark:border-white/12 dark:bg-slate-950/86 dark:text-white/92"
              >
                <MapPin className="h-3.5 w-3.5 text-uva-orange" />
                {location}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 text-sm leading-6 text-foreground/72 dark:text-white/76">{detail}</div>
      )}

      {locations.length > 1 ? (
        <div className="border-t border-border/70 px-4 py-3 text-xs text-foreground/62 dark:text-white/68">
          +{locations.length - 1} more meetup {locations.length === 2 ? "option" : "options"} on the listing.
        </div>
      ) : null}
    </div>
  );
}
