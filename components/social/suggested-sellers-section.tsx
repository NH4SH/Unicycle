import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SellerNetworkCard } from "@/components/social/seller-network-card";
import type { SellerNetworkProfile } from "@/lib/user-social";

type SuggestedSellersSectionProps = {
  title: string;
  subtitle: string;
  items: SellerNetworkProfile[];
  viewerSignedIn: boolean;
  ctaHref?: string;
  ctaLabel?: string;
};

export function SuggestedSellersSection({
  title,
  subtitle,
  items,
  viewerSignedIn,
  ctaHref,
  ctaLabel
}: SuggestedSellersSectionProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Seller discovery</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{subtitle}</p>
        </div>
        {ctaHref && ctaLabel ? (
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/88 transition hover:gap-3 hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((seller) => (
          <SellerNetworkCard key={seller.id} seller={seller} viewerSignedIn={viewerSignedIn} />
        ))}
      </div>
    </section>
  );
}
