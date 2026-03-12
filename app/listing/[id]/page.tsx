import { notFound } from "next/navigation";

import { ListingDetailView } from "@/components/sections/listing-detail-view";
import { getAuthSession } from "@/lib/auth";
import { getListingDetail } from "@/lib/data";

type ListingDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const session = await getAuthSession();
  const detail = await getListingDetail(params.id, session?.user.id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="container py-8">
      <ListingDetailView listing={detail.listing} isOwner={detail.isOwner} similar={detail.similarItems} />
    </div>
  );
}
