"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Heart, MessageCircle, Plus, Search } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/market", label: "Market", icon: Search },
  { href: "/sell", label: "Sell", icon: Plus },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/messages", label: "Messages", icon: MessageCircle }
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Logo />
        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  active ? "bg-white shadow-soft" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {status === "authenticated" ? (
            <>
              <Link
                href={`/u/${session.user.username ?? "me"}`}
                className="rounded-full border border-border bg-white p-1 transition hover:-translate-y-0.5"
                aria-label="Go to profile"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "Profile"} />
                  <AvatarFallback>{session.user.name?.slice(0, 2).toUpperCase() ?? "UV"}</AvatarFallback>
                </Avatar>
              </Link>
              <Button size="sm" variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}>
                Log out
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link href="/sign-in?callbackUrl=%2Fmarket">Join with UVA Email</Link>
            </Button>
          )}
        </div>
      </div>
      <nav className="container grid grid-cols-4 gap-2 pb-3 md:hidden">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold",
                active ? "bg-white shadow-soft" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
