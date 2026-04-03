CREATE TYPE "ListingBrowseLane" AS ENUM ('WOMENS', 'MENS', 'VINTAGE', 'STREETWEAR', 'SHOES', 'ACCESSORIES', 'DORM', 'TECH', 'TEXTBOOKS', 'FURNITURE', 'TICKETS', 'EXTRAS');

ALTER TABLE "Listing"
ADD COLUMN "shoppingLane" "ListingBrowseLane";

CREATE INDEX "Listing_shoppingLane_idx" ON "Listing"("shoppingLane");
