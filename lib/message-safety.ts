import "server-only";

import { prisma } from "@/lib/prisma";

type UserBlockRelationship = {
  blockerUserId: string;
  blockedUserId: string;
} | null;

export async function getUserBlockRelationship(userId: string, otherUserId: string) {
  return (
    prisma as typeof prisma & { userBlock: { findFirst: (args: unknown) => Promise<UserBlockRelationship> } }
  ).userBlock.findFirst({
    where: {
      OR: [
        {
          blockerUserId: userId,
          blockedUserId: otherUserId
        },
        {
          blockerUserId: otherUserId,
          blockedUserId: userId
        }
      ]
    }
  });
}

export async function assertUsersCanMessageEachOther(userId: string, otherUserId: string) {
  const block = await getUserBlockRelationship(userId, otherUserId);
  if (!block) {
    return null;
  }

  if (block.blockerUserId === userId) {
    throw new Error("You blocked this user, so messaging is disabled until you unblock them.");
  }

  throw new Error("This user has blocked further contact on HoosFinds.");
}
