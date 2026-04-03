import {
  Category,
  Condition,
  HandoffStatus,
  ListingBrowseLane,
  ListingModerationStatus,
  ListingStatus,
  OrderStatus,
  Prisma,
  TransactionIssueStatus,
  TransactionStatus
} from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

import {
  getListingBrowseSectionLabel,
  type MarketBrowseLaneId,
  getListingBrowseMeta,
  isFashionBrowseListing,
  matchesBrowseLane,
  matchesFacetValue,
  normalizeMarketBrowseLane
} from "@/lib/market-browse";
import { prisma } from "@/lib/prisma";
import {
  type CampusPickupCommunityId,
  getCampusPickupCommunity,
  getKnownCampusPickupLocations
} from "@/lib/campus-pickup-locations";
import { summarizeMapBrowseLocations, type MapBrowseTotals } from "@/lib/map-browse-summary";
import {
  type PublicUserSummary,
  publicUserProfileSelect,
  publicUserSummarySelect,
  toPublicUserProfile,
  toPublicUserSummary
} from "@/lib/public-user";
import { deriveStyleTagsFromListings } from "@/lib/style-network";
import { MARKET_PRICE_MIN_CENTS } from "@/lib/constants";

type MarketQuery = {
  q?: string;
  lane?: string;
  category?: string;
  condition?: string;
  location?: string;
  brand?: string;
  size?: string;
  color?: string;
  min?: number;
  max?: number;
  sort?: string;
  page?: number;
  limit?: number;
  userId?: string;
};

const sellerMetricsSelect = Prisma.validator<Prisma.UserSelect>()({
  ...publicUserSummarySelect,
  receivedSellerReviews: {
    select: {
      stars: true
    }
  },
  sellerTransactions: {
    where: {
      status: TransactionStatus.COMPLETED
    },
    select: {
      id: true
    }
  }
});

type SellerMetricsRecord = Prisma.UserGetPayload<{
  select: typeof sellerMetricsSelect;
}>;

type ListingLike = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  category: Category;
  shoppingLane: ListingBrowseLane | null;
  condition: Condition;
  images: Prisma.JsonValue;
  pickupLocations: Prisma.JsonValue;
  meetupNotes: string | null;
  status: ListingStatus;
  soldToUserId: string | null;
  createdAt: Date;
  seller: SellerMetricsRecord;
  favorites: { userId: string }[];
  transactions: { status: TransactionStatus }[];
};

const listingCardInclude = Prisma.validator<Prisma.ListingInclude>()({
  seller: {
    select: sellerMetricsSelect
  },
  favorites: true,
  transactions: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1,
    select: {
      status: true
    }
  }
});

type ListingCardRecord = Prisma.ListingGetPayload<{
  include: typeof listingCardInclude;
}>;

const transactionSummaryInclude = Prisma.validator<Prisma.TransactionInclude>()({
  listing: {
    include: listingCardInclude
  },
  order: {
    select: {
      id: true,
      status: true,
      paidAt: true,
      refundedAt: true
    }
  },
  buyer: {
    select: publicUserSummarySelect
  },
  seller: {
    select: publicUserSummarySelect
  },
  review: {
    include: {
      reviewer: {
        select: publicUserSummarySelect
      }
    }
  },
  conversation: {
    select: {
      id: true
    }
  },
  issues: {
    where: {
      status: TransactionIssueStatus.OPEN
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 1,
    select: {
      id: true,
      issueType: true,
      description: true,
      createdAt: true
    }
  }
});

type TransactionSummaryRecord = Prisma.TransactionGetPayload<{
  include: typeof transactionSummaryInclude;
}>;

export type ListingCardData = {
  id: string;
  title: string;
  description: string;
  brand: string;
  size: string;
  color: string;
  priceCents: number;
  category: Category;
  shoppingLane: ListingBrowseLane | null;
  categoryLabel: string | null;
  condition: Condition;
  images: string[];
  pickupLocations: string[];
  meetupNotes: string | null;
  status: ListingStatus;
  soldToUserId: string | null;
  transactionStatus: TransactionStatus | null;
  createdAt: string;
  seller: PublicUserSummary;
  favoriteCount: number;
  isFavorited: boolean;
  sellerRating: number | null;
  sellerReviewCount: number;
  sellerCompletedSales: number;
  sellerResponse: string;
};

export type SellerReviewData = {
  id: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
    username: string;
    usernameConfirmed: boolean;
    displayName: string;
    publicUsername: string | null;
  };
  listing: {
    id: string;
    title: string;
  } | null;
};

export type PurchaseSummaryData = {
  id: string;
  status: TransactionStatus;
  handoffStatus: HandoffStatus;
  agreedPriceCents: number;
  createdAt: string;
  sellerMarkedSoldAt: string | null;
  meetupLocation: string | null;
  meetupPlan: string | null;
  meetupScheduledFor: string | null;
  handoffConfirmedAt: string | null;
  buyerConfirmedReceivedAt: string | null;
  confirmedAt: string | null;
  listing: ListingCardData;
  counterparty: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
    username: string;
    usernameConfirmed: boolean;
    displayName: string;
    publicUsername: string | null;
  };
  conversationId: string | null;
  order: {
    id: string;
    status: OrderStatus;
    paidAt: string | null;
    refundedAt: string | null;
  } | null;
  openIssue: {
    id: string;
    issueType: string;
    description: string | null;
    createdAt: string;
  } | null;
  review: {
    stars: number;
    comment: string | null;
    createdAt: string;
  } | null;
};

