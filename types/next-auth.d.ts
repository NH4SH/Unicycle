import { DefaultSession } from "next-auth";
import type { SellerKind, UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      usernameConfirmed: boolean;
      publicDisplayName: string;
      publicUsername: string | null;
      gradYear?: number | null;
      favoritePickup?: string | null;
      role: UserRole;
      sellerKind: SellerKind;
      verifiedShopApprovedAt?: string | null;
      canBuy: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    usernameConfirmed: boolean;
    publicDisplayName: string;
    publicUsername: string | null;
    gradYear?: number | null;
    favoritePickup?: string | null;
    image?: string | null;
    role: UserRole;
    sellerKind: SellerKind;
    verifiedShopApprovedAt?: string | null;
    canBuy: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    usernameConfirmed: boolean;
    publicDisplayName: string;
    publicUsername: string | null;
    gradYear?: number | null;
    favoritePickup?: string | null;
    image?: string | null;
    role: UserRole;
    sellerKind: SellerKind;
    verifiedShopApprovedAt?: string | null;
    canBuy: boolean;
  }
}
