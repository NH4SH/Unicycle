import "server-only";

import { AdminAuditActionType, ListingModerationStatus, Prisma, UserRole } from "@prisma/client";

import { notifyAccountAlert } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const activeBanInclude = Prisma.validator<Prisma.UserBanInclude>()({
  createdBy: {
    select: {
      id: true,
      name: true,
      username: true
    }
  },
  revokedBy: {
    select: {
      id: true,
      name: true,
      username: true
    }
  }
});

export type ActiveUserBanRecord = Prisma.UserBanGetPayload<{
  include: typeof activeBanInclude;
}>;

function activeBanWhere(userId: string, now = new Date()): Prisma.UserBanWhereInput {
  return {
    userId,
    revokedAt: null,
    startsAt: {
      lte: now
    },
    OR: [
      {
        endsAt: null
      },
      {
        endsAt: {
          gt: now
        }
      }
    ]
  };
}

export async function getActiveUserBan(userId?: string | null) {
  if (!userId) {
    return null;
  }

  return prisma.userBan.findFirst({
    where: activeBanWhere(userId),
    include: activeBanInclude,
    orderBy: {
      createdAt: "desc"
    }
  });
}

export function formatUserBanMessage(ban: Pick<ActiveUserBanRecord, "reason" | "endsAt">) {
  if (!ban.endsAt) {
    return `Your account is restricted from marketplace actions. Reason: ${ban.reason}.`;
  }

  return `Your account is restricted from marketplace actions until ${ban.endsAt.toLocaleString()}. Reason: ${ban.reason}.`;
}

export async function assertUserCanAccessMarketplace(userId?: string | null) {
  const activeBan = await getActiveUserBan(userId);

  if (activeBan) {
    throw new Error(formatUserBanMessage(activeBan));
  }

  return null;
}

export function isListingPubliclyVisible(
  listing: Pick<{ moderationStatus: ListingModerationStatus }, "moderationStatus"> | null | undefined
) {
  return listing?.moderationStatus === ListingModerationStatus.VISIBLE;
}