export type FollowingFeedData = {
  items: ListingCardData[];
  total: number;
  page: number;
  hasMore: boolean;
};

export type MarketListingsData = {
  items: ListingCardData[];
  total: number;
  page: number;
  hasMore: boolean;
};

export type MarketCuratedSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "primary" | "secondary";
  items: ListingCardData[];
};

export type MarketCuratedSections = {
  primary: MarketCuratedSection[];
  secondary: MarketCuratedSection[];
};

export type MapBrowseLocationData = {
  id: string;
  name: string;
  shortLabel: string;
  area: string;
  communityId: CampusPickupCommunityId;
  communityName: string;
  communityDescription: string;
  latitude: number;
  longitude: number;
  totalCount: number;
  fashionCount: number;
  listings: ListingCardData[];
  fashionListings: ListingCardData[];
  secondaryListings: ListingCardData[];
};

export type MapBrowseCommunityData = {
  id: CampusPickupCommunityId;
  name: string;
  shortLabel: string;
  description: string;
  totalCount: number;
  fashionCount: number;
  locationCount: number;
};

export type MapBrowseData = {
  locations: MapBrowseLocationData[];
  communities: MapBrowseCommunityData[];
  summary: MapBrowseTotals;
};

function fromJsonArray(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function calcAverageRating(reviews: { stars: number }[]) {
  if (!reviews.length) return null;
  const total = reviews.reduce((sum, review) => sum + review.stars, 0);
  return Number((total / reviews.length).toFixed(1));
}

function calcResponse(seed: string) {
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const buckets = ["~12m", "~28m", "~45m", "~1h", "~2h"];
  return buckets[total % buckets.length];
}

function hasDerivedBrowseFilters(query: MarketQuery) {
  return Boolean(query.lane && query.lane !== "all") || Boolean(query.brand && query.brand !== "all") || Boolean(query.size && query.size !== "all") || Boolean(query.color && query.color !== "all");
}

function matchesDerivedBrowseFilters(listing: Pick<ListingLike, "title" | "description" | "category" | "shoppingLane">, query: MarketQuery) {
  const normalizedLane = normalizeMarketBrowseLane(query.lane);

  if (normalizedLane && normalizedLane !== "all" && !matchesBrowseLane(listing, normalizedLane as MarketBrowseLaneId)) {
    return false;
  }

  if (query.brand && query.brand !== "all" && !matchesFacetValue(listing, "brand", query.brand)) {
    return false;
  }

  if (query.size && query.size !== "all" && !matchesFacetValue(listing, "size", query.size)) {
    return false;
  }

  if (query.color && query.color !== "all" && !matchesFacetValue(listing, "color", query.color)) {
    return false;
  }

  return true;
}

function countRecentFavorites(listing: Pick<ListingCardRecord, "favorites">, since: Date) {
  return listing.favorites.filter((favorite) => favorite.createdAt >= since).length;
}

function sortListingsForMarket(listings: ListingCardRecord[], sort: string) {
  if (sort === "price_asc") {
    return [...listings].sort((a, b) => {
      if (a.priceCents === b.priceCents) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }

      return a.priceCents - b.priceCents;
    });
  }

  if (sort === "price_desc") {
    return [...listings].sort((a, b) => {
      if (b.priceCents === a.priceCents) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }

      return b.priceCents - a.priceCents;
    });
  }

  if (sort === "trending") {
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000);

    return [...listings].sort((a, b) => {
      const bRecent = countRecentFavorites(b, since);
      const aRecent = countRecentFavorites(a, since);

      if (bRecent === aRecent) {
        if (b.favorites.length === a.favorites.length) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }

        return b.favorites.length - a.favorites.length;
      }

      return bRecent - aRecent;
    });
  }

  return [...listings].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function listingWhere(query: MarketQuery): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    status: ListingStatus.ACTIVE,
    moderationStatus: ListingModerationStatus.VISIBLE
  };

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } }
    ];
  }

  if (query.category && query.category in Category) {
    where.category = query.category as Category;
  }

  if (query.condition && query.condition in Condition) {
    where.condition = query.condition as Condition;
  }

  if (typeof query.min === "number" || typeof query.max === "number") {
    where.priceCents = {
      gte: typeof query.min === "number" ? query.min : undefined,
      lte: typeof query.max === "number" ? query.max : undefined
    };
  }

  if (query.location) {
    where.pickupLocations = {
      array_contains: [query.location]
    };
  }

  return where;
}

