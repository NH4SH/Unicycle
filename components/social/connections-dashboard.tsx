"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { SellerNetworkCard } from "@/components/social/seller-network-card";
import { SuggestedSellersSection } from "@/components/social/suggested-sellers-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FollowListResult, SellerNetworkProfile } from "@/lib/user-social";

type ConnectionsDashboardProps = {
  user: {
    id: string;
    username: string;
    name: string | null;
    displayName: string;
    publicUsername: string | null;
  };
  viewerSignedIn: boolean;
  isSelf: boolean;
  initialTab: "followers" | "following";
  social: {
    followerCount: number;
    followingCount: number;
    activeListingCount: number;
    mutualCount: number;
  };
  initialFollowers: FollowListResult;
  initialFollowing: FollowListResult;
  suggested: SellerNetworkProfile[];
};

type FollowDirection = "followers" | "following";

type TabState = {
  items: SellerNetworkProfile[];
  page: number;
  hasMore: boolean;
  total: number;
};

function matchesSearch(item: SellerNetworkProfile, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    item.name ?? "",
    item.username,
    item.bio ?? "",
    item.favoritePickup ?? "",
    item.reason ?? "",
    ...item.styleTags
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function ConnectionsDashboard({
  user,
  viewerSignedIn,
  isSelf,
  initialTab,
  social,
  initialFollowers,
  initialFollowing,
  suggested
}: ConnectionsDashboardProps) {
  const [tab, setTab] = useState<FollowDirection>(initialTab);
  const [search, setSearch] = useState("");
  const [followers, setFollowers] = useState<TabState>({
    items: initialFollowers.items,
    page: initialFollowers.page,
    hasMore: initialFollowers.hasMore,
    total: initialFollowers.total
  });
  const [following, setFollowing] = useState<TabState>({
    items: initialFollowing.items,
    page: initialFollowing.page,
    hasMore: initialFollowing.hasMore,
    total: initialFollowing.total
  });
  const [pendingTab, setPendingTab] = useState<FollowDirection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  }, [tab]);

  const currentState = tab === "followers" ? followers : following;
  const filteredItems = useMemo(
    () => currentState.items.filter((item) => matchesSearch(item, search)),
    [currentState.items, search]
  );

  async function loadMore(direction: FollowDirection) {
    const state = direction === "followers" ? followers : following;

    if (pendingTab || !state.hasMore) {
      return;
    }

    setPendingTab(direction);

    try {
      const response = await fetch(`/api/users/${user.id}/${direction}?page=${state.page + 1}&limit=12`);
      const data = (await response.json().catch(() => null)) as
        | {
            message?: string;
            total?: number;
            page?: number;
            hasMore?: boolean;
            items?: SellerNetworkProfile[];
          }
        | null;

      if (!response.ok || !data?.items) {
        throw new Error(data?.message || "Could not load more sellers.");
      }

      const updater = (previous: TabState): TabState => {
        const seen = new Set(previous.items.map((item) => item.id));
        const nextItems = data.items?.filter((item) => !seen.has(item.id)) ?? [];

        return {
          items: [...previous.items, ...nextItems],
          page: data.page ?? previous.page + 1,
          hasMore: Boolean(data.hasMore),
          total: data.total ?? previous.total
        };
      };

      if (direction === "followers") {
        setFollowers(updater);
      } else {
        setFollowing(updater);
      }

      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load more sellers.");
    } finally {
      setPendingTab(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-inset rounded-[1.45rem] px-4 py-5">
          <p className="font-display text-3xl font-extrabold">{social.followerCount}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Followers</p>
        </div>
        <div className="surface-inset rounded-[1.45rem] px-4 py-5">
          <p className="font-display text-3xl font-extrabold">{social.followingCount}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Following</p>
        </div>
        <div className="surface-inset rounded-[1.45rem] px-4 py-5">
          <p className="font-display text-3xl font-extrabold">{social.activeListingCount}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Active drops</p>
        </div>
        <div className="surface-inset rounded-[1.45rem] px-4 py-5">
          <p className="font-display text-3xl font-extrabold">{social.mutualCount}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Mutuals</p>
        </div>
      </div>

      <div className="surface-panel-strong space-y-5 rounded-[1.9rem] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="editorial-eyebrow">Connections</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">
              {isSelf ? "Your follows" : `${user.displayName}'s network`}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              {isSelf
                ? "Track the sellers you trust, see who keeps up with your closet, and shape a smarter feed for future drops."
                : `Browse the closets and followers shaping ${user.displayName}'s HoosFinds presence.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isSelf ? (
              <Button variant="secondary" asChild>
                <Link href="/following">Open your feed</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/u/${user.username}`}>
                Back to closet <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
            placeholder={`Search ${tab === "followers" ? "followers" : "following"} by name, username, style, or pickup spot...`}
            aria-label="Search network"
          />
        </label>

        <Tabs value={tab} onValueChange={(value) => setTab(value as FollowDirection)} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="followers">Followers ({followers.total})</TabsTrigger>
            <TabsTrigger value="following">Following ({following.total})</TabsTrigger>
          </TabsList>

          {(["followers", "following"] as const).map((direction) => {
            const state = direction === "followers" ? followers : following;
            const visibleItems = direction === tab ? filteredItems : state.items.filter((item) => matchesSearch(item, search));

            return (
              <TabsContent key={direction} value={direction} className="space-y-4">
                {visibleItems.length ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {visibleItems.map((seller) => (
                      <SellerNetworkCard key={seller.id} seller={seller} viewerSignedIn={viewerSignedIn} compact />
                    ))}
                  </div>
                ) : search.trim() ? (
                  <EmptyState
                    title={`No ${direction} match that search`}
                    description="Try a username, a style tag, or a pickup spot instead."
                  />
                ) : (
                  <EmptyState
                    title={direction === "followers" ? "No followers yet" : "Not following anyone yet"}
                    description={
                      direction === "followers"
                        ? `Once people start following ${user.displayName} for drops, they’ll show up here.`
                        : "Following sellers keeps their newest listings close instead of getting buried in the full marketplace."
                    }
                    ctaHref="/market"
                    ctaLabel="Explore closets"
                  />
                )}

                {error && direction === tab ? (
                  <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                {state.hasMore && !search.trim() ? (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => void loadMore(direction)}
                      disabled={pendingTab !== null}
                    >
                      {pendingTab === direction ? "Loading more..." : `Load more ${direction}`}
                    </Button>
                  </div>
                ) : null}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {suggested.length ? (
        <SuggestedSellersSection
          title="Suggested sellers"
          subtitle="Fashion-forward UVA closets worth adding to your network if you want a sharper feed."
          items={suggested}
          viewerSignedIn={viewerSignedIn}
        />
      ) : (
        <div className="surface-panel-strong rounded-[1.85rem] p-6">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-uva-orange" />
            More seller suggestions will show up here as the campus network grows.
          </div>
        </div>
      )}
    </div>
  );
}
