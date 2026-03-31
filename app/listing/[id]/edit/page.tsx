import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ListingStatus } from "@prisma/client";

import { SellWizard } from "@/components/sell/sell-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { unpackListingDescription } from "@/lib/listing-draft";
import { prisma } from "@/lib/prisma";

type EditListingPageProps = {
  params: {
    id: string;
  };
};

export default async function EditListingPage({ params }: EditListingPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/listing/${params.id}/edit`)}`);
  }

  const listing = await prisma.listing.findUnique({
    where: {
      id: params.id
    }
  });

  if (!listing || listing.sellerId !== session.user.id) {
    notFound();
  }

  const structured = unpackListingDescription(listing.description);
  const locked = listing.status === ListingStatus.PENDING_CONFIRMATION || listing.status === ListingStatus.COMPLETED;

  return (
    <div className="container space-y-6 py-8 md:space-y-8 md:py-10">
      <div className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Edit listing</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Tighten the details before the next pickup.</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Update the photos, fit notes, price, and meetup plan while keeping the listing polished and easy for fellow Hoos to trust.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={listing.status === ListingStatus.ACTIVE ? "blue" : "outline"}>
            {listing.status === ListingStatus.ACTIVE ? "Live on HoosFinds" : listing.status.replaceAll("_", " ")}
          </Badge>
          <Button asChild variant="secondary">
            <Link href={`/listing/${listing.id}`}>Back to listing</Link>
          </Button>
        </div>
      </div>

      {locked ? (
        <Card className="surface-panel-strong">
          <CardContent className="space-y-3 p-5">
            <p className="font-display text-2xl font-bold tracking-tight">This listing is locked right now.</p>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Listings in a pending or completed handoff stay read-only so buyers and sellers see the same facts all the way through the transaction.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <SellWizard
        mode="edit"
        listingId={listing.id}
        locked={locked}
        initialDraft={{
          images: Array.isArray(listing.images) ? listing.images.filter((entry): entry is string => typeof entry === "string") : [],
          title: listing.title,
          description: structured.description,
          price: Math.round(listing.priceCents / 100).toString(),
          category: listing.category,
          condition: listing.condition,
          brand: structured.brand,
          size: structured.size,
          color: structured.color,
          pickupLocations: Array.isArray(listing.pickupLocations)
            ? listing.pickupLocations.filter((entry): entry is string => typeof entry === "string")
            : [],
          meetupNotes: listing.meetupNotes ?? "",
          status: listing.status === ListingStatus.CANCELLED ? "CANCELLED" : "ACTIVE"
        }}
      />
    </div>
  );
}