function normalizeMarketQuery(query: MarketQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(Math.max(query.limit ?? 16, 1), 32);
  const min = typeof query.min === "number" ? Math.max(MARKET_PRICE_MIN_CENTS, query.min) : MARKET_PRICE_MIN_CENTS;
  const max = typeof query.max === "number" ? Math.max(min, query.max) : undefined;

  return {
    ...query,
    page,
    limit,
    min,
    max
  };
}

function normalizePage(page = 1, limit = 12, maxLimit = 24) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(limit, 1), maxLimit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit
  };
}

function mapListing(listing: ListingLike, userId?: string): ListingCardData {
  const browseMeta = getListingBrowseMeta({
    title: listing.title,
    description: listing.description,
    category: listing.category,
    shoppingLane: listing.shoppingLane
  });
  const categoryLabel = getListingBrowseSectionLabel({
    title: listing.title,
    description: listing.description,
    category: listing.category,
    shoppingLane: listing.shoppingLane
  });

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    brand: browseMeta.brand,
    size: browseMeta.size,
    color: browseMeta.color,
    priceCents: listing.priceCents,
    category: listing.category,
    shoppingLane: listing.shoppingLane,
    categoryLabel,
    condition: listing.condition,
    images: fromJsonArray(listing.images),
    pickupLocations: fromJsonArray(listing.pickupLocations),
    meetupNotes: listing.meetupNotes,
    status: listing.status,
    soldToUserId: listing.soldToUserId,
    transactionStatus: listing.status === ListingStatus.ACTIVE ? null : listing.transactions[0]?.status ?? null,
    createdAt: listing.createdAt.toISOString(),
    seller: {
      ...toPublicUserSummary(listing.seller)
    },
    favoriteCount: listing.favorites.length,
    isFavorited: !!userId && listing.favorites.some((favorite) => favorite.userId === userId),
    sellerRating: calcAverageRating(listing.seller.receivedSellerReviews),
    sellerReviewCount: listing.seller.receivedSellerReviews.length,
    sellerCompletedSales: listing.seller.sellerTransactions.length,
    sellerResponse: calcResponse(listing.seller.id)
  };
}

function mapPurchaseSummary(transaction: TransactionSummaryRecord, viewerId: string): PurchaseSummaryData {
  const counterparty = transaction.buyerId === viewerId ? transaction.seller : transaction.buyer;
  const openIssue = transaction.issues[0] ?? null;

  return {
    id: transaction.id,
    status: transaction.status,
    handoffStatus: transaction.handoffStatus,
    agreedPriceCents: transaction.agreedPriceCents ?? transaction.listing.priceCents,
    createdAt: transaction.createdAt.toISOString(),
    sellerMarkedSoldAt: transaction.sellerMarkedSoldAt?.toISOString() ?? null,
    meetupLocation: transaction.meetupLocation,
    meetupPlan: transaction.meetupPlan,
    meetupScheduledFor: transaction.meetupScheduledFor?.toISOString() ?? null,
    handoffConfirmedAt: transaction.handoffConfirmedAt?.toISOString() ?? null,
    buyerConfirmedReceivedAt: transaction.buyerConfirmedReceivedAt?.toISOString() ?? null,
    confirmedAt: transaction.confirmedAt?.toISOString() ?? null,
    listing: mapListing(transaction.listing, viewerId),
    counterparty: toPublicUserSummary(counterparty),
    conversationId: transaction.conversation?.id ?? null,
    order: transaction.order
      ? {
          id: transaction.order.id,
          status: transaction.order.status,
          paidAt: transaction.order.paidAt?.toISOString() ?? null,
          refundedAt: transaction.order.refundedAt?.toISOString() ?? null
        }
      : null,
    openIssue: openIssue
      ? {
          id: openIssue.id,
          issueType: openIssue.issueType,
          description: openIssue.description,
          createdAt: openIssue.createdAt.toISOString()
        }
      : null,
    review: transaction.review
      ? {
          stars: transaction.review.stars,
          comment: transaction.review.comment,
          createdAt: transaction.review.createdAt.toISOString()
        }
      : null
  };
}

