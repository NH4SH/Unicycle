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
    <div className="rounded-3xl border border-border bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pickup spots on Grounds</p>
      <div className="flex flex-wrap gap-2">
        {options.map((location) => {
          const selected = value.includes(location);
          return (
            <button
              key={location}
              type="button"
              onClick={() => toggle(location)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition",
                selected
                  ? "border-electric bg-electric/10 text-electric"
                  : "border-border bg-background text-muted-foreground hover:border-uva-orange hover:text-uva-orange"
              )}
              aria-pressed={selected}
            >
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </button>
          );
        })}
      </div>
    </div>
  );
}
