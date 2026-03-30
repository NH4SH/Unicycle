"use client";

import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

type PickupChipSelectorProps = {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
};

export function PickupChipSelector({ options, value, onChange }: PickupChipSelectorProps) {
  function toggle(location: string) {
    if (value.includes(location)) {
      onChange(value.filter((item) => item !== location));
      return;
    }

    onChange([...value, location]);
  }

  return (
    <div className="surface-panel-strong p-4">
      <p className="editorial-eyebrow mb-3">Pickup on Grounds</p>
      <div className="flex flex-wrap gap-2">
        {options.map((location) => {
          const selected = value.includes(location);
          return (
            <button
              key={location}
              type="button"
              onClick={() => toggle(location)}
              className={cn(
                "touch-chip inline-flex items-center gap-2 rounded-full border text-sm font-semibold transition",
                selected
                  ? "border-uva-blue/25 bg-uva-blue/8 text-uva-blue"
                  : "border-border bg-background text-muted-foreground hover:border-uva-orange/35 hover:text-uva-orange"
              )}
              aria-pressed={selected}
            >
              <MapPin className="h-4 w-4" />
              {location}
            </button>
          );
        })}
      </div>
    </div>
  );
}
