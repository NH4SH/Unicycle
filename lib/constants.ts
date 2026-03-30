import { Category, Condition } from "@prisma/client";

export const SITE_NAME = "HoosFinds";
export const SITE_URL = "https://hoosfinds.com";

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
  DORM: "Dorm / Home",
  TEXTBOOKS: "Textbooks",
  STREETWEAR: "Vintage / Streetwear",
  TECH: "Tech",
  TICKETS: "Tickets",
  MISC: "Accessories / Misc"
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
  { label: "Most Wanted", value: "trending" }
] as const;

export const STICKER_TAGS = ["Hot on Grounds", "Game Day", "New Find", "Corner Pickup"];

export const HOME_PRIMARY_LANES = [
  {
    label: "Vintage / Streetwear",
    href: "/market?category=STREETWEAR",
    eyebrow: "Lead lane",
    description: "Streetwear, hoodies, jackets, and the thrift-energy finds people check first."
  },
  {
    label: "Game Day Fits",
    href: "/market?category=STREETWEAR&q=game+day",
    eyebrow: "Saturday lane",
    description: "Orange-and-blue layers, last-minute pieces, and pregame-ready looks."
  },
  {
    label: "Outerwear",
    href: "/market?category=STREETWEAR&q=jacket",
    eyebrow: "Layer up",
    description: "Fleeces, rain jackets, puffers, and easy campus throw-ons."
  },
  {
    label: "Accessories",
    href: "/market?category=MISC&q=bag",
    eyebrow: "Finish the look",
    description: "Bags, jewelry, hats, and the smaller pieces that carry the outfit."
  },
  {
    label: "Shoes",
    href: "/market?category=STREETWEAR&q=sneakers",
    eyebrow: "Underfoot",
    description: "Sneakers, boots, and daily pairs worth crossing Grounds for."
  },
  {
    label: "Men's Clothing",
    href: "/market?category=STREETWEAR&q=mens",
    eyebrow: "Men's",
    description: "Vintage sweats, everyday campus fits, and closet cleanout standouts."
  },
  {
    label: "Women's Clothing",
    href: "/market?category=STREETWEAR&q=womens",
    eyebrow: "Women's",
    description: "Going-out pieces, denim, layered staples, and quick pickup finds."
  }
] as const;

export const HOME_SECONDARY_LANES = [
  { label: "Dorm", href: "/market?category=DORM" },
  { label: "Tech", href: "/market?category=TECH" },
  { label: "Textbooks", href: "/market?category=TEXTBOOKS" },
  { label: "Tickets", href: "/market?category=TICKETS" },
  { label: "Misc", href: "/market?category=MISC" }
] as const;

export const HOW_IT_WORKS_STEPS = [
  {
    number: "01",
    title: "Post the piece",
    description: "Add strong photos, a clean price, and pickup spots that actually work between classes.",
    note: "Fast listing flow"
  },
  {
    number: "02",
    title: "Get discovered",
    description: "Students browse by style lane, save what they want, and message without leaving HoosFinds.",
    note: "Style-first browsing"
  },
  {
    number: "03",
    title: "Meet on Grounds",
    description: "Lock in the handoff at Newcomb, The Corner, JPJ, or another trusted UVA pickup spot.",
    note: "Local by default"
  }
] as const;

export const MARKET_STYLE_FILTERS = [
  { label: "All finds", q: "", category: "all" },
  { label: "Vintage", q: "vintage", category: "STREETWEAR" },
  { label: "Outerwear", q: "jacket", category: "STREETWEAR" },
  { label: "Sneakers", q: "sneakers", category: "STREETWEAR" },
  { label: "Game day", q: "game day", category: "STREETWEAR" },
  { label: "Accessories", q: "bag", category: "MISC" },
  { label: "Dorm finds", q: "", category: "DORM" }
] as const;

export const TRUST_MARKERS = [
  "UVA-only access",
  "Student-to-student",
  "Pickup on Grounds"
] as const;
