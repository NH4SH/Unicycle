import { Category, Condition } from "@prisma/client";

export const SITE_NAME = "UniCycle";

export const PICKUP_LOCATIONS = [
  "Newcomb",
  "Pavilion",
  "The Corner",
  "Rice Hall",
  "Clemons",
  "Alumni Hall",
  "JPJ",
  "Scott Stadium"
] as const;

export const CATEGORY_LABELS: Record<Category, string> = {
  DORM: "Dorm",
  TEXTBOOKS: "Textbooks",
  STREETWEAR: "Streetwear",
  TECH: "Tech",
  TICKETS: "Tickets",
  MISC: "Misc"
};

export const CONDITION_LABELS: Record<Condition, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  WELL_LOVED: "Well Loved"
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const LISTING_SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Trending", value: "trending" }
] as const;

export const STICKER_TAGS = ["🔥 Hot", "New Drop", "Steal", "Meet at Corner"];
