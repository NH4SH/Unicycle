import { Category } from "@prisma/client";

type ListingStyleSource = {
  category: Category;
  title: string;
  description: string | null;
};

export const FASHION_STYLE_TAGS = [
  "Vintage",
  "Streetwear",
  "Outerwear",
  "Accessories",
  "Shoes"
] as const;

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function isFashionCategory(category: Category) {
  return category === Category.STREETWEAR || category === Category.MISC;
}

export function isFashionFocusedListing(listing: ListingStyleSource) {
  const haystack = `${listing.title} ${listing.description ?? ""}`.toLowerCase();

  return (
    isFashionCategory(listing.category) ||
    hasKeyword(haystack, [
      "vintage",
      "streetwear",
      "hoodie",
      "jacket",
      "puffer",
      "coat",
      "fleece",
      "crewneck",
      "sneaker",
      "shoe",
      "boot",
      "loafer",
      "bag",
      "belt bag",
      "jewelry",
      "hat",
      "cap",
      "shell",
      "outerwear",
      "windbreaker"
    ])
  );
}

export function deriveStyleTagsFromListings(listings: ListingStyleSource[]) {
  const scores = new Map<(typeof FASHION_STYLE_TAGS)[number], number>();

  for (const listing of listings) {
    const text = `${listing.title} ${listing.description ?? ""}`.toLowerCase();

    if (listing.category === Category.STREETWEAR) {
      scores.set("Streetwear", (scores.get("Streetwear") ?? 0) + 2);
    }

    if (listing.category === Category.MISC && hasKeyword(text, ["bag", "jewelry", "hat", "cap", "belt bag", "accessory"])) {
      scores.set("Accessories", (scores.get("Accessories") ?? 0) + 3);
    }

    if (hasKeyword(text, ["vintage", "retro", "thrifted", "thrift", "faded", "worn-in"])) {
      scores.set("Vintage", (scores.get("Vintage") ?? 0) + 3);
    }

    if (hasKeyword(text, ["streetwear", "hoodie", "crewneck", "graphic tee", "denim", "cargo", "sweater"])) {
      scores.set("Streetwear", (scores.get("Streetwear") ?? 0) + 2);
    }

    if (hasKeyword(text, ["jacket", "coat", "outerwear", "puffer", "fleece", "shell", "barbour", "patagonia"])) {
      scores.set("Outerwear", (scores.get("Outerwear") ?? 0) + 3);
    }

    if (hasKeyword(text, ["sneaker", "sneakers", "shoe", "shoes", "boot", "boots", "loafer", "loafers"])) {
      scores.set("Shoes", (scores.get("Shoes") ?? 0) + 3);
    }
  }

  const ordered = [...scores.entries()]
    .sort((a, b) => {
      if (b[1] === a[1]) {
        return FASHION_STYLE_TAGS.indexOf(a[0]) - FASHION_STYLE_TAGS.indexOf(b[0]);
      }

      return b[1] - a[1];
    })
    .map(([tag]) => tag);

  if (!ordered.length && listings.some((listing) => listing.category === Category.STREETWEAR)) {
    ordered.push("Streetwear");
  }

  return ordered.slice(0, 3);
}

export function getFashionFocusScore(listings: ListingStyleSource[]) {
  if (!listings.length) return 0;

  const fashionListings = listings.filter(isFashionFocusedListing);
  return Number(((fashionListings.length / listings.length) * 100).toFixed(1));
}
