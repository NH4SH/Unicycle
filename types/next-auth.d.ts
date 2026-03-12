import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      gradYear?: number | null;
      favoritePickup?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    gradYear?: number | null;
    favoritePickup?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    gradYear?: number | null;
    favoritePickup?: string | null;
  }
}
