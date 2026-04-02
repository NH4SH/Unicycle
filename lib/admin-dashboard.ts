import "server-only";

import { ListingModerationStatus, OrderStatus, Prisma, TransactionStatus, UserRole, VerifiedSellerApplicationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const adminApplicationInclude = Prisma.validator<Prisma.VerifiedSellerApplicationInclude>()({
  reviewedBy: {
    select: {
      id: true,
      name: true,
      username: true
    }
  },
  approvedUser: {
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      sellerKind: true,
      verifiedShopApprovedAt: true
    }
  }
});

const adminListingInclude = Prisma.validator<Prisma.ListingInclude>()({
  seller: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      sellerKind: true
    }
  }
});

const adminUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  sellerKind: true,
  verifiedShopApprovedAt: true,
  createdAt: true,
  listings: {
    select: {
      id: true,
      status: true,
      moderationStatus: true,
      createdAt: true
    }
  },
  messages: {
    select: {
      id: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  },
  buyerOrders: {
    select: {
      id: true,
      status: true,
      createdAt: true
    }
  },
  sellerTransactions: {
    select: {
      id: true,
      status: true,
      createdAt: true
    }
  },
  bans: {
    where: {
      revokedAt: null
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 1,
    select: {
      id: true,
      reason: true,
      endsAt: true,
      createdAt: true
    }
  }
});

const adminAuditInclude = Prisma.validator<Prisma.AdminAuditLogInclude>()({
  actor: {
    select: {
      id: true,
      name: true,
      username: true
    }
  },
  targetUser: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true
    }
  },
  targetListing: {
    select: {
      id: true,
      title: true
    }
  },
  targetVerifiedSellerApplication: {
    select: {
      id: true,
      businessName: true,
      email: true
    }
  }
});

function getMostRecentDate(dates: Array<Date | null | undefined>) {
  return dates
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
}

function buildDailySeries(entries: Date[], days: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const buckets = new Map<string, number>();
  for (let index = 0; index < days; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }

  for (const entry of entries) {
    const key = new Date(entry).toISOString().slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

export async function getAdminDashboardData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalListings,
    activeListings,
    soldListings,
    pendingHandoffs,
    removedListings,
    hiddenListings,
    pendingApplications,
    approvedVerifiedShops,
    paidOrders,
    paidOrderAggregates,
    recentSales,
    applications,
    recentUsers,
    recentListings,
    recentAuditLog,
    recentUserRows,
    recentMessages,
    recentListingActivity,
    recentOrders,
    recentTransactions,
    recentUserSignups
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({
      where: {
        status: "ACTIVE",
        moderationStatus: ListingModerationStatus.VISIBLE
      }
    }),
    prisma.listing.count({
      where: {
        status: "COMPLETED"
      }
    }),
    prisma.listing.count({
      where: {
        status: "PENDING_CONFIRMATION"
      }
    }),
    prisma.listing.count({
      where: {
        moderationStatus: ListingModerationStatus.REMOVED
      }
    }),
    prisma.listing.count({
      where: {
        moderationStatus: ListingModerationStatus.HIDDEN
      }
    }),
    prisma.verifiedSellerApplication.count({
      where: {
        status: VerifiedSellerApplicationStatus.PENDING
      }
    }),
    prisma.user.count({
      where: {
        role: UserRole.VERIFIED_SHOP,
        verifiedShopApprovedAt: {
          not: null
        }
      }
    }),
    prisma.order.count({
      where: {
        status: OrderStatus.PAID
      }
    }),
    prisma.order.aggregate({
      where: {
        status: OrderStatus.PAID
      },
      _sum: {
        amountCents: true,
        buyerTotalCents: true,
        buyerFeeTotalCents: true,
        sellerFeeCents: true,
        perOrderFeeCents: true
      }
    }),
    prisma.order.findMany({
      where: {
        status: OrderStatus.PAID
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8,
      include: {
        listing: {
          select: {
            id: true,
            title: true
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    }),
    prisma.verifiedSellerApplication.findMany({
      include: adminApplicationInclude,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 24
    }),
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 16,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        sellerKind: true,
        createdAt: true
      }
    }),
    prisma.listing.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 16,
      include: adminListingInclude
    }),
    prisma.adminAuditLog.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 20,
      include: adminAuditInclude
    }),
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 20,
      select: adminUserSelect
    }),
    prisma.message.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        senderId: true,
        createdAt: true
      }
    }),
    prisma.listing.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        sellerId: true,
        createdAt: true
      }
    }),
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        buyerId: true,
        createdAt: true
      }
    }),
    prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        sellerId: true,
        buyerId: true,
        createdAt: true
      }
    }),
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: fourteenDaysAgo
        }
      },
      select: {
        createdAt: true
      }
    })
  ]);

  const activeUserIds = new Set<string>();
  for (const record of recentMessages) activeUserIds.add(record.senderId);
  for (const record of recentListingActivity) activeUserIds.add(record.sellerId);
  for (const record of recentOrders) activeUserIds.add(record.buyerId);
  for (const record of recentTransactions) {
    activeUserIds.add(record.sellerId);
    activeUserIds.add(record.buyerId);
  }

  const platformRevenueCents =
    (paidOrderAggregates._sum.buyerFeeTotalCents ?? 0) +
    (paidOrderAggregates._sum.sellerFeeCents ?? 0) +
    (paidOrderAggregates._sum.perOrderFeeCents ?? 0);

  return {
    overview: {
      totalUsers,
      activeUsers30d: activeUserIds.size,
      newUsersSeries: buildDailySeries(recentUserSignups.map((user) => user.createdAt), 14),
      totalListings,
      activeListings,
      soldListings,
      pendingHandoffs,
      removedListings,
      hiddenListings,
      pendingApplications,
      approvedVerifiedShops,
      paidOrders,
      gmvCents: paidOrderAggregates._sum.amountCents ?? 0,
      buyerVolumeCents: paidOrderAggregates._sum.buyerTotalCents ?? 0,
      platformRevenueCents
    },
    applications,
    recentUsers,
    recentListings,
    recentSales,
    recentAuditLog,
    userActivitySummaries: recentUserRows.map((user) => {
      const latestActivity = getMostRecentDate([
        user.createdAt,
        user.listings[0]?.createdAt,
        user.messages[0]?.createdAt,
        user.buyerOrders[0]?.createdAt,
        user.sellerTransactions[0]?.createdAt
      ]);

      const activeBan = user.bans[0];

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        sellerKind: user.sellerKind,
        verifiedShopApprovedAt: user.verifiedShopApprovedAt,
        createdAt: user.createdAt,
        latestActivity,
        listingCount: user.listings.length,
        liveListingCount: user.listings.filter(
          (listing) => listing.status === "ACTIVE" && listing.moderationStatus === ListingModerationStatus.VISIBLE
        ).length,
        purchaseCount: user.buyerOrders.length,
        completedSalesCount: user.sellerTransactions.filter((transaction) => transaction.status === TransactionStatus.COMPLETED).length,
        currentBan: activeBan
          ? {
              id: activeBan.id,
              reason: activeBan.reason,
              endsAt: activeBan.endsAt,
              createdAt: activeBan.createdAt
            }
          : null
      };
    })
  };
}