export async function getMarketListings(query: MarketQuery): Promise<MarketListingsData> {
  noStore();

  const normalized = normalizeMarketQuery(query);
  const page = normalized.page;
  const limit = normalized.limit;
  const start = (page - 1) * limit;
  const where = listingWhere(normalized);

  if (hasDerivedBrowseFilters(normalized)) {
    const listings = await prisma.listing.findMany({
      where,
      include: listingCardInclude
    });

    const filteredListings = sortListingsForMarket(
      listings.filter((listing) =>
        matchesDerivedBrowseFilters(
          {
            title: listing.title,
            description: listing.description,
            category: listing.category,
            shoppingLane: listing.shoppingLane
          },
          normalized
        )
      ),
      normalized.sort ?? "newest"
    );

    const total = filteredListings.length;
    const pagedListings = filteredListings.slice(start, start + limit);

    return {
      items: pagedListings.map((listing) => mapListing(listing, normalized.userId)),
      total,
      hasMore: start + limit < total,
      page
    };
  }

  if (normalized.sort === "trending") {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const [filteredListings, favoriteGroups] = await Promise.all([
      prisma.listing.findMany({
        where,
        select: {
          id: true,
          createdAt: true
        }
      }),
      prisma.favorite.groupBy({
        by: ["listingId"],
        where: {
          createdAt: { gte: seventyTwoHoursAgo },
          listing: where
        },
        _count: {
          listingId: true
        }
      })
    ]);

    const favoriteCountMap = new Map(favoriteGroups.map((group) => [group.listingId, group._count.listingId]));
    const sortedIds = filteredListings
      .sort((a, b) => {
        const aCount = favoriteCountMap.get(a.id) ?? 0;
        const bCount = favoriteCountMap.get(b.id) ?? 0;
        if (bCount === aCount) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return bCount - aCount;
      })
      .slice(start, start + limit)
      .map((listing) => listing.id);

    if (!sortedIds.length) {
      return {
        items: [],
        total: filteredListings.length,
        hasMore: false,
        page
      };
    }

    const listings = await prisma.listing.findMany({
      where: {
        id: { in: sortedIds }
      },
      include: listingCardInclude
    });

    const orderedListings = sortedIds
      .map((id) => listings.find((listing) => listing.id === id))
      .filter((listing): listing is ListingCardRecord => Boolean(listing));

    return {
      items: orderedListings.map((listing) => mapListing(listing, normalized.userId)),
      total: filteredListings.length,
      hasMore: start + limit < filteredListings.length,
      page
    };
  }

  const orderBy =
    normalized.sort === "price_asc"
      ? ({ priceCents: "asc" } as const)
      : normalized.sort === "price_desc"
        ? ({ priceCents: "desc" } as const)
        : ({ createdAt: "desc" } as const);

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy,
      skip: start,
      take: limit,
      include: listingCardInclude
    })
  ]);

  return {
    items: listings.map((listing) => mapListing(listing, normalized.userId)),
    total,
    hasMore: start + limit < total,
    page
  };
}

export async function getMapBrowseData(userId?: string): Promise<MapBrowseData> {
  noStore();

  const listings = await prisma.listing.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      moderationStatus: ListingModerationStatus.VISIBLE
    },
    include: listingCardInclude,
    orderBy: {
      createdAt: "desc"
    }
  });

  const locationBuckets = new Map<
    string,
    {
      id: string;
      name: string;
      shortLabel: string;
      area: string;
      communityId: CampusPickupCommunityId;
      communityName: string;
      communityDescription: string;
      latitude: number;
      longitude: number;
      priority: number;
      listings: ListingCardData[];
      fashionListings: ListingCardData[];
      secondaryListings: ListingCardData[];
      seenListingIds: Set<string>;
    }
  >();

  for (const listingRecord of listings) {
    const listing = mapListing(listingRecord, userId);
    const knownLocations = getKnownCampusPickupLocations(listing.pickupLocations);

    if (!knownLocations.length) {
      continue;
    }

    const isFashionListing = isFashionBrowseListing({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      shoppingLane: listing.shoppingLane
    });

    for (const location of knownLocations) {
      const community = getCampusPickupCommunity(location);
      if (!community) {
        continue;
      }

      const existing =
        locationBuckets.get(location.id) ??
        {
          id: location.id,
          name: location.name,
          shortLabel: location.shortLabel,
          area: location.area,
          communityId: community.id,
          communityName: community.name,
          communityDescription: community.description,
          latitude: location.latitude,
          longitude: location.longitude,
          priority: location.priority,
          listings: [],
          fashionListings: [],
          secondaryListings: [],
          seenListingIds: new Set<string>()
        };

      if (existing.seenListingIds.has(listing.id)) {
        locationBuckets.set(location.id, existing);
        continue;
      }

      existing.seenListingIds.add(listing.id);
      existing.listings.push(listing);

      if (isFashionListing) {
        existing.fashionListings.push(listing);
      } else {
        existing.secondaryListings.push(listing);
      }

      locationBuckets.set(location.id, existing);
    }
  }

  const locations = [...locationBuckets.values()]
    .map((location) => ({
      id: location.id,
      name: location.name,
      shortLabel: location.shortLabel,
      area: location.area,
      communityId: location.communityId,
      communityName: location.communityName,
      communityDescription: location.communityDescription,
      latitude: location.latitude,
      longitude: location.longitude,
      totalCount: location.listings.length,
      fashionCount: location.fashionListings.length,
      listings: location.listings,
      fashionListings: location.fashionListings,
      secondaryListings: location.secondaryListings,
      priority: location.priority
    }))
    .filter((location) => location.totalCount > 0)
    .sort((a, b) => {
      if (b.fashionCount === a.fashionCount) {
        if (b.totalCount === a.totalCount) {
          return b.priority - a.priority;
        }

        return b.totalCount - a.totalCount;
      }

      return b.fashionCount - a.fashionCount;
    })
    .map((location) => ({
      id: location.id,
      name: location.name,
      shortLabel: location.shortLabel,
      area: location.area,
      communityId: location.communityId,
      communityName: location.communityName,
      communityDescription: location.communityDescription,
      latitude: location.latitude,
      longitude: location.longitude,
      totalCount: location.totalCount,
      fashionCount: location.fashionCount,
      listings: location.listings,
      fashionListings: location.fashionListings,
      secondaryListings: location.secondaryListings
    }));

  const { communities, summary } = summarizeMapBrowseLocations(locations);

  return {
    locations,
    communities,
    summary
  };
}

