"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock3, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";

import { ListingCard } from "@/components/cards/listing-card";
import { FollowButton } from "@/components/profile/follow-button";
import { OwnerListingCard } from "@/components/profile/owner-listing-card";
import { ProfileImagePicker } from "@/components/profile/profile-image-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkedPlaceText, PlaceMapLink } from "@/components/shared/linked-place-text";
import { UserAvatar } from "@/components/shared/user-avatar";
import { VerifiedShopBadge } from "@/components/shared/verified-shop-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type ListingCardData, type SellerReviewData } from "@/lib/data";
import { getEditableDisplayName, needsPublicIdentitySetup } from "@/lib/user-identity";
import { timeAgo } from "@/lib/utils";

type ProfileViewProps = {
  user: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
    username: string;
    usernameConfirmed: boolean;
    displayName: string;
    publicUsername: string | null;
    bio: string | null;
    gradYear: number | null;
    favoritePickup: string | null;
    sellerKind: "STUDENT" | "VERIFIED_SHOP";
    verifiedShopName: string | null;
    verifiedShopApprovedAt: string | null;
    verifiedShopNeighborhood: string | null;
    verifiedShopAddress: string | null;
    verifiedShopInstagram: string | null;
    verifiedShopWebsite: string | null;
  };
  social: {
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
    isSelf: boolean;
    mutualCount: number;
    styleTags: string[];
    activeListingCount: number;
    recentDropAt: string | null;
  };
  stats: {
    active: number;
    pending: number;
    completed: number;
    cancelled: number;
    favoritesReceived: number;
    averageRating: number | null;
    reviewCount: number;
    completedSales: number;
  };
  activeListings: ListingCardData[];
  pastListings: ListingCardData[];
  favorites: ListingCardData[];
  recentReviews: SellerReviewData[];
  isOwner: boolean;
  viewerSignedIn: boolean;
};

