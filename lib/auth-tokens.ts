import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { normalizeUvaEmail } from "@/lib/domain";
import {
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
  PASSWORD_RESET_TOKEN_TTL_MINUTES
} from "@/lib/auth-config";

function hashToken(rawToken: string) {
  // Store only a one-way hash so a database leak does not expose live auth
  // links that could still reset passwords or verify accounts.
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function createRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createEmailVerificationToken(userId: string, email: string) {
  const normalizedEmail = normalizeUvaEmail(email);
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId
    }
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      email: normalizedEmail,
      tokenHash,
      expiresAt
    }
  });

  return {
    rawToken,
    expiresAt
  };
}

export async function createPasswordResetToken(userId: string, email: string) {
  const normalizedEmail = normalizeUvaEmail(email);
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId
    }
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      email: normalizedEmail,
      tokenHash,
      expiresAt
    }
  });

  return {
    rawToken,
    expiresAt
  };
}

export async function consumeEmailVerificationToken(email: string, rawToken: string) {
  const normalizedEmail = normalizeUvaEmail(email);
  const tokenHash = hashToken(rawToken);
  const token = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash }
  });

  if (!token || token.email !== normalizedEmail || token.consumedAt) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (token.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.deleteMany({
      where: {
        userId: token.userId
      }
    });

    return { ok: false as const, reason: "expired" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: token.userId },
      data: {
        emailVerified: new Date()
      }
    });

    await tx.emailVerificationToken.deleteMany({
      where: {
        userId: token.userId
      }
    });
  });

  return { ok: true as const, userId: token.userId, email: token.email };
}

export async function consumePasswordResetToken(email: string, rawToken: string) {
  const normalizedEmail = normalizeUvaEmail(email);
  const tokenHash = hashToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash }
  });

  if (!token || token.email !== normalizedEmail || token.consumedAt) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (token.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: token.userId
      }
    });

    return { ok: false as const, reason: "expired" as const };
  }

  return { ok: true as const, userId: token.userId, email: token.email };
}

export async function clearPasswordResetTokensForUser(userId: string) {
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId
    }
  });
}

export async function clearEmailVerificationTokensForUser(userId: string) {
  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId
    }
  });
}
