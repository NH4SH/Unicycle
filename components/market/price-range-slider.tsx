"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";

import { formatCurrency } from "@/lib/utils";

type PriceRangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (next: [number, number]) => void;
};

export function PriceRangeSlider({
  min,
  max,
  step = 100,
  value,
  onValueChange
}: PriceRangeSliderProps) {
  const [minValue, maxValue] = value;

  return (
    <div className="surface-subtle rounded-[1.45rem] px-4 py-3.5 md:px-4 md:py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Price range</p>
          <p className="font-medium text-foreground">
            {formatCurrency(minValue / 100)} - {formatCurrency(maxValue / 100)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="rounded-full border border-border/80 bg-card/72 px-2.5 py-1">
            Min {formatCurrency(minValue / 100)}
          </span>
          <span className="rounded-full border border-border/80 bg-card/72 px-2.5 py-1">
            Max {formatCurrency(maxValue / 100)}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <SliderPrimitive.Root
          min={min}
          max={max}
          step={step}
          minStepsBetweenThumbs={1}
          value={[minValue, maxValue]}
          onValueChange={(next) => onValueChange([next[0] ?? min, next[1] ?? max])}
          className="relative flex w-full touch-none select-none items-center py-2"
          aria-label="Price range"
        >
          <SliderPrimitive.Track className="relative h-2.5 w-full grow overflow-hidden rounded-full bg-white/8 ring-1 ring-border/60">
            <div className="absolute inset-y-[2px] left-1 right-1 rounded-full bg-black/10 dark:bg-black/20" />
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-uva-orange/90 via-[#cc8750] to-uva-blue" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border border-uva-orange/70 bg-card shadow-[0_0_0_5px_rgba(229,114,0,0.12)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uva-orange focus-visible:ring-offset-2" />
          <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border border-uva-blue/70 bg-card shadow-[0_0_0_5px_rgba(78,107,149,0.16)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uva-blue focus-visible:ring-offset-2" />
        </SliderPrimitive.Root>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>{formatCurrency(min / 100)}</span>
        <span>Drag both ends</span>
        <span>{formatCurrency(max / 100)}</span>
      </div>
    </div>
  );
}
