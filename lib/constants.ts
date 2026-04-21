import { Category, Condition, ListingStatus, TransactionStatus } from "@prisma/client";
import { FEATURED_PICKUP_LOCATIONS } from "@/lib/campus-pickup-locations";

export const SITE_NAME = "HoosFinds";
export const SITE_URL = "https://hoosfinds.com";
export const MARKET_PRICE_MIN_CENTS = 100;
export const MARKET_PRICE_OPEN_MAX_CENTS = 50000;

export const PICKUP_LOCATIONS = FEATURED_PICKUP_LOCATIONS.map((location) => location.name);

export const CATEGORY_LABELS: Record<Category, string> = {
  DORM: "Dorm",
  TEXTBOOKS: "Textbooks",
  STREETWEAR: "Clothing",
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
  ISSUE_REPORTED: "Issue reported",
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
    label: "Women's",
    href: "/market?audience=womens",
    eyebrow: "Women's",
    description: "Going-out pieces, denim, layered staples, and quick pickup finds."
  },
  {
    label: "Men's",
    href: "/market?audience=mens",
    eyebrow: "Men's",
    description: "Vintage sweats, everyday Grounds fits, and closet cleanout standouts."
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
    description: "Students browse the strongest finds first, save what they want, and message without leaving HoosFinds.",
    note: "Clean discovery"
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
