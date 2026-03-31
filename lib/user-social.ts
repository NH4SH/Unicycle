import { prisma } from "@/lib/prisma";
import { publicUserProfileSelect, publicUserSummarySelect, toPublicUserProfile, toPublicUserSummary } from "@/lib/public-user";

export async function getUserSocialSnapshot(userId: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUserProfileSelect,
      _count: {
        select: {
          followers: true,
          following: true
        }
      },
      followers: viewerId
        ? {
            where: {
              followerId: viewerId
            },
            select: {
              followerId: true
            },
            take: 1
          }
        : {
            where: {
              followerId: "__viewer_missing__"
            },
            select: {
              followerId: true
            },
            take: 1
          }
    }
  });

  if (!user) {
    return null;
  }

  return {
    user: toPublicUserProfile(user),
    followerCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing: viewerId ? user.followers.length > 0 : false
  };
}

export async function getFollowList(userId: string, direction: "followers" | "following") {
  if (direction === "followers") {
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        follower: {
          select: publicUserSummarySelect
        }
      }
    });

    return followers.map((entry) => toPublicUserSummary(entry.follower));
  }

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      following: {
        select: publicUserSummarySelect
      }
    }
  });

  return following.map((entry) => toPublicUserSummary(entry.following));
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
