import type { Category } from "@prisma/client";

import { unpackListingDescription } from "@/lib/listing-draft";

export type MarketBrowseLaneId =
  | "womens"
  | "mens"
  | "vintage"
  | "streetwear"
  | "game-day"
  | "shoes"
  | "accessories"
  | "dorm"
  | "tech"
  | "textbooks"
  | "furniture"
  | "tickets"
  | "extras";

export type MarketBrowsePill = {
  id: MarketBrowseLaneId;
  label: string;
  description: string;
};

export const PRIMARY_MARKET_BROWSE_PILLS: readonly MarketBrowsePill[] = [
  {
    id: "womens",
    label: "Women's",
    description: "Going-out pieces, denim, bags, and campus-ready staples."
  },
  {
    id: "mens",
    label: "Men's",
    description: "Crewnecks, layers, jackets, and everyday fits."
  },
  {
    id: "vintage",
    label: "Vintage",
    description: "Thrifted textures, faded sweats, and worn-in classics."
  },
  {
    id: "streetwear",
    label: "Streetwear",
    description: "Graphic layers, hoodies, puffers, and statement pieces."
  },
  {
    id: "game-day",
    label: "Game Day",
    description: "Orange-and-blue layers and football Saturday energy."
  },
  {
    id: "shoes",
    label: "Shoes",
    description: "Sneakers, boots, and pairs worth crossing Grounds for."
  },
  {
    id: "accessories",
    label: "Accessories",
    description: "Bags, jewelry, caps, and the pieces that finish the look."
  }
] as const;

export const SECONDARY_MARKET_BROWSE_PILLS: readonly MarketBrowsePill[] = [
  {
    id: "dorm",
    label: "Dorm",
    description: "The practical room finds people still need between semesters."
  },
  {
    id: "tech",
    label: "Tech",
    description: "Headphones, monitors, and setup gear with quick local pickup."
  },
  {
    id: "textbooks",
    label: "Textbooks",
    description: "Class essentials and study gear without bookstore pricing."
  },
  {
    id: "furniture",
    label: "Furniture",
    description: "Mirrors, shelves, chairs, and the bigger room-refresh pieces."
  },
  {
    id: "tickets",
    label: "Tickets",
    description: "Last-minute game and event passes still close to campus."
  },
  {
    id: "extras",
    label: "Extras",
    description: "The non-clothing oddities that still make student life easier."
  }
] as const;

type ListingBrowseSource = {
  title: string;
  description: string;
  category: Category | string;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
};

type ListingBrowseMeta = {
  brand: string;
  size: string;
  color: string;
  cleanDescription: string;
  haystack: string;
};

const KNOWN_BRANDS = [
  "Patagonia",
  "Barbour",
  "Arc'teryx",
  "Arcteryx",
  "North Face",
  "The North Face",
  "Lululemon",
  "Nike",
  "Adidas",
  "Veja",
  "New Balance",
  "Birkenstock",
  "Doc Martens",
  "Dr. Martens",
  "Coach",
  "Zara",
  "Aritzia",
  "Free People",
  "Levi's",
  "Ralph Lauren",
  "Carhartt",
  "Apple",
  "Sony",
  "Canon",
  "IKEA"
] as const;

const COLOR_KEYWORDS = [
  "black",
  "white",
  "cream",
  "ivory",
  "navy",
  "blue",
  "light blue",
  "orange",
  "green",
  "olive",
  "brown",
  "tan",
  "beige",
  "grey",
  "gray",
  "red",
  "burgundy",
  "pink",
  "purple",
  "silver",
  "gold"
] as const;

const ACCESSORY_KEYWORDS = [
  "accessory",
  "bag",
  "belt bag",
  "crossbody",
  "purse",
  "tote",
  "wallet",
  "jewelry",
  "necklace",
  "bracelet",
  "earring",
  "hat",
  "cap",
  "beanie",
  "scarf",
  "sunglasses"
] as const;

const SHOE_KEYWORDS = [
  "shoe",
  "shoes",
  "sneaker",
  "sneakers",
  "boot",
  "boots",
  "loafer",
  "loafers",
  "heel",
  "heels",
  "trainer",
  "clog",
  "clogs"
] as const;

