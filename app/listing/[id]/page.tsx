import { notFound } from "next/navigation";

import { ListingDetailView } from "@/components/sections/listing-detail-view";
import { getAuthSession } from "@/lib/auth";
import { getListingDetail } from "@/lib/data";
import { isStripeCheckoutEnabled } from "@/lib/stripe";
import { getSellerPayoutState } from "@/lib/seller-payouts";

type ListingDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const session = await getAuthSession();
  const detail = await getListingDetail(params.id, session?.user.id, session?.user.role);

  if (!detail) {
    notFound();
  }

  const sellerPayoutState = await getSellerPayoutState(detail.listing.seller.id);
  const paymentsConfigured = isStripeCheckoutEnabled();
  const checkoutEnabled = paymentsConfigured && detail.listing.status === "ACTIVE" && sellerPayoutState.readyToReceivePayments;
  const checkoutIssue = !paymentsConfigured
    ? "payments_unavailable"
    : sellerPayoutState.readyToReceivePayments
      ? null
      : sellerPayoutState.status === "requires_reconnect"
        ? "seller_payouts_reconnect_required"
        : "seller_payouts_incomplete";

  return (
    <div className="container py-8">
      <ListingDetailView
        listing={detail.listing}
        isOwner={detail.isOwner}
        viewerIsAdmin={session?.user.role === "ADMIN"}
        viewerSignedIn={Boolean(session?.user.id)}
        viewerCanBuy={session?.user.canBuy ?? false}
        similar={detail.similarItems}
        checkoutState={{
          enabled: checkoutEnabled,
          issue: checkoutIssue
        }}
        saleContext={detail.saleContext}
      />
    </div>
  );
}
