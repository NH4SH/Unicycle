"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadDropzone } from "@uploadthing/react";
import { ArrowLeft, ArrowRight, GripHorizontal, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PickupChipSelector } from "@/components/shared/pickup-chip-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_OPTIONS, CONDITION_OPTIONS, PICKUP_LOCATIONS } from "@/lib/constants";
import { listingSchema } from "@/lib/validators";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

type Draft = {
  images: string[];
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  pickupLocations: string[];
  meetupNotes: string;
};

const STORAGE_KEY = "unicycle-sell-draft";

const initialDraft: Draft = {
  images: [],
  title: "",
  description: "",
  price: "",
  category: "DORM",
  condition: "GOOD",
  pickupLocations: [],
  meetupNotes: ""
};

export function SellWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Draft;
        setDraft(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const progress = useMemo(() => (step / 4) * 100, [step]);

  function validateCurrentStep() {
    if (step === 1 && draft.images.length < 1) return "Add at least one image.";
    if (step === 2) {
      if (draft.title.trim().length < 4) return "Title should be at least 4 characters.";
      if (!draft.price || Number(draft.price) < 1) return "Set a valid price.";
      if (draft.description.trim().length < 12) return "Description should be at least 12 characters.";
    }
    if (step === 3 && draft.pickupLocations.length < 1) {
      return "Select at least one meetup location on Grounds.";
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

  async function publish() {
    const parsed = listingSchema.safeParse({
      title: draft.title,
      description: draft.description,
      priceCents: Number(draft.price) * 100,
      category: draft.category,
      condition: draft.condition,
      images: draft.images,
      pickupLocations: draft.pickupLocations,
      meetupNotes: draft.meetupNotes || undefined
    });

    if (!parsed.success) {
      setError("Please review your listing details before publishing.");
      return;
    }

    setPublishing(true);

    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data)
    });

    setPublishing(false);

    if (!response.ok) {
      setError("Could not publish listing. Please try again.");
      return;
    }

    const data = await response.json();
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Drop published.");
    router.push(`/listing/${data.id}`);
    router.refresh();
  }

  return (
    <Card className="border-white bg-white/95">
      <CardContent className="space-y-6 p-5 md:p-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span>Step {step} of 4</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div> : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Step 1: Photos</h2>
              <p className="text-sm text-muted-foreground">Upload up to 6 photos and reorder them.</p>
            </div>
            <UploadDropzone<OurFileRouter, "listingImage">
              endpoint="listingImage"
              onClientUploadComplete={(result: { url: string }[]) => {
                const urls = result.map((item) => item.url);
                setDraft((prev) => ({ ...prev, images: [...prev.images, ...urls].slice(0, 6) }));
                toast.success("Photos uploaded.");
              }}
              onUploadError={(uploadError: Error) => {
                toast.error(uploadError.message);
              }}
              appearance={{
                container: "rounded-3xl border-dashed border-border bg-secondary/40",
                button: "bg-uva-orange text-white",
                allowedContent: "text-xs text-muted-foreground"
              }}
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {draft.images.map((url, idx) => (
                <div key={`${url}-${idx}`} className="space-y-2 rounded-2xl border border-border p-2">
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image src={url} alt={`Upload ${idx + 1}`} fill className="object-cover" sizes="200px" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <Button type="button" size="sm" variant="secondary" onClick={() => reorderImage(idx, -1)}>
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => reorderImage(idx, 1)}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
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
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Step 2: Details</h2>
              <p className="text-sm text-muted-foreground">Tell buyers what makes your item worth grabbing.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Patagonia fleece, iClicker, mini fridge..."
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
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={draft.category} onValueChange={(value) => setDraft((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={draft.condition} onValueChange={(value) => setDraft((prev) => ({ ...prev, condition: value }))}>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={draft.description}
                onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Condition details, included accessories, fit notes, etc."
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Step 3: Meetup</h2>
              <p className="text-sm text-muted-foreground">Set where you can meet around Grounds.</p>
            </div>
            <PickupChipSelector
              options={PICKUP_LOCATIONS}
              value={draft.pickupLocations}
              onChange={(pickupLocations) => setDraft((prev) => ({ ...prev, pickupLocations }))}
            />
            <div className="space-y-2">
              <Label htmlFor="meetupNotes">Meetup notes (optional)</Label>
              <Textarea
                id="meetupNotes"
                value={draft.meetupNotes}
                onChange={(event) => setDraft((prev) => ({ ...prev, meetupNotes: event.target.value }))}
                placeholder="I can meet after 4pm near The Corner."
              />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Step 4: Review & Publish</h2>
              <p className="text-sm text-muted-foreground">Make sure this drop is ready for the feed.</p>
            </div>

            <div className="rounded-3xl border border-border bg-secondary/50 p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="orange">{draft.condition.replaceAll("_", " ")}</Badge>
                <Badge variant="blue">{draft.category}</Badge>
                <Badge>{draft.price ? `$${draft.price}` : "$0"}</Badge>
              </div>
              <h3 className="font-display text-2xl font-bold">{draft.title || "Untitled Drop"}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{draft.description || "No description yet."}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Meetup spots</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.pickupLocations.map((loc) => (
                  <Badge key={loc} variant="blue">
                    {loc}
                  </Badge>
                ))}
              </div>
              {draft.meetupNotes ? <p className="mt-3 text-sm text-muted-foreground">{draft.meetupNotes}</p> : null}
            </div>

            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              {draft.images.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-2xl border border-border">
                  <Image src={url} alt="Preview" fill className="object-cover" sizes="100px" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={goBack} disabled={step === 1 || publishing}>
            Back
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              Next
              <GripHorizontal className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={publish} disabled={publishing}>
              {publishing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {publishing ? "Publishing" : "Publish Drop"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
