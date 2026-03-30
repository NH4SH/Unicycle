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
    <div className="container space-y-6 py-8 md:space-y-8 md:py-10">
      <div className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Saved on HoosFinds</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Your saved finds.</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Keep the jackets, sneakers, game day pieces, and campus finds you don&apos;t want to lose track of.
          </p>
        </div>
        <div className="surface-pill px-4 py-2 text-xs uppercase tracking-[0.18em]">
          Built for style-led browsing
        </div>
      </div>

      {favorites.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {favorites.map((listing) => (
            <ListingCard key={listing.id} listing={listing} sticker="Saved" />
          ))}
        </div>
      ) : (
        <EmptyState
          title="You haven&apos;t saved any finds yet"
          description="Tap the heart on a listing to keep a running shortlist of fits, pickups, and campus finds worth coming back to."
          ctaHref="/market"
          ctaLabel="Browse HoosFinds"
        />
      )}
    </div>
  );
}
