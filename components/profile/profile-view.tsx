"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ListingCard } from "@/components/cards/listing-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type ListingCardData } from "@/lib/data";

type ProfileViewProps = {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    username: string;
    bio: string | null;
    gradYear: number | null;
    favoritePickup: string | null;
    instagram: string | null;
  };
  stats: {
    active: number;
    sold: number;
    favoritesReceived: number;
  };
  activeListings: ListingCardData[];
  soldListings: ListingCardData[];
  favorites: ListingCardData[];
  isOwner: boolean;
};

export function ProfileView({
  user,
  stats,
  activeListings,
  soldListings,
  favorites,
  isOwner
}: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    bio: user.bio ?? "",
    gradYear: user.gradYear?.toString() ?? "",
    favoritePickup: user.favoritePickup ?? "",
    instagram: user.instagram ?? ""
  });
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    setSaving(false);

    if (!response.ok) {
      toast.error("Could not update profile.");
      return;
    }

    toast.success("Profile updated.");
    setEditing(false);
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <Card className="border-border/80 bg-white/84">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-start">
            <Avatar className="h-20 w-20 border border-border">
              <AvatarImage src={user.image ?? undefined} alt={user.username} />
              <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="editorial-eyebrow">Profile</p>
                <h1 className="font-display text-4xl font-extrabold tracking-tight">{user.name || user.username}</h1>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
              {user.bio ? <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{user.bio}</p> : null}
              <div className="flex flex-wrap gap-2">
                {user.gradYear ? <Badge variant="outline">Class of {user.gradYear}</Badge> : null}
                {user.favoritePickup ? <Badge variant="blue">Usually meets at {user.favoritePickup}</Badge> : null}
                {user.instagram ? <Badge variant="orange">IG {user.instagram}</Badge> : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:w-[260px]">
              <div className="rounded-[1.3rem] border border-border bg-background/70 px-3 py-4 text-center">
                <p className="font-display text-2xl font-extrabold">{stats.active}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Active</p>
              </div>
              <div className="rounded-[1.3rem] border border-border bg-background/70 px-3 py-4 text-center">
                <p className="font-display text-2xl font-extrabold">{stats.sold}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sold</p>
              </div>
              <div className="rounded-[1.3rem] border border-border bg-background/70 px-3 py-4 text-center">
                <p className="font-display text-2xl font-extrabold">{stats.favoritesReceived}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Saved</p>
              </div>
            </div>
          </div>

          {isOwner ? (
            <div className="rounded-[1.7rem] border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold">Edit your profile</p>
                  <p className="text-sm text-muted-foreground">Keep your closet and meetup preferences current.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setEditing((prev) => !prev)}>
                  {editing ? "Close" : "Edit"}
                </Button>
              </div>

              {editing ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Bio</Label>
                    <Textarea value={form.bio} onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))} />
                  </div>
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
                  <div className="space-y-2 md:col-span-2">
                    <Label>Instagram handle</Label>
                    <Input
                      value={form.instagram}
                      onChange={(event) => setForm((prev) => ({ ...prev, instagram: event.target.value }))}
                    />
                  </div>
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
        <TabsList className="bg-white/80">
          <TabsTrigger value="active">Closet ({activeListings.length})</TabsTrigger>
          <TabsTrigger value="sold">Sold ({soldListings.length})</TabsTrigger>
          <TabsTrigger value="favorites">Saved ({favorites.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {activeListings.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {activeListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState title="No active listings" description="This closet is quiet right now. New finds will show up here as soon as they go live." />
          )}
        </TabsContent>
        <TabsContent value="sold">
          {soldListings.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {soldListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing sold yet" description="Sold pieces will show up here once this closet starts moving listings." />
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
