import { Prisma } from "@prisma/client";
import { getPublicDisplayName, getPublicUsername } from "@/lib/user-identity";

const publicUserSummaryShape = {
  id: true,
  name: true,
  username: true,
  usernameConfirmed: true,
  image: true,
  profileImageUrl: true,
  sellerKind: true,
  verifiedShopName: true,
  verifiedShopApprovedAt: true
} satisfies Prisma.UserSelect;

export const publicUserSummarySelect = Prisma.validator<Prisma.UserSelect>()(publicUserSummaryShape);

export const publicUserProfileSelect = Prisma.validator<Prisma.UserSelect>()({
  ...publicUserSummaryShape,
  bio: true,
  gradYear: true,
  favoritePickup: true,
  verifiedShopLocation: true,
  verifiedShopInstagram: true,
  verifiedShopWebsite: true
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
  usernameConfirmed: boolean;
  displayName: string;
  publicUsername: string | null;
  profileImageUrl: string | null;
  sellerKind: "STUDENT" | "VERIFIED_SHOP";
  verifiedShopName: string | null;
  verifiedShopApprovedAt: string | null;
};

export type PublicUserProfile = PublicUserSummary & {
  bio: string | null;
  gradYear: number | null;
  favoritePickup: string | null;
  verifiedShopLocation: string | null;
  verifiedShopInstagram: string | null;
  verifiedShopWebsite: string | null;
};

type UserAvatarLike = {
  id: string;
  name: string | null;
  username: string;
  usernameConfirmed?: boolean;
  image: string | null;
  profileImageUrl: string | null;
};

function resolveProfileImage(user: UserAvatarLike) {
  return user.profileImageUrl ?? user.image ?? null;
}

function serializeOptionalDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function toPublicUserSummary(user: PublicUserSummaryRecord | UserAvatarLike): PublicUserSummary {
  const usernameConfirmed = "usernameConfirmed" in user ? user.usernameConfirmed ?? true : true;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    usernameConfirmed,
    displayName: getPublicDisplayName({
      name: user.name,
      username: user.username,
      usernameConfirmed,
      sellerKind: "sellerKind" in user ? user.sellerKind : "STUDENT",
      verifiedShopName: "verifiedShopName" in user ? user.verifiedShopName : null
    }),
    publicUsername: getPublicUsername(user.username, usernameConfirmed),
    profileImageUrl: resolveProfileImage(user),
    sellerKind: "sellerKind" in user ? user.sellerKind : "STUDENT",
    verifiedShopName: "verifiedShopName" in user ? user.verifiedShopName : null,
    verifiedShopApprovedAt: "verifiedShopApprovedAt" in user ? serializeOptionalDate(user.verifiedShopApprovedAt) : null
  };
}

export function toPublicUserProfile(user: PublicUserProfileRecord): PublicUserProfile {
  return {
    ...toPublicUserSummary(user),
    bio: user.bio,
    gradYear: user.gradYear,
    favoritePickup: user.favoritePickup,
    verifiedShopLocation: user.verifiedShopLocation,
    verifiedShopInstagram: user.verifiedShopInstagram,
    verifiedShopWebsite: user.verifiedShopWebsite
  };
}
