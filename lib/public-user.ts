import { Prisma } from "@prisma/client";

const publicUserSummaryShape = {
  id: true,
  name: true,
  username: true,
  image: true,
  profileImageUrl: true
} satisfies Prisma.UserSelect;

export const publicUserSummarySelect = Prisma.validator<Prisma.UserSelect>()(publicUserSummaryShape);

export const publicUserProfileSelect = Prisma.validator<Prisma.UserSelect>()({
  ...publicUserSummaryShape,
  bio: true,
  gradYear: true,
  favoritePickup: true
});

type PublicUserSummaryRecord = Prisma.UserGetPayload<{
  select: typeof publicUserSummarySelect;
}>;

type PublicUserProfileRecord = Prisma.UserGetPayload<{
  select: typeof publicUserProfileSelect;
}>;

export type PublicUserSummary = {
  id: string;
  name: string | null;
  username: string;
  profileImageUrl: string | null;
};

export type PublicUserProfile = PublicUserSummary & {
  bio: string | null;
  gradYear: number | null;
  favoritePickup: string | null;
};

type UserAvatarLike = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  profileImageUrl: string | null;
};

function resolveProfileImage(user: UserAvatarLike) {
  return user.profileImageUrl ?? user.image ?? null;
}

export function toPublicUserSummary(user: PublicUserSummaryRecord | UserAvatarLike): PublicUserSummary {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    profileImageUrl: resolveProfileImage(user)
  };
}

export function toPublicUserProfile(user: PublicUserProfileRecord): PublicUserProfile {
  return {
    ...toPublicUserSummary(user),
    bio: user.bio,
    gradYear: user.gradYear,
    favoritePickup: user.favoritePickup
  };
}
