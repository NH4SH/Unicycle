"use client";

import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { SellerNetworkCard } from "@/components/social/seller-network-card";
import { Button } from "@/components/ui/button";
import type { SellerNetworkProfile } from "@/lib/user-social";

type FollowDirection = "followers" | "following";

type FollowListClientProps = {
  userId: string;
  username: string;
  direction: FollowDirection;
  viewerSignedIn: boolean;
  initialItems: SellerNetworkProfile[];
  initialHasMore: boolean;
  initialPage: number;
};

export function FollowListClient({
  userId,
  username,
  direction,
  viewerSignedIn,
  initialItems,
  initialHasMore,
  initialPage
}: FollowListClientProps) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (pending || !hasMore) {
      return;
    }

    setPending(true);

    try {
      const response = await fetch(`/api/users/${userId}/${direction}?page=${page + 1}&limit=12`);
      const data = (await response.json().catch(() => null)) as
        | {
            message?: string;
            hasMore?: boolean;
            items?: SellerNetworkProfile[];
            page?: number;
          }
        | null;

      if (!response.ok || !data?.items) {
        throw new Error(data?.message || "Could not load more sellers.");
      }

      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const next = data.items?.filter((item) => !seen.has(item.id)) ?? [];
        return [...prev, ...next];
      });
      setPage(data.page ?? page + 1);
      setHasMore(Boolean(data.hasMore));
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load more sellers.");
    } finally {
      setPending(false);
    }
  }

  if (!items.length) {
    return (
      <EmptyState
        title={direction === "followers" ? "No followers yet" : "Not following anyone yet"}
        description={
          direction === "followers"
            ? `Once people start following @${username} for future drops, they’ll show up here.`
            : `Following sellers helps shape a cleaner feed of trusted closets and future drops.`
        }
        ctaHref="/market"
        ctaLabel="Explore closets"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((seller) => (
          <SellerNetworkCard key={seller.id} seller={seller} viewerSignedIn={viewerSignedIn} compact />
        ))}
      </div>

      {error ? (
        <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={() => void loadMore()} disabled={pending}>
            {pending ? "Loading more..." : `Load more ${direction}`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
