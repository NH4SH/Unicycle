DO $$
BEGIN
  CREATE TYPE "ListingBrowseLane" AS ENUM (
    'WOMENS',
    'MENS',
    'VINTAGE',
    'STREETWEAR',
    'SHOES',
    'ACCESSORIES',
    'DORM',
    'TECH',
    'TEXTBOOKS',
    'FURNITURE',
    'TICKETS',
    'EXTRAS'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "Listing"
ADD COLUMN IF NOT EXISTS "shoppingLane" "ListingBrowseLane";

CREATE INDEX IF NOT EXISTS "Listing_shoppingLane_idx" ON "Listing"("shoppingLane");
