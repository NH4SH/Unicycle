import "server-only";

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";

import { AUTH_ERROR_CODES } from "@/lib/auth-errors";
import {
  assertAuthRuntimeConfiguration,
  isDevAuthBypassEnabled as getDevAuthBypassEnabled
} from "@/lib/auth-runtime.server";
import { verifyPassword } from "@/lib/auth-passwords";
import { findOrCreateBypassedUser, findUserByNormalizedEmail } from "@/lib/auth-users";
import { normalizeEmail } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { getPublicDisplayName, getPublicUsername } from "@/lib/user-identity";
import { canUserBuy, canUserSignIn } from "@/lib/user-access";

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
      name: "HoosFinds credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email || "");
        const password = credentials?.password || "";

        const user = await findUserByNormalizedEmail(email);
        if (!user) {
          throw new Error(AUTH_ERROR_CODES.USER_NOT_FOUND);
        }

        if (!canUserSignIn(user)) {
          throw new Error(AUTH_ERROR_CODES.DISALLOWED_DOMAIN);
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
          usernameConfirmed: user.usernameConfirmed,
          publicDisplayName: getPublicDisplayName(user),
          publicUsername: getPublicUsername(user.username, user.usernameConfirmed),
          gradYear: user.gradYear,
          favoritePickup: user.favoritePickup,
          role: user.role,
          sellerKind: user.sellerKind,
          verifiedShopApprovedAt: user.verifiedShopApprovedAt?.toISOString() ?? null,
          canBuy: canUserBuy(user)
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
                label: "Email",
                type: "email"
              }
            },
            async authorize(credentials) {
              const email = normalizeEmail(credentials?.email || "");
              const isBypassEmailEligible = canUserBuy({
                email
              });
              if (!isBypassEmailEligible) {
                return null;
              }

              const user = await findOrCreateBypassedUser(email);
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.profileImageUrl ?? user.image,
                username: user.username,
                usernameConfirmed: user.usernameConfirmed,
                publicDisplayName: getPublicDisplayName(user),
                publicUsername: getPublicUsername(user.username, user.usernameConfirmed),
                gradYear: user.gradYear,
                favoritePickup: user.favoritePickup,
                role: user.role,
                sellerKind: user.sellerKind,
                verifiedShopApprovedAt: user.verifiedShopApprovedAt?.toISOString() ?? null,
                canBuy: canUserBuy(user)
              };
            }
          })
        ]
      : [])
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.usernameConfirmed = user.usernameConfirmed;
        token.publicDisplayName = user.publicDisplayName;
        token.publicUsername = user.publicUsername;
        token.gradYear = user.gradYear;
        token.favoritePickup = user.favoritePickup;
        token.image = typeof user.image === "string" ? user.image : null;
        token.email = user.email;
        token.role = user.role;
        token.sellerKind = user.sellerKind;
        token.verifiedShopApprovedAt = user.verifiedShopApprovedAt;
        token.canBuy = user.canBuy;
      }

      if (!token.email) return token;
      const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
      if (!dbUser) return token;

      token.id = dbUser.id;
      token.username = dbUser.username;
      token.usernameConfirmed = dbUser.usernameConfirmed;
      token.publicDisplayName = getPublicDisplayName(dbUser);
      token.publicUsername = getPublicUsername(dbUser.username, dbUser.usernameConfirmed);
      token.gradYear = dbUser.gradYear;
      token.favoritePickup = dbUser.favoritePickup;
      token.image = dbUser.profileImageUrl ?? dbUser.image;
      token.role = dbUser.role;
      token.sellerKind = dbUser.sellerKind;
      token.verifiedShopApprovedAt = dbUser.verifiedShopApprovedAt?.toISOString() ?? null;
      token.canBuy = canUserBuy(dbUser);

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.usernameConfirmed = token.usernameConfirmed;
        session.user.publicDisplayName = token.publicDisplayName;
        session.user.publicUsername = token.publicUsername;
        session.user.gradYear = token.gradYear;
        session.user.favoritePickup = token.favoritePickup;
        session.user.image = typeof token.image === "string" ? token.image : null;
        session.user.role = token.role;
        session.user.sellerKind = token.sellerKind;
        session.user.verifiedShopApprovedAt = token.verifiedShopApprovedAt;
        session.user.canBuy = token.canBuy;
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
