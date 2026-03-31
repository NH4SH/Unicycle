import { Category, ListingStatus, Prisma, TransactionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { publicUserProfileSelect, toPublicUserProfile } from "@/lib/public-user";
import { deriveStyleTagsFromListings, getFashionFocusScore, isFashionFocusedListing } from "@/lib/style-network";

type SellerPreviewListing = {
  sellerId: string;
  category: Category;
  title: string;
  description: string;
  createdAt: Date;
  favorites: { userId: string }[];
};

export type SellerNetworkProfile = {
  id: string;
  name: string | null;
  username: string;
  profileImageUrl: string | null;
  bio: string | null;
  gradYear: number | null;
  favoritePickup: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  mutualCount: number;
  styleTags: string[];
  activeListingCount: number;
  recentDropAt: string | null;
  reason?: string;
};

export type UserSocialSnapshot = {
  user: {
    id: string;
    name: string | null;
    username: string;
    profileImageUrl: string | null;
    bio: string | null;
    gradYear: number | null;
    favoritePickup: string | null;
  };
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  mutualCount: number;
  styleTags: string[];
  activeListingCount: number;
  recentDropAt: string | null;
};

export type FollowListResult = {
  userId: string;
  total: number;
  page: number;
  hasMore: boolean;
  items: SellerNetworkProfile[];
};

const sellerNetworkProfileSelect = Prisma.validator<Prisma.UserSelect>()({
  ...publicUserProfileSelect,
  _count: {
    select: {
      followers: true,
      following: true
    }
  }
});

const sellerPreviewListingSelect = Prisma.validator<Prisma.ListingSelect>()({
  sellerId: true,
  category: true,
  title: true,
  description: true,
  createdAt: true,
  favorites: {
    select: {
      userId: true
    }
  }
});

function normalizePage(page = 1, limit = 12) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(limit, 1), 24);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit
  };
}

function buildPreferredSignals(listings: Pick<SellerPreviewListing, "category" | "title" | "description">[]) {
  const categories = new Set<Category>();
  const tags = new Set<string>();

  for (const listing of listings) {
    categories.add(listing.category);

    for (const tag of deriveStyleTagsFromListings([listing])) {
      tags.add(tag);
    }
  }

  return {
    categories,
    tags
  };
}

async function getViewerFollowingIds(viewerId?: string) {
  if (!viewerId) {
    return [];
  }

  const follows = await prisma.follow.findMany({
    where: {
      followerId: viewerId
    },
    select: {
      followingId: true
    }
  });

  return follows.map((follow) => follow.followingId);
}

async function getMutualFollowCountMap(targetUserIds: string[], viewerId?: string) {
  if (!viewerId || !targetUserIds.length) {
    return new Map<string, number>();
  }

  const viewerFollowingIds = await getViewerFollowingIds(viewerId);

  if (!viewerFollowingIds.length) {
    return new Map<string, number>();
  }

  const mutualCounts = await prisma.follow.groupBy({
    by: ["followingId"],
    where: {
      followingId: {
        in: targetUserIds
      },
      followerId: {
        in: viewerFollowingIds
      }
    },
    _count: {
      _all: true
    }
  });

  return new Map(mutualCounts.map((entry) => [entry.followingId, entry._count._all]));
}

async function getSellerNetworkProfiles(
  userIds: string[],
  viewerId?: string,
  reasonById?: Record<string, string>
): Promise<SellerNetworkProfile[]> {
  const uniqueUserIds = [...new Set(userIds)];

  if (!uniqueUserIds.length) {
    return [];
  }

  const [users, activeListings, viewerFollows, mutualCounts] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: {
          in: uniqueUserIds
        }
      },
      select: sellerNetworkProfileSelect
    }),
    prisma.listing.findMany({
      where: {
        sellerId: {
          in: uniqueUserIds
        },
        status: ListingStatus.ACTIVE
      },
      orderBy: {
        createdAt: "desc"
      },
      select: sellerPreviewListingSelect
    }),
    viewerId
      ? prisma.follow.findMany({
          where: {
            followerId: viewerId,
            followingId: {
              in: uniqueUserIds
            }
          },
          select: {
            followingId: true
          }
        })
      : Promise.resolve([]),
    getMutualFollowCountMap(uniqueUserIds, viewerId)
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const listingsBySellerId = new Map<string, SellerPreviewListing[]>();

  for (const listing of activeListings) {
    const bucket = listingsBySellerId.get(listing.sellerId) ?? [];
    bucket.push(listing);
    listingsBySellerId.set(listing.sellerId, bucket);
  }

  const viewerFollowingSet = new Set(viewerFollows.map((entry) => entry.followingId));

  const profiles: SellerNetworkProfile[] = [];

  for (const userId of uniqueUserIds) {
    const user = usersById.get(userId);

    if (!user) {
      continue;
    }

    const listings = listingsBySellerId.get(userId) ?? [];

    profiles.push({
      ...toPublicUserProfile(user),
      followerCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing: viewerFollowingSet.has(userId),
      isSelf: viewerId === userId,
      mutualCount: mutualCounts.get(userId) ?? 0,
      styleTags: deriveStyleTagsFromListings(listings),
      activeListingCount: listings.length,
      recentDropAt: listings[0]?.createdAt.toISOString() ?? null,
      reason: reasonById?.[userId]
    });
  }

  return profiles;
}

