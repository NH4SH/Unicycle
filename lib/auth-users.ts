import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/domain";
import { getUsernameCandidates, normalizeDisplayName } from "@/lib/user-identity";
import { getSystemAssignedRoleForEmail } from "@/lib/system-users";

async function reserveUniqueUsername(base: string) {
  let attempt = base;
  let count = 0;

  while (count < 40) {
    const exists = await prisma.user.findUnique({ where: { username: attempt } });
    if (!exists) return attempt;
    count += 1;
    attempt = `${base}${count}`;
  }

  return `${base}${Date.now().toString().slice(-4)}`;
}

export async function reserveUsername({
  requestedUsername,
  displayName,
  fallbackPrefix
}: {
  requestedUsername?: string | null;
  displayName?: string | null;
  fallbackPrefix?: string;
}) {
  const candidates = getUsernameCandidates({
    requestedUsername,
    displayName,
    fallbackPrefix
  });

  for (const candidate of candidates) {
    const reserved = await reserveUniqueUsername(candidate);
    if (reserved) {
      return reserved;
    }
  }

  const safeFallback = getUsernameCandidates({ fallbackPrefix }).at(0) ?? "grounds";
  return reserveUniqueUsername(safeFallback);
}

export async function findUserByNormalizedEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email: normalizeEmail(email)
    }
  });
}

export async function createPasswordUser({
  email,
  name,
  username,
  passwordHash,
  emailVerified
}: {
  email: string;
  name?: string | null;
  username?: string | null;
  passwordHash?: string | null;
  emailVerified?: Date | null;
}) {
  const normalizedEmail = normalizeEmail(email);
  const displayName = normalizeDisplayName(name);
  const reservedUsername = await reserveUsername({
    requestedUsername: username,
    displayName,
    fallbackPrefix: "grounds"
  });

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      name: displayName,
      username: reservedUsername,
      usernameConfirmed: true,
      passwordHash: passwordHash ?? null,
      emailVerified: emailVerified ?? null,
      role: getSystemAssignedRoleForEmail(normalizedEmail) ?? "USER"
    }
  });
}

export async function createVerifiedShopUser({
  email,
  businessName,
  description,
  neighborhood,
  address,
  instagram,
  website
}: {
  email: string;
  businessName: string;
  description?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  instagram?: string | null;
  website?: string | null;
}) {
  const normalizedEmail = normalizeEmail(email);
  const displayName = normalizeDisplayName(businessName);
  const reservedUsername = await reserveUsername({
    displayName,
    fallbackPrefix: "shop"
  });

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      name: displayName,
      username: reservedUsername,
      usernameConfirmed: true,
      bio: description?.trim() || null,
      role: getSystemAssignedRoleForEmail(normalizedEmail) ?? "VERIFIED_SHOP",
      sellerKind: "VERIFIED_SHOP",
      verifiedShopName: displayName,
      verifiedShopApprovedAt: null,
      verifiedShopNeighborhood: neighborhood?.trim() || null,
      verifiedShopAddress: address?.trim() || null,
      verifiedShopInstagram: instagram?.trim() || null,
      verifiedShopWebsite: website?.trim() || null
    }
  });
}

export async function findOrCreateBypassedUser(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    if (!existingUser.emailVerified) {
      return prisma.user.update({
        where: { id: existingUser.id },
        data: {
          emailVerified: new Date()
        }
      });
    }

    return existingUser;
  }

  return createPasswordUser({
    email: normalizedEmail,
    passwordHash: null,
    emailVerified: new Date()
  });
}
