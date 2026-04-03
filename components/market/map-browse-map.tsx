"use client";

import { useEffect } from "react";
import { divIcon, point } from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useTheme } from "next-themes";

import { DEFAULT_CAMPUS_MAP_CENTER } from "@/lib/campus-pickup-locations";
import type { MapBrowseLocationData } from "@/lib/data";
import { cn } from "@/lib/utils";

type MapBrowseMapProps = {
  locations: MapBrowseLocationData[];
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string) => void;
  className?: string;
};

function MapViewportController({
  locations,
  selectedLocationId
}: {
  locations: MapBrowseLocationData[];
  selectedLocationId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const resizeFrame = window.requestAnimationFrame(() => map.invalidateSize());
    const resizeTimeout = window.setTimeout(() => map.invalidateSize(), 180);

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(resizeTimeout);
    };
  }, [locations.length, map, selectedLocationId]);

  useEffect(() => {
    if (!locations.length) {
      map.setView([DEFAULT_CAMPUS_MAP_CENTER.latitude, DEFAULT_CAMPUS_MAP_CENTER.longitude], 14);
      return;
    }

    const selected = selectedLocationId ? locations.find((location) => location.id === selectedLocationId) ?? null : null;
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], 14.6, {
        animate: true,
        duration: 0.45
      });
      return;
    }

    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 14.2);
      return;
    }

    map.fitBounds(
      locations.map((location) => [location.latitude, location.longitude] as [number, number]),
      { padding: [34, 34], maxZoom: 13.7 }
    );
  }, [locations, map, selectedLocationId]);

  return null;
}

function createBrowsePinIcon(count: number, selected: boolean) {
  return divIcon({
    className: "campus-browse-pin-icon",
    html: `<span class="campus-browse-pin${selected ? " is-selected" : ""}"><span class="campus-browse-pin__count">${count}</span></span>`,
    iconSize: point(40, 46),
    iconAnchor: point(20, 42),
    tooltipAnchor: point(0, -34)
  });
}

export function MapBrowseMap({ locations, selectedLocationId, onSelectLocation, className }: MapBrowseMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const tileAttribution = '&copy; OpenStreetMap contributors &copy; CARTO';

  return (
    <div className={cn("campus-pickup-map campus-browse-map h-full w-full overflow-hidden rounded-[1.6rem] border border-border/70", className)}>
      <MapContainer
        center={[DEFAULT_CAMPUS_MAP_CENTER.latitude, DEFAULT_CAMPUS_MAP_CENTER.longitude]}
        zoom={13.5}
        scrollWheelZoom
        dragging
        doubleClickZoom
        touchZoom
        zoomControl
        attributionControl={false}
        className="h-full w-full"
        preferCanvas
      >
        <TileLayer url={tileUrl} attribution={tileAttribution} />
        <MapViewportController locations={locations} selectedLocationId={selectedLocationId} />
        {locations.map((location) => {
          const selected = selectedLocationId === location.id;

          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={createBrowsePinIcon(location.totalCount, selected)}
              eventHandlers={{
                click: () => onSelectLocation(location.id)
              }}
            >
              <Tooltip direction="top" offset={[0, -2]} opacity={1} className="campus-pickup-tooltip">
                <div className="space-y-0.5">
                  <div className="text-[0.78rem] font-semibold text-slate-900">{location.name}</div>
                  <div className="text-[0.7rem] text-slate-500">
                    {location.communityName} · {location.fashionCount} style {location.fashionCount === 1 ? "pick" : "picks"}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