function buildSuggestionReason(params: {
  mutualCount: number;
  styleTags: string[];
  preferredTags: Set<string>;
  preferredCategories: Set<Category>;
  listings: SellerPreviewListing[];
  followerCount: number;
  favoriteCount: number;
}) {
  const { mutualCount, styleTags, preferredTags, preferredCategories, listings, followerCount, favoriteCount } = params;

  if (mutualCount > 0) {
    return `${mutualCount} people you follow also follow this seller`;
  }

  const matchingTag = styleTags.find((tag) => preferredTags.has(tag));
  if (matchingTag) {
    return `Matches your ${matchingTag.toLowerCase()} saves`;
  }

  const matchingCategory = listings.find((listing) => preferredCategories.has(listing.category));
  if (matchingCategory) {
    return `Aligned with the ${matchingCategory.category.toLowerCase()} finds you save`;
  }

  if (favoriteCount >= 4 || followerCount >= 6) {
    return "Popular on Grounds";
  }

  if (listings.length >= 3) {
    return "Regular new drops";
  }

  if (styleTags.length) {
    return `Fresh ${styleTags[0].toLowerCase()} closet`;
  }

  return "Seller to watch";
}

export async function getUserSummaryByUsername(username: string) {
  return prisma.user.findUnique({
    where: {
      username
    },
    select: publicUserProfileSelect
  });
}

export async function getUserSocialSnapshot(userId: string, viewerId?: string): Promise<UserSocialSnapshot | null> {
  const profile = (await getSellerNetworkProfiles([userId], viewerId))[0];

  if (!profile) {
    return null;
  }

  return {
    user: {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      profileImageUrl: profile.profileImageUrl,
      bio: profile.bio,
      gradYear: profile.gradYear,
      favoritePickup: profile.favoritePickup
    },
    followerCount: profile.followerCount,
    followingCount: profile.followingCount,
    isFollowing: profile.isFollowing,
    isSelf: profile.isSelf,
    mutualCount: profile.mutualCount,
    styleTags: profile.styleTags,
    activeListingCount: profile.activeListingCount,
    recentDropAt: profile.recentDropAt
  };
}

export async function getFollowList(
  userId: string,
  direction: "followers" | "following",
  viewerId?: string,
  page = 1,
  limit = 12
): Promise<FollowListResult> {
  const pagination = normalizePage(page, limit);

  const where =
    direction === "followers"
      ? ({ followingId: userId } satisfies Prisma.FollowWhereInput)
      : ({ followerId: userId } satisfies Prisma.FollowWhereInput);

  const total = await prisma.follow.count({ where });

  const ids =
    direction === "followers"
      ? (
          await prisma.follow.findMany({
            where,
            orderBy: {
              createdAt: "desc"
            },
            skip: pagination.skip,
            take: pagination.limit,
            select: {
              followerId: true
            }
          })
        ).map((entry) => entry.followerId)
      : (
          await prisma.follow.findMany({
            where,
            orderBy: {
              createdAt: "desc"
            },
            skip: pagination.skip,
            take: pagination.limit,
            select: {
              followingId: true
            }
          })
        ).map((entry) => entry.followingId);

  const items = await getSellerNetworkProfiles(ids, viewerId);

  return {
    userId,
    total,
    page: pagination.page,
    hasMore: pagination.skip + pagination.limit < total,
    items
  };
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("You can’t follow yourself.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true }
  });

  if (!existingUser) {
    throw new Error("User not found.");
  }

  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId,
        followingId
      }
    },
    create: {
      followerId,
      followingId
    },
    update: {}
  });

  return getUserSocialSnapshot(followingId, followerId);
}

export async function unfollowUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("You can’t unfollow yourself.");
  }

  await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId
    }
  });

  return getUserSocialSnapshot(followingId, followerId);
}

