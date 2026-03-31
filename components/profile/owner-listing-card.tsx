"use client";

import Link from "next/link";

import { ListingCard } from "@/components/cards/listing-card";
import { Button } from "@/components/ui/button";
import type { ListingCardData } from "@/lib/data";

export function OwnerListingCard({ listing }: { listing: ListingCardData }) {
  const locked = listing.status === "PENDING_CONFIRMATION" || listing.status === "COMPLETED";

  return (
    <div className="space-y-3">
      <ListingCard listing={listing} />
      <div className="flex items-center justify-between gap-3 px-1">
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/listing/${listing.id}/edit`}>Edit listing</Link>
        </Button>
        {locked ? (
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {listing.status === "PENDING_CONFIRMATION" ? "Sale flow locked" : "Completed sale"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
