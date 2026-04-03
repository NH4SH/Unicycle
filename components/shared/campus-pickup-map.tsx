"use client";

import { useEffect, useMemo } from "react";
import { divIcon, point } from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useTheme } from "next-themes";

import type { CampusPickupLocation } from "@/lib/campus-pickup-locations";
import { DEFAULT_CAMPUS_MAP_CENTER, getPickupLocationContextLabel } from "@/lib/campus-pickup-locations";
import { cn } from "@/lib/utils";

type CampusPickupMapProps = {
  locations: CampusPickupLocation[];
  selectedLocations?: string[];
  onSelectLocation?: (locationName: string) => void;
  className?: string;
  interactive?: boolean;
};

function MapViewportController({
  locations,
  selectedLocations
}: {
  locations: CampusPickupLocation[];
  selectedLocations: string[];
}) {
  const map = useMap();
  const selectedKey = selectedLocations.join("|");

  useEffect(() => {
    const resizeFrame = window.requestAnimationFrame(() => {
      map.invalidateSize();
    });
    const resizeTimeout = window.setTimeout(() => map.invalidateSize(), 180);

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(resizeTimeout);
    };
  }, [map, locations.length, selectedKey]);

  useEffect(() => {
    if (locations.length === 0) {
      map.setView([DEFAULT_CAMPUS_MAP_CENTER.latitude, DEFAULT_CAMPUS_MAP_CENTER.longitude], 14);
      return;
    }

    const selected = selectedLocations
      .map((selectedLocation) => locations.find((location) => location.name === selectedLocation) ?? null)
      .filter((location): location is CampusPickupLocation => Boolean(location));

    if (selected.length === 1) {
      map.flyTo([selected[0].latitude, selected[0].longitude], 15, {
        animate: true,
        duration: 0.45
      });
      return;
    }

    const boundsTarget = selected.length > 1 ? selected : locations;

    if (boundsTarget.length === 1) {
      map.setView([boundsTarget[0].latitude, boundsTarget[0].longitude], 14);
      return;
    }

    map.fitBounds(
      boundsTarget.map((location) => [location.latitude, location.longitude] as [number, number]),
      { padding: [32, 32], maxZoom: 14 }
    );
  }, [locations, map, selectedLocations]);

  return null;
}

function createPickupPinIcon(selected: boolean) {
  return divIcon({
    className: "campus-pickup-pin-icon",
    html: `<span class="campus-pickup-pin${selected ? " is-selected" : ""}"><span class="campus-pickup-pin__core"></span></span>`,
    iconSize: point(30, 42),
    iconAnchor: point(15, 38),
    tooltipAnchor: point(0, -32)
  });
}

export function CampusPickupMap({
  locations,
  selectedLocations = [],
  onSelectLocation,
  className,
  interactive = true
}: CampusPickupMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const tileAttribution = '&copy; OpenStreetMap contributors &copy; CARTO';
  const selectedLookup = useMemo(() => new Set(selectedLocations), [selectedLocations]);

  return (
    <div className={cn("campus-pickup-map h-full w-full overflow-hidden rounded-[1.45rem] border border-border/70", className)}>
      <MapContainer
        center={[DEFAULT_CAMPUS_MAP_CENTER.latitude, DEFAULT_CAMPUS_MAP_CENTER.longitude]}
        zoom={14}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        attributionControl={false}
        className="h-full w-full"
        preferCanvas
      >
        <TileLayer url={tileUrl} attribution={tileAttribution} />
        <MapViewportController locations={locations} selectedLocations={selectedLocations} />
        {locations.map((location) => {
          const selected = selectedLookup.has(location.name);
          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={createPickupPinIcon(selected)}
              eventHandlers={
                onSelectLocation
                  ? {
                      click: () => onSelectLocation(location.name)
                    }
                  : undefined
              }
            >
              <Tooltip direction="top" offset={[0, -2]} opacity={1} className="campus-pickup-tooltip">
                <div className="space-y-0.5">
                  <div className="text-[0.76rem] font-semibold text-slate-900">{location.name}</div>
                  <div className="text-[0.7rem] text-slate-500">{getPickupLocationContextLabel(location.name) ?? location.area}</div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
