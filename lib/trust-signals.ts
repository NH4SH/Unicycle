import "server-only";

import { prisma } from "@/lib/prisma";
import { type TrustEventTypeValue } from "@/lib/trust-types";

type CreateTrustEventInput = {
  userId: string;
  type: TrustEventTypeValue;
  description?: string;
  metadata?: Record<string, unknown>;
  orderId?: string;
  transactionId?: string;
  listingId?: string;
};

export async function createTrustEvent(input: CreateTrustEventInput) {
  // The trust-event models are present in the schema, but some environments can
  // end up with a stale generated Prisma client. Casting here keeps runtime
  // behavior intact without blocking unrelated product work on client drift.
  return (prisma as typeof prisma & { userTrustEvent: { create: (args: unknown) => Promise<unknown> } }).userTrustEvent.create({
    data: {
      userId: input.userId,
      type: input.type,
      description: input.description,
      metadata: input.metadata,
      orderId: input.orderId,
      transactionId: input.transactionId,
      listingId: input.listingId
    }
  });
}

export async function countRecentTrustEvents(params: {
  userId: string;
  type: TrustEventTypeValue;
  lookbackDays?: number;
}) {
  const since = new Date(Date.now() - (params.lookbackDays ?? 30) * 24 * 60 * 60 * 1000);
  return (
    prisma as typeof prisma & { userTrustEvent: { count: (args: unknown) => Promise<number> } }
  ).userTrustEvent.count({
    where: {
      userId: params.userId,
      type: params.type,
      createdAt: {
        gte: since
      }
    }
  });
}