const VINTAGE_KEYWORDS = ["vintage", "retro", "thrifted", "worn-in", "faded"] as const;
const STREETWEAR_KEYWORDS = [
  "streetwear",
  "hoodie",
  "crewneck",
  "graphic",
  "denim",
  "cargo",
  "jacket",
  "coat",
  "fleece",
  "puffer",
  "quarter-zip",
  "quarter zip",
  "outerwear"
] as const;
const GAME_DAY_KEYWORDS = [
  "game day",
  "gameday",
  "uva",
  "tailgate",
  "pregame",
  "stadium",
  "football saturday",
  "orange-and-blue",
  "orange and blue"
] as const;
const WOMENS_KEYWORDS = [
  "women's",
  "womens",
  "women",
  "dress",
  "skirt",
  "going-out",
  "going out",
  "bodysuit",
  "heels",
  "purse",
  "lululemon",
  "aritzia",
  "zara",
  "top"
] as const;
const MENS_KEYWORDS = [
  "men's",
  "mens",
  "men",
  "barbour",
  "patagonia",
  "arc'teryx",
  "arcteryx",
  "north face",
  "crewneck",
  "quarter-zip",
  "quarter zip",
  "beanie"
] as const;
const FURNITURE_KEYWORDS = [
  "chair",
  "mirror",
  "rug",
  "shelf",
  "lamp",
  "desk",
  "fridge",
  "mini fridge",
  "nightstand",
  "dresser",
  "sofa",
  "couch",
  "table",
  "bed frame"
] as const;
const EXTRA_KEYWORDS = ["camera", "projector", "film", "skateboard", "board", "speaker", "console"] as const;
const FASHION_KEYWORDS = [
  ...VINTAGE_KEYWORDS,
  ...STREETWEAR_KEYWORDS,
  ...GAME_DAY_KEYWORDS,
  ...SHOE_KEYWORDS,
  ...ACCESSORY_KEYWORDS,
  "sweater",
  "crew",
  "denim",
  "loafer",
  "fit"
] as const;

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeValue(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function toTitleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function hasKeyword(haystack: string, keywords: readonly string[]) {
  return keywords.some((keyword) => haystack.includes(keyword));
}

function inferBrand(source: ListingBrowseSource, haystack: string) {
  if (source.brand?.trim()) {
    return normalizeWhitespace(source.brand);
  }

  for (const brand of KNOWN_BRANDS) {
    if (haystack.includes(brand.toLowerCase())) {
      return brand === "The North Face" ? "North Face" : brand;
    }
  }

  return "";
}

function inferSize(source: ListingBrowseSource, haystack: string) {
  if (source.size?.trim()) {
    return normalizeWhitespace(source.size).toUpperCase();
  }

  const parenMatch = /\((xxs|xs|s|m|l|xl|xxl|xxxl|one size|os|\d{1,2}(?:\.\d)?)\)/i.exec(source.title);
  if (parenMatch?.[1]) {
    const next = normalizeWhitespace(parenMatch[1]);
    return /\d/.test(next) ? next : next.toUpperCase();
  }

  const inlineMatch = /\b(size\s+)?(xxs|xs|s|m|l|xl|xxl|xxxl|one size|os)\b/i.exec(haystack);
  if (inlineMatch?.[2]) {
    const next = normalizeWhitespace(inlineMatch[2]);
    return next === "one size" ? "One Size" : next.toUpperCase();
  }

  return "";
}

function inferColor(source: ListingBrowseSource, haystack: string) {
  if (source.color?.trim()) {
    return toTitleCase(normalizeWhitespace(source.color));
  }

  for (const color of COLOR_KEYWORDS) {
    if (haystack.includes(color)) {
      return toTitleCase(color);
    }
  }

  return "";
}

export function getListingBrowseMeta(source: ListingBrowseSource): ListingBrowseMeta {
  const unpacked = unpackListingDescription(source.description);
  const cleanDescription = unpacked.description || source.description;
  const rawText = [source.title, cleanDescription, unpacked.brand, unpacked.size, unpacked.color].filter(Boolean).join(" ");
  const haystack = normalizeValue(rawText);

  return {
    brand: inferBrand({ ...source, brand: source.brand ?? unpacked.brand }, haystack),
    size: inferSize({ ...source, size: source.size ?? unpacked.size }, haystack),
    color: inferColor({ ...source, color: source.color ?? unpacked.color }, haystack),
    cleanDescription,
    haystack
  };
}

export function isAccessoryListing(source: ListingBrowseSource) {
  return hasKeyword(getListingBrowseMeta(source).haystack, ACCESSORY_KEYWORDS);
}

export function isShoeListing(source: ListingBrowseSource) {
  return hasKeyword(getListingBrowseMeta(source).haystack, SHOE_KEYWORDS);
}

export function isVintageListing(source: ListingBrowseSource) {
  return hasKeyword(getListingBrowseMeta(source).haystack, VINTAGE_KEYWORDS);
}

export function isStreetwearListing(source: ListingBrowseSource) {
  const meta = getListingBrowseMeta(source);
  return source.category === "STREETWEAR" || hasKeyword(meta.haystack, STREETWEAR_KEYWORDS);
}

export function isGameDayListing(source: ListingBrowseSource) {
  return hasKeyword(getListingBrowseMeta(source).haystack, GAME_DAY_KEYWORDS);
}

export function isFurnitureListing(source: ListingBrowseSource) {
  return source.category === "DORM" && hasKeyword(getListingBrowseMeta(source).haystack, FURNITURE_KEYWORDS);
}

export function isExtraListing(source: ListingBrowseSource) {
  const meta = getListingBrowseMeta(source);

  if (source.category === "MISC" && !isAccessoryListing(source)) {
    return true;
  }

  return source.category !== "STREETWEAR" && hasKeyword(meta.haystack, EXTRA_KEYWORDS);
}

export function isFashionBrowseListing(source: ListingBrowseSource) {
  const meta = getListingBrowseMeta(source);
  return source.category === "STREETWEAR" || source.category === "MISC" || hasKeyword(meta.haystack, FASHION_KEYWORDS);
}

export function matchesBrowseLane(source: ListingBrowseSource, lane: MarketBrowseLaneId) {
  const meta = getListingBrowseMeta(source);

  switch (lane) {
    case "womens":
      return (
        hasKeyword(meta.haystack, WOMENS_KEYWORDS) ||
        (["XXS", "XS", "S"].includes(meta.size) && isFashionBrowseListing(source)) ||
        (isAccessoryListing(source) && !hasKeyword(meta.haystack, MENS_KEYWORDS))
      );
    case "mens":
      return (
        hasKeyword(meta.haystack, MENS_KEYWORDS) ||
        (["L", "XL", "XXL", "XXXL"].includes(meta.size) && isFashionBrowseListing(source)) ||
        (isStreetwearListing(source) && !hasKeyword(meta.haystack, WOMENS_KEYWORDS) && !isAccessoryListing(source))
      );
    case "vintage":
      return isVintageListing(source);
    case "streetwear":
      return isStreetwearListing(source);
    case "game-day":
      return isGameDayListing(source);
    case "shoes":
      return isShoeListing(source);
    case "accessories":
      return isAccessoryListing(source);
    case "dorm":
      return source.category === "DORM";
    case "tech":
      return source.category === "TECH";
    case "textbooks":
      return source.category === "TEXTBOOKS";
    case "furniture":
      return isFurnitureListing(source);
    case "tickets":
      return source.category === "TICKETS";
    case "extras":
      return isExtraListing(source);
    default:
      return false;
  }
}

export function getMarketBrowsePillLabel(id: MarketBrowseLaneId) {
  return [...PRIMARY_MARKET_BROWSE_PILLS, ...SECONDARY_MARKET_BROWSE_PILLS].find((pill) => pill.id === id)?.label ?? id;
}

export function normalizeFacetValue(value: string) {
  return normalizeValue(value);
}

export function matchesFacetValue(source: ListingBrowseSource, facet: "brand" | "size" | "color", selectedValue: string) {
  if (!selectedValue || selectedValue === "all") {
    return true;
  }

  const normalizedSelected = normalizeFacetValue(selectedValue);
  const meta = getListingBrowseMeta(source);
  const facetValue = facet === "brand" ? meta.brand : facet === "size" ? meta.size : meta.color;

  if (normalizeFacetValue(facetValue) === normalizedSelected) {
    return true;
  }

  return meta.haystack.includes(normalizedSelected);
}
