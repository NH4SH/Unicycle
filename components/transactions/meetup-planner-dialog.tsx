"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, X } from "lucide-react";

import { PickupChipSelector } from "@/components/shared/pickup-chip-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MeetupPlannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    pickupLocations: string[];
  } | null;
  currentLocation?: string | null;
  currentPlan?: string | null;
  currentScheduledFor?: string | null;
  onSubmit: (payload: { meetupLocation?: string; meetupPlan?: string; meetupScheduledFor?: string }) => Promise<boolean>;
};

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

export function MeetupPlannerDialog({
  open,
  onOpenChange,
  listing,
  currentLocation,
  currentPlan,
  currentScheduledFor,
  onSubmit
}: MeetupPlannerDialogProps) {
  const [meetupLocation, setMeetupLocation] = useState<string[]>(currentLocation ? [currentLocation] : []);
  const [meetupPlan, setMeetupPlan] = useState(currentPlan ?? "");
  const [meetupScheduledFor, setMeetupScheduledFor] = useState(toDateTimeLocalValue(currentScheduledFor));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setMeetupLocation(currentLocation ? [currentLocation] : listing?.pickupLocations?.[0] ? [listing.pickupLocations[0]] : []);
    setMeetupPlan(currentPlan ?? "");
    setMeetupScheduledFor(toDateTimeLocalValue(currentScheduledFor));

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [currentLocation, currentPlan, currentScheduledFor, listing, open]);

  if (!open || !listing) {
    return null;
  }

  async function submit() {
    setSubmitting(true);
    try {
      const saved = await onSubmit({
        meetupLocation: meetupLocation[0] || undefined,
        meetupPlan: meetupPlan.trim() || undefined,
        meetupScheduledFor: meetupScheduledFor || undefined
      });
      if (saved) {
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-slate-950/72 backdrop-blur-sm md:items-center md:justify-center md:p-6">
      <div className="surface-overlay-strong max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] md:max-w-3xl md:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-4 md:px-6">
          <div>
            <p className="editorial-eyebrow">Meetup flow</p>
            <h3 className="font-display text-2xl font-extrabold tracking-tight">Set the pickup plan</h3>
          </div>
          <Button type="button" variant="ghost" size="icon" className="touch-icon" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-5 px-4 py-5 md:px-6 md:py-6">
          <div className="rounded-[1.3rem] border border-border/70 bg-background/72 px-4 py-3 text-sm leading-6 text-foreground/72 dark:text-white/76">
            Keep the handoff easy: choose one approved listing spot, then add timing or landmark details that will help both sides actually connect.
          </div>

          <PickupChipSelector
            options={listing.pickupLocations}
            value={meetupLocation}
            onChange={setMeetupLocation}
            maxSelections={1}
            allowCustom={false}
            label="Approved pickup spots"
            description="Choose from the seller's listing spots so the meetup stays inside the agreed plan."
            restrictToOptions
          />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="space-y-2">
              <Label htmlFor="meetupPlan">Meetup notes</Label>
              <Textarea
                id="meetupPlan"
                value={meetupPlan}
                onChange={(event) => setMeetupPlan(event.target.value)}
                placeholder="Front entrance, after 4:30, blue tote bag, or another quick handoff detail."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetupScheduledFor">Suggested time</Label>
              <div className="surface-field flex items-center gap-3 rounded-[1.15rem] px-3.5 py-3">
                <CalendarDays className="h-4 w-4 text-foreground/42 dark:text-white/46" />
                <Input
                  id="meetupScheduledFor"
                  type="datetime-local"
                  value={meetupScheduledFor}
                  onChange={(event) => setMeetupScheduledFor(event.target.value)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/70 px-4 py-4 md:px-6">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save meetup plan
          </Button>
        </div>
      </div>
    </div>
  );
}
