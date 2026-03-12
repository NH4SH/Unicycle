import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { getServerSession } from "next-auth";

import { isUvaEmail, normalizeUvaEmail } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function reserveUsername(seed: string) {
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

function getEmailServerConfig() {
  if (process.env.EMAIL_SERVER) {
    return process.env.EMAIL_SERVER;
  }

  return {
    host: process.env.EMAIL_SERVER_HOST || "",
    port: Number(process.env.EMAIL_SERVER_PORT || "587"),
    secure: process.env.EMAIL_SERVER_SECURE === "true",
    auth: {
      user: process.env.EMAIL_SERVER_USER || "",
      pass: process.env.EMAIL_SERVER_PASSWORD || ""
    }
  };
}

const devAuthBypassEnabled =
  process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";

async function findOrCreateUserByEmail(email: string) {
  const normalizedEmail = normalizeUvaEmail(email);
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    return existingUser;
  }

  const username = await reserveUsername(normalizedEmail.split("@")[0] || "hooseller");
  return prisma.user.create({
    data: {
      email: normalizedEmail,
      username,
      name: normalizedEmail.split("@")[0]
    }
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    ...(devAuthBypassEnabled
      ? [
          CredentialsProvider({
            id: "dev-bypass",
            name: "Development bypass",
            credentials: {
              email: {
                label: "UVA email",
                type: "email"
              }
            },
            async authorize(credentials) {
              const email = normalizeUvaEmail(credentials?.email || "");
              if (!isUvaEmail(email)) {
                return null;
              }

              const user = await findOrCreateUserByEmail(email);
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                username: user.username,
                gradYear: user.gradYear,
                favoritePickup: user.favoritePickup
              };
            }
          })
        ]
      : []),
    EmailProvider({
      server: getEmailServerConfig(),
      from: process.env.EMAIL_FROM || "UniCycle <no-reply@unicycle.app>",
      normalizeIdentifier(identifier) {
        return normalizeUvaEmail(identifier);
      }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const identifier = user.email ?? "";

      if (!isUvaEmail(identifier)) {
        const encoded = encodeURIComponent(identifier);
        return `/auth/uva-only?email=${encoded}`;
      }

      if (!identifier) {
        return false;
      }

      const normalizedEmail = normalizeUvaEmail(identifier);
      if (!isUvaEmail(normalizedEmail)) {
        const email = encodeURIComponent(normalizedEmail);
        return `/auth/uva-only?email=${email}`;
      }

      return true;
    },
    async jwt({ token }) {
      if (!token.email) return token;
      const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
      if (!dbUser) return token;

      token.id = dbUser.id;
      token.username = dbUser.username;
      token.gradYear = dbUser.gradYear;
      token.favoritePickup = dbUser.favoritePickup;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.gradYear = token.gradYear;
        session.user.favoritePickup = token.favoritePickup;
      }

      return session;
    }
  },
  events: {
    async createUser({ user }) {
      const baseSeed = user.name || user.email?.split("@")[0] || "hooseller";
      const username = await reserveUsername(baseSeed);
      await prisma.user.update({ where: { id: user.id }, data: { username } });
    }
  }
};

export function getAuthSession() {
  return getServerSession(authOptions);
}

export function isDevAuthBypassEnabled() {
  return devAuthBypassEnabled;
}
