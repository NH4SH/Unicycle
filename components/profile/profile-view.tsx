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
    <div className="space-y-6">
      <Card className="border-white bg-white">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image ?? undefined} alt={user.username} />
              <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="font-display text-3xl font-black tracking-tight">{user.name || user.username}</h1>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              {user.bio ? <p className="max-w-2xl text-sm text-muted-foreground">{user.bio}</p> : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {user.gradYear ? <Badge variant="orange">Class of {user.gradYear}</Badge> : null}
                {user.favoritePickup ? <Badge variant="blue">Fav spot: {user.favoritePickup}</Badge> : null}
                {user.instagram ? <Badge>IG {user.instagram}</Badge> : null}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <div className="rounded-2xl bg-secondary px-3 py-2 text-center">
                <p className="font-display text-lg font-black">{stats.active}</p>
                <p className="text-[11px] uppercase text-muted-foreground">Active</p>
              </div>
              <div className="rounded-2xl bg-secondary px-3 py-2 text-center">
                <p className="font-display text-lg font-black">{stats.sold}</p>
                <p className="text-[11px] uppercase text-muted-foreground">Sold</p>
              </div>
              <div className="rounded-2xl bg-secondary px-3 py-2 text-center">
                <p className="font-display text-lg font-black">{stats.favoritesReceived}</p>
                <p className="text-[11px] uppercase text-muted-foreground">Saves</p>
              </div>
            </div>
          </div>

          {isOwner ? (
            <div className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Edit profile</p>
                <Button variant="secondary" size="sm" onClick={() => setEditing((prev) => !prev)}>
                  {editing ? "Close" : "Edit"}
                </Button>
              </div>
              {editing ? (
                <div className="grid gap-3 md:grid-cols-2">
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
        <TabsList>
          <TabsTrigger value="active">Active ({activeListings.length})</TabsTrigger>
          <TabsTrigger value="sold">Sold ({soldListings.length})</TabsTrigger>
          <TabsTrigger value="favorites">Favorites ({favorites.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {activeListings.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {activeListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState title="No active listings" description="This user has no active items right now." />
          )}
        </TabsContent>
        <TabsContent value="sold">
          {soldListings.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {soldListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing sold yet" description="Sold listings will appear here." />
          )}
        </TabsContent>
        <TabsContent value="favorites">
          {favorites.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {favorites.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState title="No favorites yet" description="Saved drops will show up here." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
