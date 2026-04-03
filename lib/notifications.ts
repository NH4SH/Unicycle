import "server-only";

import { NotificationType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendSellerSaleEmail } from "@/lib/transaction-email";
import { getPublicDisplayName } from "@/lib/user-identity";
import { formatCurrencyFromCents } from "@/lib/utils";

const notificationSelect = Prisma.validator<Prisma.NotificationSelect>()({
  id: true,
  type: true,
  title: true,
  body: true,
  href: true,
  isRead: true,
  createdAt: true
});

type NotificationRow = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string;
  isRead: boolean;
  createdAt: string;
};

function serializeNotification(notification: NotificationRow): NotificationListItem {
  return {
    ...notification,
    createdAt: notification.createdAt.toISOString()
  };
}

function getFirstImageUrl(images: Prisma.JsonValue): string | null {
  if (!Array.isArray(images)) {
    return null;
  }

  const match = images.find((entry) => typeof entry === "string" && entry.trim().length > 0);
  return typeof match === "string" ? match : null;
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href: string;
  externalKey?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  if (input.externalKey) {
    return prisma.notification.upsert({
      where: {
        externalKey: input.externalKey
      },
      update: {
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href,
        metadata: input.metadata,
        isRead: false,
        readAt: null
      },
      create: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href,
        externalKey: input.externalKey,
        metadata: input.metadata
      }
    });
  }

  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href,
      metadata: input.metadata
    }
  });
}

export async function listNotificationsForUser(userId: string, limit = 12) {
  const safeLimit = Math.min(Math.max(limit, 1), 40);

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: safeLimit,
      select: notificationSelect
    }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })
  ]);

  return {
    items: items.map(serializeNotification),
    unreadCount
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });
}

export async function notifyListingSold(orderId: string) {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId
    },
    select: {
      id: true,
      amountCents: true,
      sellerId: true,
      sellerSaleEmailSentAt: true,
      listing: {
        select: {
          id: true,
          title: true,
          images: true
        }
      },
      buyer: {
        select: {
          name: true,
          username: true,
          usernameConfirmed: true,
          sellerKind: true,
          verifiedShopName: true
        }
      },
      seller: {
        select: {
          email: true,
          name: true
        }
      },
      transaction: {
        select: {
          conversationId: true
        }
      }
    }
  });

  if (!order) {
    return null;
  }

  const buyerName = getPublicDisplayName(order.buyer);
  const href = order.transaction?.conversationId
    ? `/messages?conversation=${order.transaction.conversationId}`
    : "/purchases?tab=sales";
  const formattedPrice = formatCurrencyFromCents(order.amountCents, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  await createNotification({
    userId: order.sellerId,
    type: NotificationType.LISTING_SOLD,
    title: `Your ${order.listing.title} sold.`,
    body: `${buyerName} checked out your listing for ${formattedPrice}.`,
    href,
    externalKey: `listing-sold:${order.id}`,
    metadata: {
      orderId: order.id,
      listingId: order.listing.id
    }
  });

  if (order.sellerSaleEmailSentAt) {
    return null;
  }

  try {
    await sendSellerSaleEmail({
      sellerEmail: order.seller.email,
      sellerName: order.seller.name,
      buyerName,
      listingTitle: order.listing.title,
      listingImageUrl: getFirstImageUrl(order.listing.images),
      salePriceCents: order.amountCents,
      href
    });

    await prisma.order.updateMany({
      where: {
        id: order.id,
        sellerSaleEmailSentAt: null
      },
      data: {
        sellerSaleEmailSentAt: new Date()
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[notifications] seller sale email failed", error);
    }
  }

  return null;
}

export async function notifyMessageReceived(messageId: string) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId
    },
    select: {
      id: true,
      body: true,
      conversationId: true,
      senderId: true,
      sender: {
        select: {
          name: true,
          username: true,
          usernameConfirmed: true,
          sellerKind: true,
          verifiedShopName: true
        }
      },
      conversation: {
        select: {
          buyerId: true,
          sellerId: true,
          listing: {
            select: {
              title: true
            }
          }
        }
      }
    }
  });

  if (!message) {
    return null;
  }

  const recipientId = message.senderId === message.conversation.buyerId ? message.conversation.sellerId : message.conversation.buyerId;
  const senderName = getPublicDisplayName(message.sender);
  const preview = message.body.trim().replace(/\s+/g, " ").slice(0, 80);

  await createNotification({
    userId: recipientId,
    type: NotificationType.MESSAGE_RECEIVED,
    title: `${senderName} sent you a message.`,
    body: message.conversation.listing?.title ? `On ${message.conversation.listing.title}: "${preview}"` : `"${preview}"`,
    href: `/messages?conversation=${message.conversationId}`,
    externalKey: `message:${message.id}`,
    metadata: {
      messageId: message.id,
      conversationId: message.conversationId
    }
  });

  return null;
}

export async function notifyUserFollowed(followerId: string, followingId: string) {
  const follower = await prisma.user.findUnique({
    where: {
      id: followerId
    },
    select: {
      name: true,
      username: true,
      usernameConfirmed: true,
      sellerKind: true,
      verifiedShopName: true
    }
  });

  if (!follower) {
    return null;
  }

  const followerName = getPublicDisplayName(follower);

  await createNotification({
    userId: followingId,
    type: NotificationType.FOLLOW_RECEIVED,
    title: `${followerName} followed you.`,
    body: "Your closet just landed on someone’s radar.",
    href: `/u/${follower.username}`,
    externalKey: `follow:${followerId}:${followingId}`,
    metadata: {
      followerId,
      followingId
    }
  });

  return null;
}

export async function notifyVerifiedSellerDecision(params: {
  userId: string;
  applicationId: string;
  businessName: string;
  status: "APPROVED" | "REJECTED";
}) {
  const title =
    params.status === "APPROVED"
      ? `${params.businessName} was approved as a Verified Shop.`
      : `Your Verified Shop application was not approved.`;
  const body =
    params.status === "APPROVED"
      ? "Your portal, payouts, and listing tools are ready inside HoosFinds."
      : "HoosFinds reviewed your application. You can update your details and apply again if needed.";

  await createNotification({
    userId: params.userId,
    type: params.status === "APPROVED" ? NotificationType.VERIFIED_SELLER_APPROVED : NotificationType.VERIFIED_SELLER_REJECTED,
    title,
    body,
    href: params.status === "APPROVED" ? "/verified-seller/portal" : "/verified-seller",
    externalKey: `verified-seller:${params.applicationId}:${params.status.toLowerCase()}`,
    metadata: {
      applicationId: params.applicationId
    }
  });
}

export async function notifyAccountAlert(params: {
  userId: string;
  title: string;
  body?: string | null;
  href?: string;
  externalKey?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await createNotification({
    userId: params.userId,
    type: NotificationType.ACCOUNT_ALERT,
    title: params.title,
    body: params.body ?? null,
    href: params.href ?? "/safety",
    externalKey: params.externalKey,
    metadata: params.metadata
  });
}
