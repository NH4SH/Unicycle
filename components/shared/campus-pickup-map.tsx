"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";

import type { CampusPickupLocation } from "@/lib/campus-pickup-locations";
import { DEFAULT_CAMPUS_MAP_CENTER } from "@/lib/campus-pickup-locations";
import { cn } from "@/lib/utils";

type CampusPickupMapProps = {
  locations: CampusPickupLocation[];
  selectedLocation?: string | null;
  onSelectLocation?: (locationName: string) => void;
  className?: string;
  interactive?: boolean;
};

function MapViewportController({ locations, selectedLocation }: { locations: CampusPickupLocation[]; selectedLocation?: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      map.setView([DEFAULT_CAMPUS_MAP_CENTER.latitude, DEFAULT_CAMPUS_MAP_CENTER.longitude], 14);
      return;
    }

    const selected = selectedLocation ? locations.find((location) => location.name === selectedLocation) : null;
    if (selected) {
      map.setView([selected.latitude, selected.longitude], 15);
      return;
    }

    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 14);
      return;
    }

    map.fitBounds(
      locations.map((location) => [location.latitude, location.longitude] as [number, number]),
      { padding: [28, 28] }
    );
  }, [locations, map, selectedLocation]);

  return null;
}

export function CampusPickupMap({
  locations,
  selectedLocation,
  onSelectLocation,
  className,
  interactive = true
}: CampusPickupMapProps) {
  return (
    <div className={cn("campus-pickup-map overflow-hidden rounded-[1.45rem] border border-border/70", className)}>
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
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapViewportController locations={locations} selectedLocation={selectedLocation} />
        {locations.map((location) => {
          const selected = selectedLocation ? location.name === selectedLocation : false;
          return (
            <CircleMarker
              key={location.id}
              center={[location.latitude, location.longitude]}
              radius={selected ? 10 : 8}
              pathOptions={{
                color: selected ? "#E57200" : "#F7F2EB",
                weight: selected ? 3 : 2,
                fillColor: selected ? "#E57200" : "#21324B",
                fillOpacity: 0.96
              }}
              eventHandlers={
                onSelectLocation
                  ? {
                      click: () => onSelectLocation(location.name)
                    }
                  : undefined
              }
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1} className="campus-pickup-tooltip">
                <div className="space-y-0.5">
                  <div className="text-[0.76rem] font-semibold text-slate-900">{location.name}</div>
                  <div className="text-[0.7rem] text-slate-500">{location.area}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
