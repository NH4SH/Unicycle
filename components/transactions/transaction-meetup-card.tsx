"use client";

import type { ReactNode } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Compass, MapPin } from "lucide-react";

import { LinkedPlaceText } from "@/components/shared/linked-place-text";
import { PickupMapPreview } from "@/components/shared/pickup-map-preview";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { getPickupLocationArea, getPickupLocationShortLabel } from "@/lib/campus-pickup-locations";
import { cn } from "@/lib/utils";

type TransactionStatusLike = "PENDING_CONFIRMATION" | "ISSUE_REPORTED" | "COMPLETED" | "CANCELLED";
type HandoffStatusLike = "PENDING_HANDOFF" | "MEETUP_SCHEDULED" | "HANDOFF_CONFIRMED" | "RECEIVED" | "ISSUE_REPORTED" | "CANCELLED";

type TransactionMeetupCardProps = {
  role: "buyer" | "seller";
  status: TransactionStatusLike;
  handoffStatus: HandoffStatusLike;
  meetupLocation: string | null;
  meetupPlan: string | null;
  meetupScheduledFor: string | null;
  handoffConfirmedAt?: string | null;
  buyerConfirmedReceivedAt?: string | null;
  confirmedAt?: string | null;
  openIssue?: {
    issueType: string;
    description: string | null;
    createdAt: string;
  } | null;
  fallbackLocations: string[];
  fallbackMeetupNotes?: string | null;
  compact?: boolean;
  actions?: ReactNode;
  className?: string;
};

function isSameDay(value: Date, comparison: Date) {
  return (
    value.getFullYear() === comparison.getFullYear() &&
    value.getMonth() === comparison.getMonth() &&
    value.getDate() === comparison.getDate()
  );
}

function formatMeetupTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getMeetupPresentation({
  role,
  status,
  handoffStatus,
  meetupLocation,
  meetupPlan,
  meetupScheduledFor,
  confirmedAt,
  openIssue
}: Pick<
  TransactionMeetupCardProps,
  "role" | "status" | "handoffStatus" | "meetupLocation" | "meetupPlan" | "meetupScheduledFor" | "confirmedAt" | "openIssue"
>) {
  const hasMeetupDetails = Boolean(meetupLocation || meetupPlan || meetupScheduledFor);
  const meetupDate = meetupScheduledFor ? new Date(meetupScheduledFor) : null;
  const meetupIsToday = meetupDate ? isSameDay(meetupDate, new Date()) : false;

  if (status === "ISSUE_REPORTED" || handoffStatus === "ISSUE_REPORTED" || openIssue) {
    return {
      label: "Issue reported",
      variant: "outline" as BadgeProps["variant"],
      summary: "This handoff is paused while the meetup issue gets worked through.",
      nextStep:
        role === "buyer"
          ? "Keep everything in messages until the issue is resolved, then update the meetup details if the handoff is still on."
          : "Keep the buyer updated in messages while the issue is resolved before locking the meetup back in."
    };
  }

  if (status === "CANCELLED" || handoffStatus === "CANCELLED") {
    return {
      label: "Sale cancelled",
      variant: "outline" as BadgeProps["variant"],
      summary: "This handoff was cancelled before the meetup wrapped up.",
      nextStep:
        role === "buyer"
          ? "You do not need to travel for this one now. Keep the old meetup details here only as reference."
          : "This sale is off the board. Relist the item when you want to start fresh with a new buyer."
    };
  }

  if (status === "COMPLETED" || handoffStatus === "RECEIVED" || confirmedAt) {
    return {
      label: "Item received",
      variant: "orange" as BadgeProps["variant"],
      summary: "The meetup is closed out and the item is officially marked received on HoosFinds.",
      nextStep:
        role === "buyer"
          ? "You’re all set. Keep the meetup details here if you ever need to reference how the handoff happened."
          : "This handoff is complete. HoosFinds has the meetup trail recorded for this sale."
    };
  }

  if (handoffStatus === "HANDOFF_CONFIRMED") {
    return {
      label: "Met up",
      variant: "blue" as BadgeProps["variant"],
      summary: "The meetup happened and the handoff was marked complete.",
      nextStep:
        role === "buyer"
          ? "If the item is in hand, confirm receipt to fully close out the order."
          : "You’ve marked the meetup complete. The buyer just needs to confirm receipt next."
    };
  }

  if (meetupIsToday) {
    return {
      label: "Meetup today",
      variant: "blue" as BadgeProps["variant"],
      summary: "The spot and time are already set for today, so both sides can head over with confidence.",
      nextStep:
        role === "buyer"
          ? "Use the saved notes when you head over, then confirm receipt once the handoff is done."
          : "Keep the buyer posted in messages if timing shifts, then mark the meetup complete once you actually hand it off."
    };
  }

  if (handoffStatus === "MEETUP_SCHEDULED" || hasMeetupDetails) {
    return {
      label: "Meetup planned",
      variant: "blue" as BadgeProps["variant"],
      summary: "The location is locked in and the handoff details are saved in one place.",
      nextStep:
        role === "buyer"
          ? "You’ve got the where. Use the notes for the exact entrance, timing, or landmark when you head out."
          : "The meetup is lined up. Keep the buyer posted if anything changes and mark the handoff complete when it’s done."
    };
  }

  return {
    label: "Meetup not locked in",
    variant: "outline" as BadgeProps["variant"],
    summary: "The campus pickup spot still needs a final plan before the handoff feels settled.",
    nextStep:
      role === "buyer"
        ? "Pick one of the approved meetup spots, save any landmark notes, and use messages to nail down the timing."
        : "Choose the meetup spot you actually want to use, add any landmark notes, and keep the buyer pointed to one clear handoff plan."
  };
}

