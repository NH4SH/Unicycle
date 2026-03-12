import { redirect } from "next/navigation";

import { ListingCard } from "@/components/cards/listing-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getAuthSession } from "@/lib/auth";
import { getUserFavorites } from "@/lib/data";

export default async function FavoritesPage() {
  const session = await getAuthSession();

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  const favorites = await getUserFavorites(session.user.id);

  return (
    <div className="container space-y-5 py-8">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight">Favorites</h1>
        <p className="text-sm text-muted-foreground">Your saved drops and potential steals.</p>
      </div>

      {favorites.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {favorites.map((listing) => (
            <ListingCard key={listing.id} listing={listing} sticker="Steal" />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing saved yet"
          description="Tap the heart on any listing to keep track of your favorites."
          ctaHref="/market"
          ctaLabel="Explore marketplace"
        />
      )}
    </div>
  );
}
