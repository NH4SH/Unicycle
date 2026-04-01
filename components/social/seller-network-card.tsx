"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3, Sparkles, Users } from "lucide-react";

import { FollowButton } from "@/components/profile/follow-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { VerifiedShopBadge } from "@/components/shared/verified-shop-badge";
import { Badge } from "@/components/ui/badge";
import type { SellerNetworkProfile } from "@/lib/user-social";
import { cn, timeAgo } from "@/lib/utils";

type SellerNetworkCardProps = {
  seller: SellerNetworkProfile;
  viewerSignedIn: boolean;
  compact?: boolean;
  showReason?: boolean;
  className?: string;
};

export function SellerNetworkCard({
  seller,
  viewerSignedIn,
  compact = false,
  showReason = true,
  className
}: SellerNetworkCardProps) {
  const [followState, setFollowState] = useState({
    isFollowing: seller.isFollowing,
    followerCount: seller.followerCount
  });
  const styleTags = seller.styleTags.slice(0, compact ? 2 : 3);
  const isVerifiedShop = seller.sellerKind === "VERIFIED_SHOP" && Boolean(seller.verifiedShopApprovedAt);

  useEffect(() => {
    setFollowState({
      isFollowing: seller.isFollowing,
      followerCount: seller.followerCount
    });
  }, [seller.followerCount, seller.isFollowing]);

  return (
    <article className={cn("surface-panel-strong overflow-hidden p-5", compact ? "rounded-[1.55rem]" : "rounded-[1.85rem]", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={seller.name}
              username={seller.username}
              imageUrl={seller.profileImageUrl}
              className={compact ? "h-11 w-11" : "h-14 w-14"}
              fallbackClassName={compact ? "text-sm" : "text-base"}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/u/${seller.username}`} className="font-display text-xl font-bold tracking-tight hover:text-uva-orange">
                  {seller.displayName}
                </Link>
                {isVerifiedShop ? <VerifiedShopBadge className="px-2 py-1 text-[10px]" /> : null}
                {seller.publicUsername ? <span className="text-sm text-muted-foreground">@{seller.publicUsername}</span> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {followState.followerCount} followers
                </span>
                <span>{seller.activeListingCount} live drops</span>
                {seller.recentDropAt ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {timeAgo(seller.recentDropAt)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {!seller.isSelf ? (
          <FollowButton
            profileUserId={seller.id}
            profileUsername={seller.username}
            viewerSignedIn={viewerSignedIn}
            initialIsFollowing={followState.isFollowing}
            initialFollowerCount={followState.followerCount}
            followLabel="Follow for drops"
            followingLabel="Following"
            unfollowLabel="Unfollow"
            callbackUrl={`/u/${seller.username}`}
            className={compact ? "px-4" : undefined}
            onFollowStateChange={setFollowState}
          />
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {seller.bio || "Fresh closet, local pickup, and a sharp eye for what moves on Grounds."}
          </p>
          {showReason && seller.reason ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-uva-orange/20 bg-uva-orange/7 px-3 py-1.5 text-xs font-medium text-uva-orange">
              <Sparkles className="h-3.5 w-3.5" />
              {seller.reason}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {styleTags.length ? (
            styleTags.map((tag) => (
              <Badge key={tag} variant="outline" className="bg-card/70 text-foreground/90">
                {tag}
              </Badge>
            ))
          ) : (
            <Badge variant="blue">Curated closet</Badge>
          )}
          {isVerifiedShop ? <Badge variant="outline">Reviewed local partner</Badge> : null}
          {seller.favoritePickup ? <Badge variant="orange">Meets at {seller.favoritePickup}</Badge> : null}
          {seller.mutualCount > 0 ? <Badge variant="blue">{seller.mutualCount} mutuals</Badge> : null}
        </div>

        <Link
          href={`/u/${seller.username}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/88 transition hover:gap-3 hover:text-foreground dark:text-white/92 dark:hover:text-white"
        >
          {isVerifiedShop ? "View shop" : "View closet"} <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
