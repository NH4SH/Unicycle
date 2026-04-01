import type { SellerKind, UserRole } from "@prisma/client";

import { isUvaEmail } from "@/lib/domain";

export type AccessAwareUser = {
  email: string;
  role: UserRole;
  sellerKind: SellerKind;
  verifiedShopApprovedAt: Date | string | null;
};

export function isAdminUser(user: Pick<AccessAwareUser, "role"> | null | undefined) {
  return user?.role === "ADMIN";
}

export function isApprovedVerifiedShop(user: Pick<AccessAwareUser, "sellerKind" | "verifiedShopApprovedAt"> | null | undefined) {
  return user?.sellerKind === "VERIFIED_SHOP" && Boolean(user.verifiedShopApprovedAt);
}

export function canUserSignIn(user: AccessAwareUser | null | undefined) {
  if (!user) return false;
  return isUvaEmail(user.email) || isApprovedVerifiedShop(user) || isAdminUser(user);
}

export function canUserBuy(user: Pick<AccessAwareUser, "email"> | null | undefined) {
  if (!user) return false;
  return isUvaEmail(user.email);
}

export function canUserSell(user: AccessAwareUser | null | undefined) {
  if (!user) return false;
  return isUvaEmail(user.email) || isApprovedVerifiedShop(user);
}

export function getSellerKindLabel(
  user: Pick<AccessAwareUser, "sellerKind" | "verifiedShopApprovedAt"> | null | undefined
) {
  if (isApprovedVerifiedShop(user)) {
    return "Verified Shop";
  }

  return "Student Seller";
}

export function getSellerKindDescriptor(
  user: Pick<AccessAwareUser, "sellerKind" | "verifiedShopApprovedAt"> | null | undefined
) {
  if (isApprovedVerifiedShop(user)) {
    return "Reviewed local partner";
  }

  return "UVA student seller";
}