export async function getLandingDrops(userId?: string) {
  noStore();

  const todaysDrops = await prisma.listing.findMany({
    where: { status: ListingStatus.ACTIVE, moderationStatus: ListingModerationStatus.VISIBLE },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: listingCardInclude
  });

  const since = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const group = await prisma.favorite.groupBy({
    by: ["listingId"],
    where: {
      createdAt: { gte: since },
      listing: { status: ListingStatus.ACTIVE, moderationStatus: ListingModerationStatus.VISIBLE }
    },
    _count: {
      listingId: true
    },
    orderBy: {
      _count: {
        listingId: "desc"
      }
    },
    take: 12
  });

  let hotListings = [] as ListingCardRecord[];

  if (group.length > 0) {
    const listingIds = group.map((item) => item.listingId);
    const fetched = await prisma.listing.findMany({
      where: { id: { in: listingIds }, status: ListingStatus.ACTIVE, moderationStatus: ListingModerationStatus.VISIBLE },
      include: listingCardInclude
    });

    hotListings = listingIds
      .map((id) => fetched.find((listing) => listing.id === id))
      .filter((listing): listing is ListingCardRecord => Boolean(listing));
  }

  if (hotListings.length < 12) {
    const fallback = await prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        moderationStatus: ListingModerationStatus.VISIBLE,
        id: { notIn: hotListings.map((listing) => listing.id) }
      },
      orderBy: { createdAt: "desc" },
      take: 12 - hotListings.length,
      include: listingCardInclude
    });

    hotListings = [...hotListings, ...fallback];
  }

  return {
    todaysDrops: todaysDrops.map((listing) => mapListing(listing, userId)),
    hotOnGrounds: hotListings.map((listing) => mapListing(listing, userId))
  };
}

function pickCuratedListings(pool: ListingCardRecord[], limit: number, usedIds: Set<string>) {
  const available = pool.filter((listing) => !usedIds.has(listing.id));
  const picked = available.slice(0, limit);

  if (picked.length < Math.min(limit, pool.length)) {
    picked.push(...pool.filter((listing) => !picked.some((entry) => entry.id === listing.id)).slice(0, limit - picked.length));
  }

  for (const listing of picked) {
    usedIds.add(listing.id);
  }

  return picked;
}

export async function getMarketCuratedSections(userId?: string): Promise<MarketCuratedSections> {
  noStore();

  const listings = await prisma.listing.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      moderationStatus: ListingModerationStatus.VISIBLE
    },
    include: listingCardInclude
  });

  const newestListings = sortListingsForMarket(listings, "newest");
  const fashionListings = newestListings.filter((listing) =>
    isFashionBrowseListing({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      shoppingLane: listing.shoppingLane
    })
  );
  const trendingBrands = sortListingsForMarket(
    fashionListings.filter((listing) =>
      Boolean(
        getListingBrowseMeta({
          title: listing.title,
          description: listing.description,
          category: listing.category,
          shoppingLane: listing.shoppingLane
        }).brand
      )
    ),
    "trending"
  );
  const affordableFashion = fashionListings.filter((listing) => listing.priceCents <= 3000);
  const dormFinds = newestListings.filter((listing) => listing.category === "DORM");
  const techAndStudy = newestListings.filter((listing) => listing.category === "TECH" || listing.category === "TEXTBOOKS");
  const roomRefresh = newestListings.filter((listing) =>
    matchesBrowseLane(
      {
        title: listing.title,
        description: listing.description,
        category: listing.category,
        shoppingLane: listing.shoppingLane
      },
      "furniture"
    )
  );
  const ticketsAndExtras = newestListings.filter(
    (listing) =>
      listing.category === "TICKETS" ||
      matchesBrowseLane(
        {
          title: listing.title,
          description: listing.description,
          category: listing.category,
          shoppingLane: listing.shoppingLane
        },
        "extras"
      )
  );

  const primaryUsedIds = new Set<string>();
  const secondaryUsedIds = new Set<string>();

  const primary: MarketCuratedSection[] = [
    {
      id: "fresh",
      title: "Fresh on Grounds",
      description: "New style drops, outerwear, and campus fits posted lately.",
      href: "/market?sort=newest",
      tone: "primary" as const,
      items: pickCuratedListings(fashionListings, 4, primaryUsedIds).map((listing) => mapListing(listing, userId))
    },
    {
      id: "brands",
      title: "Trending Brands",
      description: "The labels getting saved fastest around Grounds right now.",
      href: "/market?sort=trending",
      tone: "primary" as const,
      items: pickCuratedListings(trendingBrands.length ? trendingBrands : fashionListings, 4, primaryUsedIds).map((listing) =>
        mapListing(listing, userId)
      )
    },
    {
      id: "under-30",
      title: "Under $30",
      description: "Easy pickups that still feel like a find, not an afterthought.",
      href: "/market?max=3000",
      tone: "primary" as const,
      items: pickCuratedListings(affordableFashion.length ? affordableFashion : fashionListings, 4, primaryUsedIds).map((listing) =>
        mapListing(listing, userId)
      )
    }
  ].filter((section) => section.items.length > 0);

  const secondary: MarketCuratedSection[] = [
    {
      id: "dorm-finds",
      title: "Dorm Finds",
      description: "Move-in helpers, decor, and room staples that still belong here.",
      href: "/market?lane=dorm",
      tone: "secondary" as const,
      items: pickCuratedListings(dormFinds, 3, secondaryUsedIds).map((listing) => mapListing(listing, userId))
    },
    {
      id: "tech-study",
      title: "Tech & Study",
      description: "Monitors, headphones, calculators, and class-day essentials.",
      href: "/market?lane=tech",
      tone: "secondary" as const,
      items: pickCuratedListings(techAndStudy, 3, secondaryUsedIds).map((listing) => mapListing(listing, userId))
    },
    {
      id: "room-refresh",
      title: "Room Refresh",
      description: "Mirrors, chairs, shelves, and dorm upgrades worth carrying home.",
      href: "/market?lane=furniture",
      tone: "secondary" as const,
      items: pickCuratedListings(roomRefresh.length ? roomRefresh : dormFinds, 3, secondaryUsedIds).map((listing) =>
        mapListing(listing, userId)
      )
    },
    {
      id: "tickets-extras",
      title: "Tickets & Extras",
      description: "Last-minute passes and the off-duty marketplace finds beyond clothes.",
      href: "/market?lane=tickets",
      tone: "secondary" as const,
      items: pickCuratedListings(ticketsAndExtras, 3, secondaryUsedIds).map((listing) => mapListing(listing, userId))
    }
  ].filter((section) => section.items.length > 0);

  return {
    primary,
    secondary
  };
}

