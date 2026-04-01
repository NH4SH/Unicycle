"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { LinkedPlaceText } from "@/components/shared/linked-place-text";
import { StarRatingInput } from "@/components/transactions/star-rating-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PurchaseSummaryData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export function ConfirmReceiptForm({ transaction }: { transaction: PurchaseSummaryData }) {
  const router = useRouter();
  const [stars, setStars] = useState(transaction.review?.stars ?? 0);
  const [comment, setComment] = useState(transaction.review?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submitConfirmation() {
    if (comment.trim() && !stars) {
      toast.error("Add a star rating if you want to leave written feedback.");
      return;
    }

    setSubmitting(true);
    const response = await fetch(`/api/transactions/${transaction.id}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stars: stars || undefined,
        comment: comment.trim() || undefined
      })
    });
    setSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not confirm this handoff.");
      return;
    }

    toast.success("Receipt confirmed. Thanks for closing the loop.");
    router.push("/purchases?confirmed=1");
    router.refresh();
  }

  return (
    <div className="container max-w-3xl space-y-6 py-8 md:py-10">
      <div className="space-y-3 border-b border-border/80 pb-6">
        <p className="editorial-eyebrow">Confirm receipt</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Did you receive this item?</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Once you confirm, HoosFinds finalizes the transaction and unlocks the buyer-only seller rating tied to this handoff.
        </p>
      </div>

      <Card className="surface-panel-strong overflow-hidden">
        <CardContent className="space-y-6 p-6 md:p-7">
          <div className="grid gap-4 md:grid-cols-[116px_1fr] md:items-center">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-border/80 bg-card">
              <Image
                src={transaction.listing.images[0] || "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"}
                alt={transaction.listing.title}
                fill
                className="object-cover"
                sizes="116px"
              />
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="blue">Pending confirmation</Badge>
                <Badge variant="outline">{formatCurrency(transaction.agreedPriceCents / 100)}</Badge>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold tracking-tight">{transaction.listing.title}</p>
                <p className="text-sm text-muted-foreground">
                  Seller: {transaction.counterparty.displayName}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-uva-orange/15 bg-uva-orange/6 p-4 text-sm leading-6 text-foreground/88">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-uva-orange" />
              <p>
                Confirming here marks the transaction complete. Leaving a rating is optional, but it helps other students know who follows through after a real handoff on{" "}
                <LinkedPlaceText text="Grounds" />.
              </p>
            </div>
          </div>

          <StarRatingInput value={stars} onChange={setStars} />

          <div className="space-y-2">
            <Label htmlFor="review-comment">Quick note</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Optional. Was pickup easy? Was the item as described?"
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">Skip this if you just want to confirm receipt and move on.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void submitConfirmation()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {stars ? "Confirm + submit rating" : "Confirm receipt"}
            </Button>
            {transaction.conversationId ? (
              <Button variant="secondary" asChild>
                <Link href={`/messages?conversation=${transaction.conversationId}`}>
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  Back to messages
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