export async function getFollowingFeed(userId: string, page = 1, limit = 8) {
  const pagination = normalizePage(page, limit);

  const where = {
    status: ListingStatus.ACTIVE,
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
      include: {
        seller: {
          select: {
            ...publicUserProfileSelect,
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
          }
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
      }
    })
  ]);

  return {
    total,
    page: pagination.page,
    hasMore: pagination.skip + pagination.limit < total,
    items: listings
  };
}

export async function getSuggestedSellers(viewerId?: string, limit = 6) {
  const safeLimit = Math.min(Math.max(limit, 1), 12);
  const viewerFollowingIds = await getViewerFollowingIds(viewerId);
  const excludedUserIds = viewerId ? [viewerId, ...viewerFollowingIds] : [];

  const [viewerFavorites, candidateListings] = await Promise.all([
    viewerId
      ? prisma.favorite.findMany({
          where: {
            userId: viewerId
          },
          select: {
            listing: {
              select: {
                category: true,
                title: true,
                description: true
              }
            }
          }
        })
      : Promise.resolve([]),
    prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        sellerId: {
          notIn: excludedUserIds
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 120,
      select: sellerPreviewListingSelect
    })
  ]);

  const groupedListings = new Map<string, SellerPreviewListing[]>();

  for (const listing of candidateListings) {
    const bucket = groupedListings.get(listing.sellerId) ?? [];
    bucket.push(listing);
    groupedListings.set(listing.sellerId, bucket);
  }

  const candidateIds = [...groupedListings.keys()].slice(0, 24);
  const preferredSignals = buildPreferredSignals(viewerFavorites.map((entry) => entry.listing));
  const baseProfiles = await getSellerNetworkProfiles(candidateIds, viewerId);

  const ranked = baseProfiles
    .map((profile) => {
      const listings = groupedListings.get(profile.id) ?? [];
      const favoriteCount = listings.reduce((sum, listing) => sum + listing.favorites.length, 0);
      const fashionScore = getFashionFocusScore(listings);
      const overlapScore = listings.reduce((sum, listing) => {
        return sum + (preferredSignals.categories.has(listing.category) ? 8 : 0);
      }, 0);
      const styleOverlapScore = profile.styleTags.reduce((sum, tag) => {
        return sum + (preferredSignals.tags.has(tag) ? 6 : 0);
      }, 0);
      const popularityScore = Math.min(profile.followerCount, 12) * 1.5 + favoriteCount * 2;
      const activeScore = Math.min(profile.activeListingCount, 5) * 4;
      const recencyScore = profile.recentDropAt
        ? Math.max(0, 12 - Math.floor((Date.now() - new Date(profile.recentDropAt).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        ...profile,
        reason: buildSuggestionReason({
          mutualCount: profile.mutualCount,
          styleTags: profile.styleTags,
          preferredTags: preferredSignals.tags,
          preferredCategories: preferredSignals.categories,
          listings,
          followerCount: profile.followerCount,
          favoriteCount
        }),
        score: fashionScore * 0.6 + overlapScore + styleOverlapScore + popularityScore + activeScore + recencyScore + profile.mutualCount * 6
      };
    })
    .filter((profile) => profile.activeListingCount > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length && !viewerId) {
    return [];
  }

  return ranked.slice(0, safeLimit).map((entry) => {
    const { score, ...profile } = entry;
    void score;
    return profile;
  });
}

export async function getMutualsForUser(userId: string, viewerId?: string, limit = 6) {
  if (!viewerId || viewerId === userId) {
    return {
      userId,
      count: 0,
      items: [] as SellerNetworkProfile[]
    };
  }

  const viewerFollowingIds = await getViewerFollowingIds(viewerId);

  if (!viewerFollowingIds.length) {
    return {
      userId,
      count: 0,
      items: [] as SellerNetworkProfile[]
    };
  }

  const [count, mutualEntries] = await Promise.all([
    prisma.follow.count({
      where: {
        followingId: userId,
        followerId: {
          in: viewerFollowingIds
        }
      }
    }),
    prisma.follow.findMany({
      where: {
        followingId: userId,
        followerId: {
          in: viewerFollowingIds
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      select: {
        followerId: true
      }
    })
  ]);

  const items = await getSellerNetworkProfiles(mutualEntries.map((entry) => entry.followerId), viewerId);

  return {
    userId,
    count,
    items
  };
}

export async function getPopularSellers(viewerId?: string, limit = 6) {
  return getSuggestedSellers(viewerId, limit);
}

export function countFashionListings(listings: SellerPreviewListing[]) {
  return listings.filter(isFashionFocusedListing).length;
}