export function TransactionMeetupCard({
  role,
  status,
  handoffStatus,
  meetupLocation,
  meetupPlan,
  meetupScheduledFor,
  handoffConfirmedAt,
  buyerConfirmedReceivedAt,
  confirmedAt,
  openIssue,
  fallbackLocations,
  fallbackMeetupNotes,
  compact = false,
  actions,
  className
}: TransactionMeetupCardProps) {
  const previewLocations = meetupLocation ? [meetupLocation] : fallbackLocations;
  const primaryLocation = meetupLocation ?? fallbackLocations[0] ?? null;
  const primaryNote = meetupPlan?.trim() || fallbackMeetupNotes?.trim() || null;
  const secondaryNote =
    meetupPlan?.trim() && fallbackMeetupNotes?.trim() && meetupPlan.trim() !== fallbackMeetupNotes.trim()
      ? fallbackMeetupNotes.trim()
      : null;
  const displayTime = formatMeetupTime(meetupScheduledFor);
  const area = primaryLocation ? getPickupLocationArea(primaryLocation) : null;
  const presentation = getMeetupPresentation({
    role,
    status,
    handoffStatus,
    meetupLocation,
    meetupPlan,
    meetupScheduledFor,
    confirmedAt,
    openIssue
  });

  const spotTitle = meetupLocation ? "Exact meetup spot" : fallbackLocations.length > 1 ? "Approved meetup spots" : "Pickup spot";
  const spotValue = meetupLocation
    ? meetupLocation
    : fallbackLocations.length > 1
      ? `${fallbackLocations.slice(0, 2).join(" · ")}${fallbackLocations.length > 2 ? ` +${fallbackLocations.length - 2} more` : ""}`
      : primaryLocation ?? "Choose a spot";
  const spotMeta = meetupLocation
    ? area ?? "Saved on the meetup plan."
    : fallbackLocations.length > 1
      ? `${fallbackLocations.length} seller-approved meetup options.`
      : area ?? "Seller-approved campus meetup spot.";
  const headerTitle = meetupLocation
    ? `Pickup ${getPickupLocationShortLabel(primaryLocation ?? meetupLocation)}`
    : fallbackLocations.length > 1
      ? "Seller-approved meetup spots"
      : primaryLocation
        ? `Pickup ${getPickupLocationShortLabel(primaryLocation)}`
        : "Meetup plan";

  const timeMeta =
    handoffStatus === "HANDOFF_CONFIRMED"
      ? handoffConfirmedAt
        ? "Marked complete after the meetup happened."
        : "Marked complete on the handoff flow."
      : buyerConfirmedReceivedAt || confirmedAt
        ? "Confirmed inside HoosFinds."
        : displayTime
          ? "Saved as the meetup time."
          : "Save a suggested time or keep timing in the meetup notes.";

  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-border/80 bg-card/82 px-4 py-4 shadow-soft dark:border-white/14 dark:bg-white/[0.09]",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={presentation.variant}>{presentation.label}</Badge>
            {openIssue ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-uva-orange/20 bg-uva-orange/10 px-2.5 py-1 text-[0.72rem] font-medium text-foreground/86 dark:border-uva-orange/28 dark:bg-uva-orange/[0.14] dark:text-white/88">
                <AlertCircle className="h-3.5 w-3.5 text-uva-orange" />
                {openIssue.issueType.replaceAll("_", " ").toLowerCase()}
              </span>
            ) : null}
          </div>
          <div className="space-y-1">
            <p className="font-display text-xl font-bold tracking-tight text-foreground dark:text-white">{headerTitle}</p>
            <p className="max-w-2xl text-sm leading-6 text-foreground/76 dark:text-white/82">{presentation.summary}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="surface-subtle rounded-[1.2rem] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-white">
            <MapPin className="h-4 w-4 text-uva-orange" />
            {spotTitle}
          </div>
          <p className="mt-2 text-sm font-medium text-foreground/92 dark:text-white/94">{spotValue}</p>
          <p className="mt-1 text-xs leading-5 text-foreground/68 dark:text-white/76">{spotMeta}</p>
        </div>

        <div className="surface-subtle rounded-[1.2rem] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-white">
            {handoffStatus === "HANDOFF_CONFIRMED" || handoffStatus === "RECEIVED" ? (
              <CheckCircle2 className="h-4 w-4 text-uva-orange" />
            ) : (
              <CalendarDays className="h-4 w-4 text-uva-orange" />
            )}
            Handoff timing
          </div>
          <p className="mt-2 text-sm font-medium text-foreground/92 dark:text-white/94">{displayTime ?? "Timing still flexible"}</p>
          <p className="mt-1 text-xs leading-5 text-foreground/68 dark:text-white/76">{timeMeta}</p>
        </div>
      </div>

      {previewLocations.length > 0 ? (
        <PickupMapPreview
          locations={previewLocations}
          compact={compact}
          className="mt-4"
          title="Meetup map"
          detail="This meetup uses a custom text spot, so HoosFinds links it out to maps instead of dropping a campus pin preview."
        />
      ) : null}

      <div className="surface-subtle mt-4 rounded-[1.2rem] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-white">
          <Compass className="h-4 w-4 text-uva-orange" />
          Meetup notes
        </div>
        {primaryNote ? (
          <p className="mt-2 text-sm leading-6 text-foreground/84 dark:text-white/88">
            <LinkedPlaceText text={primaryNote} />
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-foreground/68 dark:text-white/76">
            No extra handoff notes saved yet. Add an entrance, landmark, timing note, or arrival detail to make the meetup smoother.
          </p>
        )}
        {secondaryNote ? (
          <div className="mt-3 border-t border-border/70 pt-3 dark:border-white/10">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground/58 dark:text-white/68">Listing note</p>
            <p className="mt-1 text-sm leading-6 text-foreground/76 dark:text-white/82">
              <LinkedPlaceText text={secondaryNote} />
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 dark:border-white/10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl space-y-1">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-foreground/58 dark:text-white/68">Next step</p>
          <p className="text-sm leading-6 text-foreground/76 dark:text-white/82">{presentation.nextStep}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
