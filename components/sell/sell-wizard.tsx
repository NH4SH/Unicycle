"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadDropzone } from "@uploadthing/react";
import { ArrowLeft, ArrowRight, GripHorizontal, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PayoutSetupButton } from "@/components/payments/payout-setup-button";
import { PickupChipSelector } from "@/components/shared/pickup-chip-selector";
import { LinkedPlaceText, PlaceMapLink } from "@/components/shared/linked-place-text";
import { PickupMapPreview } from "@/components/shared/pickup-map-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONDITION_LABELS, CONDITION_OPTIONS, PICKUP_LOCATIONS } from "@/lib/constants";
import { getPickupLocationPublicLabel } from "@/lib/campus-pickup-locations";
import { packListingDescription } from "@/lib/listing-draft";
import { getMarketBrowsePillLabel, getStoredCategoryForBrowseLane, PRIMARY_MARKET_BROWSE_PILLS, SECONDARY_MARKET_BROWSE_PILLS, type SellerBrowseLaneId } from "@/lib/market-browse";
import type { SellerPayoutState } from "@/lib/seller-payouts";
import { getUploadedFileUrl } from "@/lib/uploadthing";
import { listingSubmissionSchema } from "@/lib/validators";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

type Draft = {
  images: string[];
  title: string;
  description: string;
  price: string;
  category: string;
  browseLane: SellerBrowseLaneId;
  condition: string;
  brand: string;
  size: string;
  color: string;
  pickupLocations: string[];
  meetupNotes: string;
  status: "ACTIVE" | "CANCELLED";
};

const STORAGE_KEY = "hoosfinds-sell-draft";

const defaultDraft: Draft = {
  images: [],
  title: "",
  description: "",
  price: "",
  category: "STREETWEAR",
  browseLane: "streetwear",
  condition: "GOOD",
  brand: "",
  size: "",
  color: "",
  pickupLocations: [],
  meetupNotes: "",
  status: "ACTIVE"
};

type SellWizardProps = {
  mode?: "create" | "edit";
  listingId?: string;
  initialDraft?: Draft;
  locked?: boolean;
  payoutsReady?: boolean;
  payoutsConfigured?: boolean;
  viewerSignedIn?: boolean;
  payoutSetupHref?: string;
  payoutSetupLabel?: string;
  payoutSetupDetail?: string;
  payoutState?: SellerPayoutState;
};

