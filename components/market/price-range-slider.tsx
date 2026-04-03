"use client";

import { useEffect, useMemo, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

type PriceRangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (next: [number, number]) => void;
};

function dollarsFromCents(value: number) {
  return Math.round(value / 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PriceRangeSlider({
  min,
  max,
  step = 100,
  value,
  onValueChange
}: PriceRangeSliderProps) {
  const [minValue, maxValue] = value;
  const [minInput, setMinInput] = useState(String(dollarsFromCents(minValue)));
  const [maxInput, setMaxInput] = useState(String(dollarsFromCents(maxValue)));

  const maxDisplayLabel = useMemo(
    () => (maxValue >= max ? `${formatCurrency(max / 100)}+` : formatCurrency(maxValue / 100)),
    [maxValue, max]
  );

  useEffect(() => {
    setMinInput(String(dollarsFromCents(minValue)));
    setMaxInput(String(dollarsFromCents(maxValue)));
  }, [minValue, maxValue]);

  function commitMin(raw: string) {
    const parsed = Number(raw.replace(/[^\d]/g, ""));
    const nextDollars = Number.isFinite(parsed) && parsed > 0 ? parsed : dollarsFromCents(min);
    const nextMin = clamp(nextDollars * 100, min, maxValue);
    onValueChange([nextMin, maxValue]);
    setMinInput(String(dollarsFromCents(nextMin)));
  }

  function commitMax(raw: string) {
    const parsed = Number(raw.replace(/[^\d]/g, ""));
    const nextDollars = Number.isFinite(parsed) && parsed > 0 ? parsed : dollarsFromCents(max);
    const normalizedMax = nextDollars >= dollarsFromCents(max) ? max : nextDollars * 100;
    const nextMax = clamp(normalizedMax, minValue, max);
    onValueChange([minValue, nextMax]);
    setMaxInput(String(dollarsFromCents(nextMax)));
  }

  return (
    <div className="surface-subtle min-w-0 rounded-[1.45rem] px-4 py-3 md:px-4 md:py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[0.78rem] font-medium text-foreground/66 dark:text-white/72">Price</p>
        <p className="text-sm font-medium text-foreground">
          {formatCurrency(minValue / 100)} - {maxDisplayLabel}
        </p>
      </div>

      <div className="mt-3.5">
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
          <SliderPrimitive.Track className="relative h-2.5 w-full grow overflow-hidden rounded-full bg-muted/75 ring-1 ring-border/60">
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-uva-orange/90" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label="Minimum price"
            className="block h-5 w-5 rounded-full border border-uva-orange/70 bg-card shadow-[0_0_0_5px_rgba(229,114,0,0.12)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uva-orange focus-visible:ring-offset-2"
          />
          <SliderPrimitive.Thumb
            aria-label="Maximum price"
            className="block h-5 w-5 rounded-full border border-uva-orange/70 bg-card shadow-[0_0_0_5px_rgba(229,114,0,0.12)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uva-orange focus-visible:ring-offset-2"
          />
        </SliderPrimitive.Root>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <label className="space-y-1.5">
          <span className="block text-[0.78rem] font-medium text-foreground/66 dark:text-white/72">Min</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              inputMode="numeric"
              value={minInput}
              onChange={(event) => setMinInput(event.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => commitMin(minInput)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitMin(minInput);
                  event.currentTarget.blur();
                }
              }}
              className="h-10 rounded-full pl-7 pr-3 text-sm"
              aria-label="Minimum price in dollars"
            />
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="block text-[0.78rem] font-medium text-foreground/66 dark:text-white/72">Max</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              inputMode="numeric"
              value={maxInput}
              onChange={(event) => setMaxInput(event.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => commitMax(maxInput)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitMax(maxInput);
                  event.currentTarget.blur();
                }
              }}
              className="h-10 rounded-full pl-7 pr-3 text-sm"
              aria-label="Maximum price in dollars"
            />
          </div>
        </label>
      </div>
    </div>
  );
}
