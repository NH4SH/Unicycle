import { Category, Condition, ListingStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type MarketQuery = {
  q?: string;
  category?: string;
  condition?: string;
  location?: string;
  min?: number;
  max?: number;
  sort?: string;
  page?: number;
  limit?: number;
  userId?: string;
};

export type ListingCardData = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  category: Category;
  condition: Condition;
  images: string[];
  pickupLocations: string[];
  meetupNotes: string | null;
  createdAt: string;
  seller: {
    id: string;
    name: string | null;
    image: string | null;
    username: string;
  };
  favoriteCount: number;
  isFavorited: boolean;
  sellerRating: number;
  sellerResponse: string;
};

function fromJsonArray(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function calcSellerRating(seed: string) {
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Number((4.3 + (total % 7) / 10).toFixed(1));
}

function calcResponse(seed: string) {
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const buckets = ["~12m", "~28m", "~45m", "~1h", "~2h"];
  return buckets[total % buckets.length];
}

function listingWhere(query: MarketQuery): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    status: ListingStatus.ACTIVE
  };

  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { description: { contains: query.q } }
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

  return where;
}

function mapListing(
  listing: Prisma.ListingGetPayload<{
    include: {
      seller: true;
      favorites: true;
    };
  }>,
  userId?: string
): ListingCardData {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    priceCents: listing.priceCents,
    category: listing.category,
    condition: listing.condition,
    images: fromJsonArray(listing.images),
    pickupLocations: fromJsonArray(listing.pickupLocations),
    meetupNotes: listing.meetupNotes,
    createdAt: listing.createdAt.toISOString(),
    seller: {
      id: listing.seller.id,
      name: listing.seller.name,
      image: listing.seller.image,
      username: listing.seller.username
    },
    favoriteCount: listing.favorites.length,
    isFavorited: !!userId && listing.favorites.some((favorite) => favorite.userId === userId),
    sellerRating: calcSellerRating(listing.seller.id),
    sellerResponse: calcResponse(listing.seller.id)
  };
}

export async function getMarketListings(query: MarketQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 16;
  const where = listingWhere(query);

  const listings = await prisma.listing.findMany({
    where,
    include: {
      seller: true,
      favorites: true
    }
  });

  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const locationFiltered = query.location
    ? listings.filter((listing) => fromJsonArray(listing.pickupLocations).includes(query.location as string))
    : listings;

  const sorted = locationFiltered.sort((a, b) => {
    if (query.sort === "price_asc") return a.priceCents - b.priceCents;
    if (query.sort === "price_desc") return b.priceCents - a.priceCents;
    if (query.sort === "trending") {
      const aCount = a.favorites.filter((favorite) => favorite.createdAt >= seventyTwoHoursAgo).length;
      const bCount = b.favorites.filter((favorite) => favorite.createdAt >= seventyTwoHoursAgo).length;
      if (bCount === aCount) return b.createdAt.getTime() - a.createdAt.getTime();
      return bCount - aCount;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const start = (page - 1) * limit;
  const items = sorted.slice(start, start + limit).map((listing) => mapListing(listing, query.userId));

  return {
    items,
    hasMore: start + limit < sorted.length,
    page
  };
}

export async function getLandingDrops(userId?: string) {
  const todaysDrops = await prisma.listing.findMany({
    where: { status: ListingStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      seller: true,
      favorites: true
    }
  });

  const since = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const group = await prisma.favorite.groupBy({
    by: ["listingId"],
    where: {
      createdAt: { gte: since },
      listing: { status: ListingStatus.ACTIVE }
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

  let hotListings = [] as Prisma.ListingGetPayload<{
    include: {
      seller: true;
      favorites: true;
    };
  }>[];

  if (group.length > 0) {
    const listingIds = group.map((item) => item.listingId);
    const fetched = await prisma.listing.findMany({
      where: { id: { in: listingIds }, status: ListingStatus.ACTIVE },
      include: {
        seller: true,
        favorites: true
      }
    });

    hotListings = listingIds
      .map((id) => fetched.find((listing) => listing.id === id))
      .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing));
  }

  if (hotListings.length < 12) {
    const fallback = await prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        id: { notIn: hotListings.map((listing) => listing.id) }
      },
      orderBy: { createdAt: "desc" },
      take: 12 - hotListings.length,
      include: {
        seller: true,
        favorites: true
      }
    });

    hotListings = [...hotListings, ...fallback];
  }

  return {
    todaysDrops: todaysDrops.map((listing) => mapListing(listing, userId)),
    hotOnGrounds: hotListings.map((listing) => mapListing(listing, userId))
  };
}

export async function getListingDetail(listingId: string, userId?: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: true,
      favorites: true,
      conversations: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      }
    }
  });

  if (!listing) {
    return null;
  }

  const lowerBand = Math.max(listing.priceCents - 4000, 100);
  const upperBand = listing.priceCents + 4000;

  const similarItems = await prisma.listing.findMany({
    where: {
      id: { not: listing.id },
      status: ListingStatus.ACTIVE,
      category: listing.category,
      priceCents: {
        gte: lowerBand,
        lte: upperBand
      }
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      seller: true,
      favorites: true
    }
  });

  return {
    listing: mapListing(listing, userId),
    similarItems: similarItems.map((item) => mapListing(item, userId)),
    isOwner: userId === listing.sellerId
  };
}

export async function getUserProfile(username: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      listings: {
        include: {
          seller: true,
          favorites: true
        },
        orderBy: { createdAt: "desc" }
      },
      favorites: {
        include: {
          listing: {
            include: {
              seller: true,
              favorites: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!user) return null;

  const active = user.listings.filter((listing) => listing.status === ListingStatus.ACTIVE);
  const sold = user.listings.filter((listing) => listing.status === ListingStatus.SOLD);

  return {
    user,
    stats: {
      active: active.length,
      sold: sold.length,
      favoritesReceived: user.listings.reduce((sum, listing) => sum + listing.favorites.length, 0)
    },
    activeListings: active.map((listing) => mapListing(listing, viewerId)),
    soldListings: sold.map((listing) => mapListing(listing, viewerId)),
    favorites: user.favorites
      .filter((entry) => entry.listing.status === ListingStatus.ACTIVE)
      .map((entry) => mapListing(entry.listing, viewerId))
  };
}

export async function getUserFavorites(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId, listing: { status: ListingStatus.ACTIVE } },
    include: {
      listing: {
        include: {
          seller: true,
          favorites: true
        }
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
        include: {
          seller: true,
          favorites: true
        }
      },
      buyer: true,
      seller: true,
      messages: {
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return conversations.map((conversation) => {
    const otherUser = conversation.buyerId === userId ? conversation.seller : conversation.buyer;

    return {
      id: conversation.id,
      listing: mapListing(conversation.listing, userId),
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        image: otherUser.image,
        username: otherUser.username
      },
      messages: conversation.messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        readAt: message.readAt?.toISOString() ?? null
      }))
    };
  });
}

export async function markConversationAsRead(conversationId: string, userId: string) {
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
