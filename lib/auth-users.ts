import { prisma } from "@/lib/prisma";
import { normalizeUvaEmail } from "@/lib/domain";
import { slugify } from "@/lib/utils";

export async function reserveUsername(seed: string) {
  const base = slugify(seed).slice(0, 20) || "hooseller";
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

export async function findUserByNormalizedEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email: normalizeUvaEmail(email)
    }
  });
}

export async function createPasswordUser({
  email,
  name,
  passwordHash,
  emailVerified
}: {
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  emailVerified?: Date | null;
}) {
  const normalizedEmail = normalizeUvaEmail(email);
  const username = await reserveUsername(name || normalizedEmail.split("@")[0] || "hooseller");

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail.split("@")[0] || null,
      username,
      passwordHash: passwordHash ?? null,
      emailVerified: emailVerified ?? null
    }
  });
}

export async function findOrCreateBypassedUser(email: string) {
  const normalizedEmail = normalizeUvaEmail(email);
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
