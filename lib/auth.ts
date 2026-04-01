import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";

import { AUTH_ERROR_CODES } from "@/lib/auth-errors";
import {
  assertAuthRuntimeConfiguration,
  isDevAuthBypassEnabled as getDevAuthBypassEnabled
} from "@/lib/auth-config";
import { verifyPassword } from "@/lib/auth-passwords";
import { findOrCreateBypassedUser, findUserByNormalizedEmail } from "@/lib/auth-users";
import { isUvaEmail, normalizeUvaEmail } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

// Development bypass is intentionally impossible in production. It exists only
// so local work can proceed when SMTP is unavailable.
assertAuthRuntimeConfiguration();
const devAuthBypassEnabled = getDevAuthBypassEnabled();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    CredentialsProvider({
      name: "UVA credentials",
      credentials: {
        email: {
          label: "UVA email",
          type: "email"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },
      async authorize(credentials) {
        const email = normalizeUvaEmail(credentials?.email || "");
        const password = credentials?.password || "";

        if (!isUvaEmail(email)) {
          throw new Error(AUTH_ERROR_CODES.DISALLOWED_DOMAIN);
        }

        const user = await findUserByNormalizedEmail(email);
        if (!user) {
          throw new Error(AUTH_ERROR_CODES.USER_NOT_FOUND);
        }

        if (!user.passwordHash) {
          throw new Error(AUTH_ERROR_CODES.PASSWORD_NOT_SET);
        }

        if (!user.emailVerified) {
          throw new Error(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
        }

        const passwordMatches = await verifyPassword(password, user.passwordHash);
        if (!passwordMatches) {
          throw new Error(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.profileImageUrl ?? user.image,
          username: user.username,
          gradYear: user.gradYear,
          favoritePickup: user.favoritePickup
        };
      }
    }),
    ...(devAuthBypassEnabled
      ? [
          CredentialsProvider({
            id: "auth-bypass",
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

              const user = await findOrCreateBypassedUser(email);
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.profileImageUrl ?? user.image,
                username: user.username,
                gradYear: user.gradYear,
                favoritePickup: user.favoritePickup
              };
            }
          })
        ]
      : [])
  ],
  callbacks: {
    async signIn({ user }) {
      const identifier = user.email ?? "";

      if (!isUvaEmail(identifier)) {
        const encoded = encodeURIComponent(identifier);
        return `/auth/uva-only?email=${encoded}`;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.gradYear = user.gradYear;
        token.favoritePickup = user.favoritePickup;
        token.image = typeof user.image === "string" ? user.image : null;
        token.email = user.email;
      }

      if (!token.email) return token;
      const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
      if (!dbUser) return token;

      token.id = dbUser.id;
      token.username = dbUser.username;
      token.gradYear = dbUser.gradYear;
      token.favoritePickup = dbUser.favoritePickup;
      token.image = dbUser.profileImageUrl ?? dbUser.image;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.gradYear = token.gradYear;
        session.user.favoritePickup = token.favoritePickup;
        session.user.image = typeof token.image === "string" ? token.image : null;
      }

      return session;
    }
  }
};

export function getAuthSession() {
  return getServerSession(authOptions);
}

export function isDevAuthBypassEnabled() {
  return devAuthBypassEnabled;
}