export async function moderateListing(params: {
  listingId: string;
  actorId: string;
  action: "hide" | "remove" | "restore";
  reason: string;
  internalNotes?: string;
}) {
  const listing = await prisma.listing.findUnique({
    where: {
      id: params.listingId
    },
    select: {
      id: true,
      moderationStatus: true,
      sellerId: true,
      title: true
    }
  });

  if (!listing) {
    throw new Error("Listing not found.");
  }

  const reason = params.reason.trim();
  if (!reason && params.action !== "restore") {
    throw new Error("Add a removal reason so the moderation history stays clear.");
  }

  const moderatedAt = new Date();

  const status =
    params.action === "hide"
      ? ListingModerationStatus.HIDDEN
      : params.action === "remove"
        ? ListingModerationStatus.REMOVED
        : ListingModerationStatus.VISIBLE;

  const auditAction =
    params.action === "hide"
      ? AdminAuditActionType.LISTING_HIDDEN
      : params.action === "remove"
        ? AdminAuditActionType.LISTING_REMOVED
        : AdminAuditActionType.LISTING_RESTORED;

  const updatedListing = await prisma.$transaction(async (tx) => {
    const updatedListing = await tx.listing.update({
      where: {
        id: listing.id
      },
      data: {
        moderationStatus: status,
        moderationReason: params.action === "restore" ? null : reason,
        moderatedAt,
        moderatedById: params.actorId
      },
      select: {
        id: true,
        moderationStatus: true,
        moderationReason: true,
        moderatedAt: true
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: params.actorId,
        action: auditAction,
        reason: params.action === "restore" ? reason || "Listing restored to public view." : reason,
        notes: params.internalNotes?.trim() || null,
        targetListingId: listing.id,
        targetUserId: listing.sellerId,
        metadata: {
          listingTitle: listing.title,
          previousModerationStatus: listing.moderationStatus
        }
      }
    });

    return updatedListing;
  });

  try {
    await notifyAccountAlert({
      userId: listing.sellerId,
      title:
        params.action === "restore"
          ? `Your listing "${listing.title}" is live again.`
          : params.action === "remove"
            ? `Your listing "${listing.title}" was removed by HoosFinds.`
            : `Your listing "${listing.title}" was hidden by HoosFinds.`,
      body:
        params.action === "restore"
          ? "The listing is visible in the marketplace again."
          : reason,
      href: "/safety",
      externalKey: `listing-moderation:${listing.id}:${params.action}:${moderatedAt.toISOString()}`,
      metadata: {
        listingId: listing.id,
        action: params.action
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[moderation] listing alert failed", error);
    }
  }

  return updatedListing;
}

export async function banUser(params: {
  userId: string;
  actorId: string;
  reason: string;
  internalNotes?: string;
  endsAt?: Date | null;
}) {
  if (params.userId === params.actorId) {
    throw new Error("Admins cannot ban themselves.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: params.userId
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      username: true
    }
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.role === UserRole.ADMIN) {
    throw new Error("Admin accounts cannot be banned from this dashboard.");
  }

  const reason = params.reason.trim();
  if (!reason) {
    throw new Error("Add a ban reason so the moderation record stays useful.");
  }

  if (params.endsAt && params.endsAt.getTime() <= Date.now()) {
    throw new Error("Choose a future end date for a temporary ban.");
  }

  const ban = await prisma.$transaction(async (tx) => {
    await tx.userBan.updateMany({
      where: activeBanWhere(user.id),
      data: {
        revokedAt: new Date(),
        revokedById: params.actorId
      }
    });

    const ban = await tx.userBan.create({
      data: {
        userId: user.id,
        createdById: params.actorId,
        reason,
        internalNotes: params.internalNotes?.trim() || null,
        endsAt: params.endsAt ?? null
      },
      include: activeBanInclude
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: params.actorId,
        action: AdminAuditActionType.USER_BANNED,
        reason,
        notes: params.internalNotes?.trim() || null,
        targetUserId: user.id,
        metadata: {
          email: user.email,
          username: user.username,
          endsAt: ban.endsAt?.toISOString() ?? null
        }
      }
    });

    return ban;
  });

  try {
    await notifyAccountAlert({
      userId: user.id,
      title: params.endsAt ? "Your HoosFinds account is temporarily restricted." : "Your HoosFinds account is restricted.",
      body: formatUserBanMessage({
        reason,
        endsAt: ban.endsAt
      }),
      href: "/safety",
      externalKey: `user-ban:${ban.id}`,
      metadata: {
        banId: ban.id
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[moderation] ban alert failed", error);
    }
  }

  return ban;
}

export async function revokeUserBan(params: {
  userId: string;
  actorId: string;
  internalNotes?: string;
}) {
  const activeBan = await prisma.userBan.findFirst({
    where: activeBanWhere(params.userId),
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!activeBan) {
    throw new Error("This user does not have an active ban.");
  }

  const updatedBan = await prisma.$transaction(async (tx) => {
    const updatedBan = await tx.userBan.update({
      where: {
        id: activeBan.id
      },
      data: {
        revokedAt: new Date(),
        revokedById: params.actorId,
        internalNotes: params.internalNotes?.trim() || activeBan.internalNotes
      },
      include: activeBanInclude
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: params.actorId,
        action: AdminAuditActionType.USER_UNBANNED,
        reason: activeBan.reason,
        notes: params.internalNotes?.trim() || null,
        targetUserId: activeBan.userId
      }
    });

    return updatedBan;
  });

  try {
    await notifyAccountAlert({
      userId: activeBan.userId,
      title: "Your HoosFinds account restriction was lifted.",
      body: "Marketplace actions are available again.",
      href: "/market",
      externalKey: `user-unban:${activeBan.id}`,
      metadata: {
        banId: activeBan.id
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[moderation] unban alert failed", error);
    }
  }

  return updatedBan;
}