export function SellWizard({
  mode = "create",
  listingId,
  initialDraft,
  locked = false,
  payoutsReady = true,
  payoutsConfigured = true,
  viewerSignedIn = true,
  payoutSetupHref = "/payments",
  payoutSetupLabel = "Connect payouts",
  payoutSetupDetail = "Before your listing can go live, connect where you want HoosFinds to send your earnings.",
  payoutState
}: SellWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(initialDraft ?? defaultDraft);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const storageKey = useMemo(
    () => (mode === "edit" && listingId ? `hoosfinds-edit-draft-${listingId}` : STORAGE_KEY),
    [listingId, mode]
  );

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Draft;
        setDraft(parsed);
      } catch {
        localStorage.removeItem(storageKey);
      }
    } else if (initialDraft) {
      setDraft(initialDraft);
    }
  }, [initialDraft, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  const progress = useMemo(() => (step / 4) * 100, [step]);
  const needsPayoutSetupToSubmit = !locked && !payoutsReady && (mode === "create" || draft.status === "ACTIVE");

  function validateCurrentStep() {
    if (step === 1 && draft.images.length < 2) return "Add at least two photos so buyers can trust the listing.";
    if (step === 2) {
      if (draft.title.trim().length < 4) return "Title should be at least 4 characters.";
      if (!draft.price || Number(draft.price) < 1) return "Set a valid price.";
      if (draft.description.trim().length < 12) return "Description should be at least 12 characters.";
      if (["womens", "mens", "vintage", "streetwear", "shoes"].includes(draft.browseLane) && draft.size.trim().length === 0) {
        return "Add a size for clothing or shoe listings.";
      }
    }
    if (step === 3 && draft.pickupLocations.length < 1) {
      return "Pick at least one meetup spot on Grounds.";
    }

    return null;
  }

  function goNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStep((prev) => Math.min(prev + 1, 4));
  }

  function goBack() {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function reorderImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.images.length) return;

    const nextImages = [...draft.images];
    const [item] = nextImages.splice(index, 1);
    nextImages.splice(nextIndex, 0, item);
    setDraft((prev) => ({ ...prev, images: nextImages }));
  }

  function buildDescription() {
    return packListingDescription({
      description: draft.description,
      brand: draft.brand,
      size: draft.size,
      color: draft.color
    });
  }

  function updateBrowseLane(nextLane: SellerBrowseLaneId) {
    setDraft((prev) => ({
      ...prev,
      browseLane: nextLane,
      category: getStoredCategoryForBrowseLane(nextLane)
    }));
  }

  async function publish() {
    const parsed = listingSubmissionSchema.safeParse({
      title: draft.title,
      description: draft.description,
      priceCents: Number(draft.price) * 100,
      category: draft.category,
      browseLane: draft.browseLane,
      condition: draft.condition,
      images: draft.images,
      pickupLocations: draft.pickupLocations,
      meetupNotes: draft.meetupNotes || undefined,
      brand: draft.brand || undefined,
      size: draft.size || undefined,
      color: draft.color || undefined
    });

    if (!parsed.success) {
      setError("Please review your listing details before publishing.");
      return;
    }

    setPublishing(true);

    const response = await fetch(mode === "edit" && listingId ? `/api/listings/${listingId}` : "/api/listings", {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.data,
        ...(mode === "edit" ? { status: draft.status } : {})
      })
    });

    setPublishing(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(data?.message || `Could not ${mode === "edit" ? "save changes" : "publish listing"}. Please try again.`);
      return;
    }

    const data = (await response.json()) as { id: string };
    localStorage.removeItem(storageKey);
    toast.success(mode === "edit" ? "Listing updated." : "Find published.");
    router.push(`/listing/${data.id}`);
    router.refresh();
  }

  return (
    <Card className="surface-panel-strong">
      <CardContent className="space-y-7 p-5 md:p-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span>Step {step} of 4</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {error ? <div className="rounded-[1.2rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        {locked ? (
          <div className="surface-subtle rounded-[1.2rem] px-4 py-3 text-sm text-foreground/76 dark:text-white/82">
            This listing is in a protected sale state, so the fields below are read-only until the handoff is resolved.
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-2">
                <p className="editorial-eyebrow">Step 1</p>
                <h2 className="font-display text-3xl font-extrabold tracking-tight">Lead with the photos.</h2>
                <p className="text-sm leading-7 text-foreground/78 dark:text-white/82">
                  Style sells faster when the first image feels clear and intentional. Use natural light, show the fit, and keep the background clean.
                </p>
              </div>
              <div className="surface-subtle rounded-[1.5rem] p-4">
                <p className="editorial-eyebrow">Photo tips</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="surface-subtle rounded-[1.15rem] p-3 text-sm text-foreground/76 dark:text-white/84">Front-facing hero image</div>
                  <div className="surface-subtle rounded-[1.15rem] p-3 text-sm text-foreground/76 dark:text-white/84">Close-up on texture or wear</div>
                  <div className="surface-subtle rounded-[1.15rem] p-3 text-sm text-foreground/76 dark:text-white/84">One angle that shows the full piece</div>
                </div>
              </div>
            </div>

            <UploadDropzone<OurFileRouter, "listingImage">
              endpoint="listingImage"
              disabled={locked || publishing}
              onClientUploadComplete={(result) => {
                const urls = result
                  .map((item) => getUploadedFileUrl(item))
                  .filter((item): item is string => Boolean(item));
                setDraft((prev) => ({ ...prev, images: [...prev.images, ...urls].slice(0, 6) }));
                toast.success("Photos uploaded.");
              }}
              onUploadError={(uploadError: Error) => {
                toast.error(uploadError.message);
              }}
              appearance={{
                container: "rounded-[1.85rem] border-dashed border-border bg-background/70 dark:bg-white/[0.04]",
                button: "bg-[#E57200] text-white",
                uploadIcon: "text-foreground/72 dark:text-white/82",
                label: "text-sm font-medium text-foreground/82 dark:text-white/88",
                allowedContent: "text-xs text-foreground/72 dark:text-white/80"
              }}
              content={{
                allowedContent() {
                  return "Up to 6 images · 20 MB each · JPG, PNG, WEBP, HEIC, or HEIF. We optimize automatically.";
                }
              }}
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {draft.images.map((url, idx) => (
                <div key={`${url}-${idx}`} className="space-y-2 rounded-[1.4rem] border border-border bg-card/90 p-2 shadow-soft">
                  <div className="relative aspect-square overflow-hidden rounded-[1.05rem]">
                    <Image src={url} alt={`Upload ${idx + 1}`} fill className="object-cover" sizes="200px" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <Button type="button" size="sm" variant="secondary" onClick={() => reorderImage(idx, -1)} disabled={locked}>
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => reorderImage(idx, 1)} disabled={locked}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={locked}
                      onClick={() => setDraft((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
              <div className="space-y-2">
                <p className="editorial-eyebrow">Step 2</p>
                <h2 className="font-display text-3xl font-extrabold tracking-tight">Add the details buyers care about.</h2>
                <p className="text-sm leading-7 text-foreground/78 dark:text-white/82">
                  Clear titles, fair pricing, and fit details make a listing easier to trust right away.
                </p>
              </div>
              <div className="surface-subtle rounded-[1.5rem] p-4 text-sm leading-6 text-foreground/76 dark:text-white/82">
                Good examples: “Vintage UVA crewneck”, “Patagonia fleece jacket”, “Going-out top”, “Nike sneakers”.
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Vintage UVA crewneck, Barbour jacket, Veja sneakers..."
                  disabled={locked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  min={1}
                  value={draft.price}
                  onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
                  placeholder="45"
                  disabled={locked}
                />
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={draft.condition} onValueChange={(value) => setDraft((prev) => ({ ...prev, condition: value }))} disabled={locked}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Shop section</Label>
                <Select value={draft.browseLane} onValueChange={(value) => updateBrowseLane(value as SellerBrowseLaneId)} disabled={locked}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Fashion first</SelectLabel>
                      {PRIMARY_MARKET_BROWSE_PILLS.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>More categories</SelectLabel>
                      {SECONDARY_MARKET_BROWSE_PILLS.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-6 text-foreground/72 dark:text-white/78">
                  Pick the shopper-facing section where this should show up first.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand (optional)</Label>
                <Input
                  id="brand"
                  value={draft.brand}
                  onChange={(event) => setDraft((prev) => ({ ...prev, brand: event.target.value }))}
                  placeholder="Patagonia, Nike, Zara..."
                  disabled={locked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={draft.size}
                  onChange={(event) => setDraft((prev) => ({ ...prev, size: event.target.value }))}
                  placeholder="S, M, 28, 8.5..."
                  disabled={locked}
                />
                {["womens", "mens", "vintage", "streetwear", "shoes"].includes(draft.browseLane) ? (
                  <p className="text-xs leading-6 text-foreground/72 dark:text-white/78">Required for clothing and shoe listings.</p>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="color">Color (optional)</Label>
                <Input
                  id="color"
                  value={draft.color}
                  onChange={(event) => setDraft((prev) => ({ ...prev, color: event.target.value }))}
                  placeholder="Cream, navy, faded black..."
                  disabled={locked}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Describe the fit, wear, flaws, material, or anything another student would want to know before meeting up."
                  disabled={locked}
                />
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-2">
                <p className="editorial-eyebrow">Step 3</p>
                <h2 className="font-display text-3xl font-extrabold tracking-tight">Set the pickup plan.</h2>
                <p className="text-sm leading-7 text-foreground/78 dark:text-white/82">
                  Keep it easy for fellow Hoos. The best listings make it obvious where and when a handoff could happen.
                </p>
              </div>
              <div className="surface-subtle rounded-[1.5rem] p-4 text-sm leading-6 text-foreground/76 dark:text-white/82">
                Great meetup notes mention timing and context, like “Can meet after 4pm near The Corner” or “Usually around Newcomb between classes.”
              </div>
            </div>

            <PickupChipSelector
              options={PICKUP_LOCATIONS}
              value={draft.pickupLocations}
              onChange={(pickupLocations) => setDraft((prev) => ({ ...prev, pickupLocations }))}
            />

            {draft.pickupLocations.length ? (
              <PickupMapPreview
                locations={draft.pickupLocations}
                compact
                title="Pickup preview"
                detail="Custom meetup text can still be stored on the listing, but known UVA spots unlock the campus map preview."
              />
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="meetupNotes">Meetup notes (optional)</Label>
              <Textarea
                id="meetupNotes"
                value={draft.meetupNotes}
                onChange={(event) => setDraft((prev) => ({ ...prev, meetupNotes: event.target.value }))}
                placeholder="I can usually meet after 5 near Rice Hall, or between classes by The Corner."
                disabled={locked}
              />
            </div>

            {mode === "edit" ? (
              <div className="space-y-2">
                <Label>Availability</Label>
                <Select value={draft.status} onValueChange={(value: "ACTIVE" | "CANCELLED") => setDraft((prev) => ({ ...prev, status: value }))} disabled={locked}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Live on HoosFinds</SelectItem>
                    <SelectItem value="CANCELLED">Pause listing</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-foreground/68 dark:text-white/76">
                  Use this to quietly pause a listing without deleting it. Listings in pending or completed sales stay locked.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="space-y-2">
                <p className="editorial-eyebrow">Step 4</p>
                <h2 className="font-display text-3xl font-extrabold tracking-tight">Review before it hits the feed.</h2>
                <p className="text-sm leading-7 text-foreground/78 dark:text-white/82">
                  This is the final listing preview buyers will see once you publish it on HoosFinds.
                </p>
              </div>
              <div className="surface-subtle rounded-[1.5rem] p-4 text-sm leading-6 text-foreground/76 dark:text-white/82">
                Best-performing listings feel concise, photo-led, and easy to trust at a glance.
              </div>
            </div>

            <div className="surface-subtle rounded-[2rem] p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="outline">{getMarketBrowsePillLabel(draft.browseLane)}</Badge>
                <Badge variant="orange">{CONDITION_LABELS[draft.condition as keyof typeof CONDITION_LABELS] || draft.condition}</Badge>
                <Badge variant="blue">{draft.price ? `$${draft.price}` : "$0"}</Badge>
                {mode === "edit" ? <Badge variant={draft.status === "ACTIVE" ? "blue" : "outline"}>{draft.status === "ACTIVE" ? "Live" : "Paused"}</Badge> : null}
                {draft.brand ? <Badge variant="outline">{draft.brand}</Badge> : null}
                {draft.size ? <Badge variant="outline">Size {draft.size}</Badge> : null}
                {draft.color ? <Badge variant="outline">{draft.color}</Badge> : null}
              </div>
              <h3 className="font-display text-3xl font-extrabold tracking-tight">{draft.title || "Untitled find"}</h3>
              <p className="mt-3 text-sm leading-7 text-foreground/76 dark:text-white/82">
                <LinkedPlaceText text={buildDescription() || "No description yet."} />
              </p>
              <p className="mt-5 editorial-eyebrow">Meetup spots</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.pickupLocations.map((loc) => (
                  <Badge key={loc} variant="blue">
                    <PlaceMapLink place={loc} className="font-medium underline decoration-white/40 underline-offset-4 hover:text-white">
                      {getPickupLocationPublicLabel(loc)}
                    </PlaceMapLink>
                  </Badge>
                ))}
              </div>
              {draft.meetupNotes ? (
                <p className="mt-4 text-sm leading-7 text-foreground/76 dark:text-white/82">
                  <LinkedPlaceText text={draft.meetupNotes} />
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
              {draft.images.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-[1.3rem] border border-border bg-white shadow-soft">
                  <Image src={url} alt="Preview" fill className="object-cover" sizes="100px" />
                </div>
              ))}
            </div>

            {!payoutsReady ? (
              <div className="surface-subtle rounded-[1.5rem] px-4 py-4 text-sm leading-7 text-foreground/76 dark:text-white/82">
                {needsPayoutSetupToSubmit
                  ? payoutSetupDetail
                  : "This listing can stay paused while you finish payout setup. Reconnect payouts before putting it live again."}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border/80 pt-5">
          <Button type="button" variant="secondary" onClick={goBack} disabled={step === 1 || publishing}>
            Back
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              Next
              <GripHorizontal className="ml-1.5 h-4 w-4" />
            </Button>
          ) : needsPayoutSetupToSubmit ? (
            payoutState ? (
              payoutState.ctaTarget === "stripe" ? (
                <PayoutSetupButton
                  viewerSignedIn={viewerSignedIn}
                  payoutsConfigured={payoutsConfigured}
                  payoutState={payoutState}
                  callbackPath={payoutSetupHref}
                />
              ) : (
                <Button type="button" onClick={() => router.push(payoutSetupHref)}>
                  {payoutState.ctaLabel}
                </Button>
              )
            ) : (
              <Button type="button" onClick={() => router.push(payoutSetupHref)}>
                {payoutSetupLabel}
              </Button>
            )
          ) : (
            <Button type="button" onClick={publish} disabled={publishing || locked}>
              {publishing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {locked ? "Listing locked" : publishing ? (mode === "edit" ? "Saving..." : "Publishing...") : mode === "edit" ? "Save changes" : "Publish find"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
