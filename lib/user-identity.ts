import type { SellerKind } from "@prisma/client";

import { slugify } from "@/lib/utils";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,22}[a-z0-9])$/;

type IdentityLike = {
  name?: string | null;
  username: string;
  usernameConfirmed?: boolean | null;
  sellerKind?: SellerKind | null;
  verifiedShopName?: string | null;
};

export function normalizeDisplayName(value?: string | null) {
  const trimmed = value?.trim().replace(/\s+/gu, " ");
  return trimmed ? trimmed.slice(0, 80) : null;
}

export function normalizeUsername(value?: string | null) {
  if (!value) return "";

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/['’.]/gu, "")
    .replace(/\s+/gu, "-")
    .replace(/[^a-z0-9_-]/gu, "-")
    .replace(/-{2,}/gu, "-")
    .replace(/_{2,}/gu, "_")
    .replace(/^[-_]+|[-_]+$/gu, "");

  return normalized.slice(0, USERNAME_MAX_LENGTH).replace(/^[-_]+|[-_]+$/gu, "");
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(value);
}

function normalizeIdentitySeed(value?: string | null) {
  return normalizeUsername(value).replace(/[-_]/gu, "");
}

function getNameBasedCandidates(displayName?: string | null) {
  const normalizedName = normalizeDisplayName(displayName);
  if (!normalizedName) return [];

  const slugCandidate = normalizeUsername(slugify(normalizedName));
  const compactCandidate = normalizeIdentitySeed(normalizedName);
  const firstToken = normalizeIdentitySeed(normalizedName.split(" ")[0]);

  return [slugCandidate, compactCandidate, firstToken].filter((candidate) => candidate.length >= USERNAME_MIN_LENGTH);
}

export function getUsernameCandidates({
  requestedUsername,
  displayName,
  fallbackPrefix = "grounds"
}: {
  requestedUsername?: string | null;
  displayName?: string | null;
  fallbackPrefix?: string;
}) {
  const candidates = [
    normalizeUsername(requestedUsername),
    ...getNameBasedCandidates(displayName),
    normalizeUsername(fallbackPrefix)
  ].filter(Boolean);

  return [...new Set(candidates)].filter((candidate) => candidate.length >= USERNAME_MIN_LENGTH);
}

export function usernameMatchesEmailLocalPart(username: string, email: string) {
  const localPart = email.split("@").at(0)?.trim().toLowerCase() ?? "";
  return normalizeUsername(username) === normalizeUsername(localPart);
}

export function getPublicUsername(username: string, usernameConfirmed?: boolean | null) {
  return usernameConfirmed === false ? null : username;
}

function looksLikePlaceholderDisplayName(name: string, username: string, usernameConfirmed?: boolean | null) {
  const normalizedName = normalizeIdentitySeed(name);
  if (!normalizedName) return true;

  if (normalizedName !== normalizeIdentitySeed(username)) {
    return false;
  }

  return usernameConfirmed === false;
}

export function getPublicDisplayName(user: IdentityLike) {
  const verifiedShopName = normalizeDisplayName(user.verifiedShopName);
  if (verifiedShopName) {
    return verifiedShopName;
  }

  const displayName = normalizeDisplayName(user.name);
  if (displayName && !looksLikePlaceholderDisplayName(displayName, user.username, user.usernameConfirmed)) {
    return displayName;
  }

  const publicUsername = getPublicUsername(user.username, user.usernameConfirmed);
  if (publicUsername) {
    return publicUsername;
  }

  return user.sellerKind === "VERIFIED_SHOP" ? "Verified Shop" : "UVA Seller";
}

export function getEditableDisplayName(user: IdentityLike) {
  const verifiedShopName = normalizeDisplayName(user.verifiedShopName);
  if (verifiedShopName) {
    return verifiedShopName;
  }

  const displayName = normalizeDisplayName(user.name);
  if (displayName && !looksLikePlaceholderDisplayName(displayName, user.username, user.usernameConfirmed)) {
    return displayName;
  }

  return "";
}

export function getAccountDisplayName(user: IdentityLike) {
  const verifiedShopName = normalizeDisplayName(user.verifiedShopName);
  if (verifiedShopName) {
    return verifiedShopName;
  }

  const displayName = normalizeDisplayName(user.name);
  if (displayName && !looksLikePlaceholderDisplayName(displayName, user.username, user.usernameConfirmed)) {
    return displayName;
  }

  return user.sellerKind === "VERIFIED_SHOP" ? "HoosFinds verified shop" : "HoosFinds seller";
}

export function needsPublicIdentitySetup(user: IdentityLike) {
  const displayName = normalizeDisplayName(user.verifiedShopName || user.name);
  return !displayName || user.usernameConfirmed === false;
}
