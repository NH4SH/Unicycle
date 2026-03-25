import { notFound } from "next/navigation";

import { SellWizard } from "@/components/sell/sell-wizard";
import { getAuthSession } from "@/lib/auth";
import { getListingDetail } from "@/lib/data";

type EditListingPageProps = {
  params: { id: string };
};

export default async function EditListingPage({ params }: EditListingPageProps) {
  const session = await getAuthSession();
  if (!session?.user) notFound();

  const detail = await getListingDetail(params.id, session.user.id);
  if (!detail || !detail.isOwner) {
    notFound();
  }

  const listing = detail.listing;

  return (
    <div className="container space-y-6 py-8">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight">Edit listing</h1>
        <p className="text-sm text-muted-foreground">Update photos, details, and meetup spots.</p>
      </div>

      <SellWizard
        mode="edit"
        listingId={params.id}
        initialDraft={{
          images: listing.images,
          title: listing.title,
          description: listing.description,
          price: Math.round(listing.priceCents / 100).toString(),
          category: listing.category as unknown as string,
          condition: listing.condition as unknown as string,
          pickupLocations: listing.pickupLocations,
          meetupNotes: listing.meetupNotes ?? ""
        }}
      />
    </div>
  );
}

