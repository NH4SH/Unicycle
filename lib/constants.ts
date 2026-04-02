import { Category, Condition, ListingStatus, TransactionStatus } from "@prisma/client";

export const SITE_NAME = "HoosFinds";
export const SITE_URL = "https://hoosfinds.com";
export const MARKET_PRICE_MIN_CENTS = 100;
export const MARKET_PRICE_OPEN_MAX_CENTS = 50000;

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
  STREETWEAR: "Vintage / Streetwear",
  TECH: "Tech",
  TICKETS: "Tickets",
  MISC: "Accessories / Extras"
};

export const CONDITION_LABELS: Record<Condition, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  WELL_LOVED: "Well Loved"
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  ACTIVE: "Active",
  PENDING_CONFIRMATION: "Pending confirmation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING_CONFIRMATION: "Pending confirmation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
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

export const HOME_PRIMARY_LANES = [
  {
    label: "Vintage",
    href: "/market?lane=vintage",
    eyebrow: "Lead lane",
    description: "Thrifted sweats, worn-in layers, and the campus pieces with real history."
  },
  {
    label: "Game Day",
    href: "/market?lane=game-day",
    eyebrow: "Saturday lane",
    description: "Orange-and-blue layers, last-minute pieces, and pregame-ready looks."
  },
  {
    label: "Streetwear",
    href: "/market?lane=streetwear",
    eyebrow: "Daily rotation",
    description: "Graphic crews, hoodies, jackets, and the fits people notice between classes."
  },
  {
    label: "Accessories",
    href: "/market?lane=accessories",
    eyebrow: "Finish the look",
    description: "Bags, jewelry, hats, and the smaller pieces that carry the outfit."
  },
  {
    label: "Shoes",
    href: "/market?lane=shoes",
    eyebrow: "Underfoot",
    description: "Sneakers, boots, and daily pairs worth crossing Grounds for."
  },
  {
    label: "Men's Clothing",
    href: "/market?lane=mens",
    eyebrow: "Men's",
    description: "Vintage sweats, everyday campus fits, and closet cleanout standouts."
  },
  {
    label: "Women's Clothing",
    href: "/market?lane=womens",
    eyebrow: "Women's",
    description: "Going-out pieces, denim, layered staples, and quick pickup finds."
  }
] as const;

export const HOME_SECONDARY_LANES = [
  { label: "Dorm", href: "/market?lane=dorm" },
  { label: "Tech", href: "/market?lane=tech" },
  { label: "Textbooks", href: "/market?lane=textbooks" },
  { label: "Furniture", href: "/market?lane=furniture" },
  { label: "Tickets", href: "/market?lane=tickets" },
  { label: "Extras", href: "/market?lane=extras" }
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

export const TRUST_MARKERS = [
  "UVA-only access",
  "Student-to-student",
  "Pickup on Grounds"
] as const;