export async function getFollowingFeedListings(userId: string, page = 1, limit = 8): Promise<FollowingFeedData> {
  noStore();

  const pagination = normalizePage(page, limit, 20);
  const where = {
    status: ListingStatus.ACTIVE,
    moderationStatus: ListingModerationStatus.VISIBLE,
    seller: {
      followers: {
        some: {
          followerId: userId
        }
      }
    }
  } satisfies Prisma.ListingWhereInput;

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip: pagination.skip,
      take: pagination.limit,
      include: listingCardInclude
    })
  ]);

  return {
    items: listings.map((listing) => mapListing(listing, userId)),
    total,
    page: pagination.page,
    hasMore: pagination.skip + pagination.limit < total
  };
}

export async function getListingDetail(listingId: string, userId?: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        select: sellerMetricsSelect
      },
      favorites: true,
      conversations: {
        include: {
          buyer: {
            select: publicUserSummarySelect
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1
          },
          transactions: {
            orderBy: {
              createdAt: "desc"
            },
            take: 1,
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      transactions: {
        include: {
          buyer: {
            select: publicUserSummarySelect
          },
          review: {
            include: {
              reviewer: {
                select: publicUserSummarySelect
              }
            }
          },
          conversation: {
            select: {
              id: true
            }
          },
          order: {
            select: {
              id: true,
              status: true,
              paidAt: true,
              refundedAt: true
            }
          },
          issues: {
            where: {
              status: TransactionIssueStatus.OPEN
            },
            orderBy: {
              createdAt: "desc"
            },
            take: 1,
            select: {
              id: true,
              issueType: true,
              description: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!listing) {
    return null;
  }

  if (listing.moderationStatus !== ListingModerationStatus.VISIBLE) {
    return null;
  }

  const lowerBand = Math.max(listing.priceCents - 4000, 100);
  const upperBand = listing.priceCents + 4000;

  const similarItems = await prisma.listing.findMany({
    where: {
      id: { not: listing.id },
      status: ListingStatus.ACTIVE,
      moderationStatus: ListingModerationStatus.VISIBLE,
      ...(listing.shoppingLane ? { shoppingLane: listing.shoppingLane } : { category: listing.category }),
      priceCents: {
        gte: lowerBand,
        lte: upperBand
      }
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: listingCardInclude
  });

  const currentTransaction =
    listing.status === ListingStatus.ACTIVE
      ? null
      : listing.transactions.find((transaction) => {
          if (listing.status === ListingStatus.PENDING_CONFIRMATION) {
            return (
              transaction.status === TransactionStatus.PENDING_CONFIRMATION ||
              transaction.status === TransactionStatus.ISSUE_REPORTED
            );
          }

          if (listing.status === ListingStatus.COMPLETED) {
            return transaction.status === TransactionStatus.COMPLETED;
          }

          return transaction.status === TransactionStatus.CANCELLED;
        }) ?? null;

  return {
    listing: mapListing({ ...listing, transactions: currentTransaction ? [{ status: currentTransaction.status }] : [] }, userId),
    similarItems: similarItems.map((item) => mapListing(item, userId)),
    isOwner: userId === listing.sellerId,
    saleContext: {
      currentTransaction: currentTransaction
        ? {
            id: currentTransaction.id,
            status: currentTransaction.status,
            handoffStatus: currentTransaction.handoffStatus,
            agreedPriceCents: currentTransaction.agreedPriceCents,
            sellerMarkedSoldAt: currentTransaction.sellerMarkedSoldAt?.toISOString() ?? null,
            meetupLocation: currentTransaction.meetupLocation,
            meetupPlan: currentTransaction.meetupPlan,
            meetupScheduledFor: currentTransaction.meetupScheduledFor?.toISOString() ?? null,
            handoffConfirmedAt: currentTransaction.handoffConfirmedAt?.toISOString() ?? null,
            buyerConfirmedReceivedAt: currentTransaction.buyerConfirmedReceivedAt?.toISOString() ?? null,
            confirmedAt: currentTransaction.confirmedAt?.toISOString() ?? null,
            conversationId: currentTransaction.conversation?.id ?? null,
            order: currentTransaction.order
              ? {
                  id: currentTransaction.order.id,
                  status: currentTransaction.order.status,
                  paidAt: currentTransaction.order.paidAt?.toISOString() ?? null,
                  refundedAt: currentTransaction.order.refundedAt?.toISOString() ?? null
                }
              : null,
            openIssue: currentTransaction.issues[0]
              ? {
                  id: currentTransaction.issues[0].id,
                  issueType: currentTransaction.issues[0].issueType,
                  description: currentTransaction.issues[0].description,
                  createdAt: currentTransaction.issues[0].createdAt.toISOString()
                }
              : null,
            buyer: toPublicUserSummary(currentTransaction.buyer),
            review: currentTransaction.review
              ? {
                  stars: currentTransaction.review.stars,
                  comment: currentTransaction.review.comment,
                  createdAt: currentTransaction.review.createdAt.toISOString(),
                  reviewer: toPublicUserSummary(currentTransaction.review.reviewer)
                }
              : null
          }
        : null,
      interestedBuyers: listing.conversations.map((conversation) => ({
        conversationId: conversation.id,
        buyer: toPublicUserSummary(conversation.buyer),
        lastMessage: conversation.messages[0]?.body ?? null,
        lastMessageAt: conversation.messages[0]?.createdAt.toISOString() ?? null,
        transactionStatus: conversation.transactions[0]?.status ?? null
      }))
    }
  };
}

export async function getUserProfile(username: string, viewerId?: string) {
  const [user, reviewAggregate, completedSales, recentReviews, viewerFollowingIds] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      select: {
        ...publicUserProfileSelect,
        listings: {
          where: {
            moderationStatus: ListingModerationStatus.VISIBLE
          },
          include: listingCardInclude,
          orderBy: { createdAt: "desc" }
        },
        favorites: {
          include: {
            listing: {
              include: listingCardInclude
            }
          },
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: {
            followers: true,
            following: true
          }
        }
      }
    }),
    prisma.sellerReview.aggregate({
      where: {
        reviewee: { username }
      },
      _avg: {
        stars: true
      },
      _count: {
        _all: true
      }
    }),
    prisma.transaction.count({
      where: {
        seller: { username },
        status: TransactionStatus.COMPLETED
      }
    }),
    prisma.sellerReview.findMany({
      where: {
        reviewee: { username }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 4,
      include: {
        reviewer: {
          select: publicUserSummarySelect
        },
        transaction: {
          include: {
            listing: true
          }
        }
      }
    }),
    viewerId
      ? prisma.follow.findMany({
          where: {
            followerId: viewerId
          },
          select: {
            followingId: true
          }
        })
      : Promise.resolve([])
  ]);

  if (!user) return null;

  const active = user.listings.filter((listing) => listing.status === ListingStatus.ACTIVE);
  const pastListings = user.listings.filter((listing) => listing.status !== ListingStatus.ACTIVE);
  const pending = user.listings.filter((listing) => listing.status === ListingStatus.PENDING_CONFIRMATION).length;
  const completed = user.listings.filter((listing) => listing.status === ListingStatus.COMPLETED).length;
  const cancelled = user.listings.filter((listing) => listing.status === ListingStatus.CANCELLED).length;
  const viewerFollowingSet = new Set(viewerFollowingIds.map((entry) => entry.followingId));
  const mutualCount =
    viewerId && viewerId !== user.id && viewerFollowingSet.size
      ? await prisma.follow.count({
          where: {
            followingId: user.id,
            followerId: {
              in: [...viewerFollowingSet]
            }
          }
        })
      : 0;
  const styleTags = deriveStyleTagsFromListings(active);
  const recentDropAt = active[0]?.createdAt.toISOString() ?? null;

  return {
    user: toPublicUserProfile(user),
    social: {
      followerCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing: viewerId ? viewerFollowingSet.has(user.id) : false,
      isSelf: viewerId === user.id,
      mutualCount,
      styleTags,
      activeListingCount: active.length,
      recentDropAt
    },
    stats: {
      active: active.length,
      pending,
      completed,
      cancelled,
      favoritesReceived: user.listings.reduce((sum, listing) => sum + listing.favorites.length, 0),
      averageRating: reviewAggregate._avg.stars ? Number(reviewAggregate._avg.stars.toFixed(1)) : null,
      reviewCount: reviewAggregate._count._all,
      completedSales
    },
    activeListings: active.map((listing) => mapListing(listing, viewerId)),
    pastListings: pastListings.map((listing) => mapListing(listing, viewerId)),
    favorites: user.favorites
      .filter(
        (entry) =>
          entry.listing.status === ListingStatus.ACTIVE && entry.listing.moderationStatus === ListingModerationStatus.VISIBLE
      )
      .map((entry) => mapListing(entry.listing, viewerId)),
    recentReviews: recentReviews.map((review) => ({
      id: review.id,
      stars: review.stars,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      reviewer: toPublicUserSummary(review.reviewer),
      listing: review.transaction.listing
        ? {
            id: review.transaction.listing.id,
            title: review.transaction.listing.title
          }
        : null
    }))
  };
}

export async function getUserFavorites(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId, listing: { status: ListingStatus.ACTIVE, moderationStatus: ListingModerationStatus.VISIBLE } },
    include: {
      listing: {
        include: listingCardInclude
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return favorites.map((entry) => mapListing(entry.listing, userId));
}

export async function getConversationsForUser(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }]
    },
    include: {
      listing: {
        include: listingCardInclude
      },
      buyer: {
        select: publicUserSummarySelect
      },
      seller: {
        select: publicUserSummarySelect
      },
      messages: {
        orderBy: { createdAt: "asc" }
      },
      transactions: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              paidAt: true,
              refundedAt: true
            }
          },
          issues: {
            where: {
              status: TransactionIssueStatus.OPEN
            },
            orderBy: {
              createdAt: "desc"
            },
            take: 1,
            select: {
              id: true,
              issueType: true,
              description: true,
              createdAt: true
            }
          },
          review: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return conversations.map((conversation) => {
    const otherUser = conversation.buyerId === userId ? conversation.seller : conversation.buyer;
    const transaction = conversation.transactions[0] ?? null;

    return {
      id: conversation.id,
      role: conversation.sellerId === userId ? "seller" : "buyer",
      listing: mapListing(conversation.listing, userId),
      otherUser: {
        ...toPublicUserSummary(otherUser)
      },
      messages: conversation.messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        readAt: message.readAt?.toISOString() ?? null
      })),
      transaction: transaction
        ? {
            id: transaction.id,
            status: transaction.status,
            handoffStatus: transaction.handoffStatus,
            agreedPriceCents: transaction.agreedPriceCents,
            sellerMarkedSoldAt: transaction.sellerMarkedSoldAt?.toISOString() ?? null,
            meetupLocation: transaction.meetupLocation,
            meetupPlan: transaction.meetupPlan,
            meetupScheduledFor: transaction.meetupScheduledFor?.toISOString() ?? null,
            handoffConfirmedAt: transaction.handoffConfirmedAt?.toISOString() ?? null,
            buyerConfirmedReceivedAt: transaction.buyerConfirmedReceivedAt?.toISOString() ?? null,
            confirmedAt: transaction.confirmedAt?.toISOString() ?? null,
            order: transaction.order
              ? {
                  id: transaction.order.id,
                  status: transaction.order.status,
                  paidAt: transaction.order.paidAt?.toISOString() ?? null,
                  refundedAt: transaction.order.refundedAt?.toISOString() ?? null
                }
              : null,
            openIssue: transaction.issues[0]
              ? {
                  id: transaction.issues[0].id,
                  issueType: transaction.issues[0].issueType,
                  description: transaction.issues[0].description,
                  createdAt: transaction.issues[0].createdAt.toISOString()
                }
              : null,
            review: transaction.review
              ? {
                  stars: transaction.review.stars,
                  comment: transaction.review.comment,
                  createdAt: transaction.review.createdAt.toISOString()
                }
              : null
          }
        : null
    };
  });
}

export async function markConversationAsRead(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId
    },
    select: {
      buyerId: true,
      sellerId: true
    }
  });

  if (!conversation) {
    return;
  }

  const isParticipant = conversation.buyerId === userId || conversation.sellerId === userId;
  if (!isParticipant) {
    return;
  }

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });
}

export async function getPurchasesOverview(userId: string) {
  const [purchases, sales] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        buyerId: userId
      },
      include: transactionSummaryInclude,
      orderBy: {
        updatedAt: "desc"
      }
    }),
    prisma.transaction.findMany({
      where: {
        sellerId: userId
      },
      include: transactionSummaryInclude,
      orderBy: {
        updatedAt: "desc"
      }
    })
  ]);

  return {
    purchases: purchases.map((transaction) => mapPurchaseSummary(transaction, userId)),
    sales: sales.map((transaction) => mapPurchaseSummary(transaction, userId))
  };
}

export async function getTransactionForConfirmation(transactionId: string, userId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId
    },
    include: transactionSummaryInclude
  });

  if (!transaction || transaction.buyerId !== userId) {
    return null;
  }

  return mapPurchaseSummary(transaction, userId);
}