export function ProfileView({
  user,
  social,
  stats,
  activeListings,
  pastListings,
  favorites,
  recentReviews,
  isOwner,
  viewerSignedIn
}: ProfileViewProps) {
  const editableDisplayName = getEditableDisplayName(user);
  const needsIdentitySetup = isOwner && needsPublicIdentitySetup(user);
  const [editing, setEditing] = useState(needsIdentitySetup);
  const [form, setForm] = useState({
    name: editableDisplayName,
    username: user.publicUsername ?? "",
    profileImageUrl: user.profileImageUrl ?? "",
    bio: user.bio ?? "",
    gradYear: user.gradYear?.toString() ?? "",
    favoritePickup: user.favoritePickup ?? "",
    verifiedShopNeighborhood: user.verifiedShopNeighborhood ?? "",
    verifiedShopAddress: user.verifiedShopAddress ?? "",
    verifiedShopInstagram: user.verifiedShopInstagram ?? "",
    verifiedShopWebsite: user.verifiedShopWebsite ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [followState, setFollowState] = useState(social);
  const isVerifiedShop = user.sellerKind === "VERIFIED_SHOP" && Boolean(user.verifiedShopApprovedAt);
  const inventoryLabel = isVerifiedShop ? "Shop" : "Closet";

  async function saveProfile() {
    setSaving(true);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    setSaving(false);

    if (response.ok === false) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not update profile.");
      return;
    }

    toast.success("Profile updated.");
    setEditing(false);
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <Card className="surface-panel-strong">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-start">
            <UserAvatar name={user.displayName} username={user.username} imageUrl={form.profileImageUrl || null} className="h-20 w-20" fallbackClassName="text-lg" />

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="editorial-eyebrow">Profile</p>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-4xl font-extrabold tracking-tight">{user.displayName}</h1>
                  {isVerifiedShop ? <VerifiedShopBadge /> : null}
                </div>
                {user.publicUsername ? (
                  <p className="text-sm text-muted-foreground">@{user.publicUsername}</p>
                ) : isOwner ? (
                  <p className="text-sm text-muted-foreground">Choose a public username so buyers can recognize your profile.</p>
                ) : null}
              </div>
              {user.bio ? <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{user.bio}</p> : null}
              {!isOwner && followState.mutualCount > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-uva-orange/20 bg-uva-orange/7 px-3 py-1.5 text-xs font-medium text-uva-orange">
                  <Sparkles className="h-3.5 w-3.5" />
                  {followState.mutualCount} people you follow also follow this {isVerifiedShop ? "shop" : "closet"}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {isVerifiedShop ? <Badge variant="blue">Reviewed local partner</Badge> : null}
                {user.gradYear ? <Badge variant="outline">Class of {user.gradYear}</Badge> : null}
                {user.favoritePickup ? (
                  <Badge variant="blue">
                    Usually meets at{" "}
                    <PlaceMapLink
                      place={user.favoritePickup}
                      className="font-medium text-current underline decoration-current/40 underline-offset-4 hover:text-foreground dark:hover:text-white"
                    >
                      {user.favoritePickup}
                    </PlaceMapLink>
                  </Badge>
                ) : null}
                {isVerifiedShop && user.verifiedShopNeighborhood ? <Badge variant="outline">{user.verifiedShopNeighborhood}</Badge> : null}
                {isVerifiedShop && user.verifiedShopInstagram ? <Badge variant="outline">{user.verifiedShopInstagram}</Badge> : null}
                {isVerifiedShop && user.verifiedShopWebsite ? (
                  <Badge variant="outline">
                    <a href={user.verifiedShopWebsite} target="_blank" rel="noreferrer" className="hover:text-foreground">
                      Website
                    </a>
                  </Badge>
                ) : null}
                <Link
                  href={`/u/${user.username}/connections?tab=followers`}
                  className="surface-chip touch-chip inline-flex items-center text-sm font-medium text-foreground/86 hover:border-uva-orange/35 hover:text-uva-orange dark:text-white/88"
                >
                  {followState.followerCount} followers
                </Link>
                <Link
                  href={`/u/${user.username}/connections?tab=following`}
                  className="surface-chip touch-chip inline-flex items-center text-sm font-medium text-foreground/86 hover:border-uva-orange/35 hover:text-uva-orange dark:text-white/88"
                >
                  {followState.followingCount} following
                </Link>
                {followState.recentDropAt ? (
                  <Badge variant="outline" className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    Last drop {timeAgo(followState.recentDropAt)}
                  </Badge>
                ) : null}
                {stats.pending > 0 ? <Badge variant="blue">{stats.pending} awaiting confirmation</Badge> : null}
                {stats.cancelled > 0 ? <Badge variant="outline">{stats.cancelled} cancelled handoffs</Badge> : null}
                {followState.styleTags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:w-[320px]">
              {!isOwner ? (
                <div className="col-span-2 flex justify-end">
                  <FollowButton
                    profileUserId={user.id}
                    profileUsername={user.username}
                    viewerSignedIn={viewerSignedIn}
                    initialIsFollowing={social.isFollowing}
                    initialFollowerCount={social.followerCount}
                    onFollowStateChange={(next) => setFollowState((prev) => ({ ...prev, ...next }))}
                    followLabel="Follow for drops"
                    callbackUrl={`/u/${user.username}`}
                  />
                </div>
              ) : null}
              <div className="surface-inset rounded-[1.3rem] px-3 py-4 text-center">
                <p className="font-display text-2xl font-extrabold">{stats.active}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Active</p>
              </div>
              <div className="surface-inset rounded-[1.3rem] px-3 py-4 text-center">
                <p className="font-display text-2xl font-extrabold">{stats.completedSales}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Confirmed sales</p>
              </div>
              <div className="surface-inset rounded-[1.3rem] px-3 py-4 text-center">
                <p className="inline-flex items-center gap-1 font-display text-2xl font-extrabold">
                  {stats.averageRating ? <Star className="h-4 w-4 fill-uva-orange text-uva-orange" /> : null}
                  {stats.averageRating ? stats.averageRating.toFixed(1) : "New"}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{stats.reviewCount} buyer ratings</p>
              </div>
              <div className="surface-inset rounded-[1.3rem] px-3 py-4 text-center">
                <p className="font-display text-2xl font-extrabold">{stats.favoritesReceived}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Saved</p>
              </div>
            </div>
          </div>

          {recentReviews.length ? (
            <div className="surface-inset rounded-[1.7rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold">Buyer-verified ratings</p>
                  <p className="text-sm text-muted-foreground">Only buyers from completed HoosFinds transactions can rate a seller here.</p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-uva-orange text-uva-orange" />
                  {stats.averageRating ? `${stats.averageRating.toFixed(1)} avg` : "New seller"}
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recentReviews.map((review) => (
                  <div key={review.id} className="surface-subtle rounded-[1.35rem] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={review.reviewer.name}
                          username={review.reviewer.username}
                          imageUrl={review.reviewer.profileImageUrl}
                          className="h-10 w-10"
                        />
                        <div>
                          <p className="font-medium text-foreground">{review.reviewer.displayName}</p>
                          {review.reviewer.publicUsername ? <p className="text-xs text-muted-foreground">@{review.reviewer.publicUsername}</p> : null}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                        <Star className="h-4 w-4 fill-uva-orange text-uva-orange" />
                        {review.stars}
                      </div>
                    </div>
                    {review.comment ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        “<LinkedPlaceText text={review.comment} />”
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {review.listing ? <span>{review.listing.title}</span> : null}
                      <span>{timeAgo(review.createdAt)} ago</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {isOwner ? (
            <div className="surface-inset rounded-[1.7rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold">Edit your profile</p>
                  <p className="text-sm text-muted-foreground">
                    {isVerifiedShop ? "Keep your shop details current." : "Keep your closet and meetup preferences current."}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setEditing((prev) => !prev)}>
                  {editing ? "Close" : "Edit"}
                </Button>
              </div>

              {needsIdentitySetup ? (
                <div className="mt-4 rounded-[1.3rem] border border-uva-orange/20 bg-uva-orange/7 px-4 py-3 text-sm leading-6 text-uva-orange">
                  Pick a public display name and username so HoosFinds shows you like a real seller, not a UVA login.
                </div>
              ) : null}

              {editing ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <ProfileImagePicker
                      value={form.profileImageUrl}
                      name={user.displayName}
                      username={user.username}
                      disabled={saving}
                      onChange={(url) => setForm((prev) => ({ ...prev, profileImageUrl: url }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Display name</Label>
                    <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Username</Label>
                    <Input
                      value={form.username}
                      onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <p className="text-xs leading-6 text-muted-foreground">
                      This becomes your public profile URL at{" "}
                      <span className="font-medium text-foreground">/u/{form.username || user.publicUsername || "your-handle"}</span>.
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Bio</Label>
                    <Textarea value={form.bio} onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))} />
                  </div>
                  {isVerifiedShop ? (
                    <>
                      <div className="space-y-2">
                        <Label>Neighborhood</Label>
                        <Input
                          value={form.verifiedShopNeighborhood}
                          onChange={(event) => setForm((prev) => ({ ...prev, verifiedShopNeighborhood: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Exact address</Label>
                        <Input
                          value={form.verifiedShopAddress}
                          onChange={(event) => setForm((prev) => ({ ...prev, verifiedShopAddress: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Instagram</Label>
                        <Input
                          value={form.verifiedShopInstagram}
                          onChange={(event) => setForm((prev) => ({ ...prev, verifiedShopInstagram: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Website</Label>
                        <Input
                          value={form.verifiedShopWebsite}
                          onChange={(event) => setForm((prev) => ({ ...prev, verifiedShopWebsite: event.target.value }))}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Graduation year</Label>
                        <Input
                          value={form.gradYear}
                          onChange={(event) => setForm((prev) => ({ ...prev, gradYear: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Favorite pickup spot</Label>
                        <Input
                          value={form.favoritePickup}
                          onChange={(event) => setForm((prev) => ({ ...prev, favoritePickup: event.target.value }))}
                        />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <Button onClick={saveProfile} disabled={saving}>
                      {saving ? "Saving..." : "Save profile"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">{inventoryLabel} ({activeListings.length})</TabsTrigger>
          <TabsTrigger value="past">Past sales ({pastListings.length})</TabsTrigger>
          <TabsTrigger value="favorites">Saved ({favorites.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {activeListings.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {activeListings.map((listing) => (
                isOwner ? <OwnerListingCard key={listing.id} listing={listing} /> : <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active listings"
              description={
                isVerifiedShop
                  ? "This shop is quiet right now. New finds will show up here as soon as they go live."
                  : "This closet is quiet right now. New finds will show up here as soon as they go live."
              }
            />
          )}
        </TabsContent>
        <TabsContent value="past">
          {pastListings.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {pastListings.map((listing) => (
                isOwner ? <OwnerListingCard key={listing.id} listing={listing} /> : <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No past sales yet"
              description={
                isVerifiedShop
                  ? "Pending, completed, and cancelled listings will show up here once this shop starts moving items."
                  : "Pending, completed, and cancelled listings will show up here once this closet starts moving items."
              }
            />
          )}
        </TabsContent>
        <TabsContent value="favorites">
          {favorites.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {favorites.map((listing) => (
                <ListingCard key={listing.id} listing={listing} sticker="Saved" />
              ))}
            </div>
          ) : (
            <EmptyState title="No saved finds yet" description="Saved pieces will show up here so this user can come back to them quickly." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
