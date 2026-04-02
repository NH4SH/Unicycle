"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Heart, LogOut, MessageCircle, PackageCheck, Plus, Search, Store } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isVerifiedShop = session?.user.sellerKind === "VERIFIED_SHOP" && Boolean(session.user.verifiedShopApprovedAt);
  const navItems = [
    { href: "/market", label: "Browse", icon: Search },
    isVerifiedShop ? { href: "/verified-seller/portal", label: "Portal", icon: Store } : { href: "/sell", label: "Sell", icon: Plus },
    { href: "/favorites", label: "Saved", icon: Heart },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/purchases", label: "Purchases", icon: PackageCheck }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background md:bg-background/88 md:backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-3">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  active ? "surface-pill bg-card text-foreground" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="origin-right scale-[0.92] sm:scale-100" />
          {status === "authenticated" ? (
            <>
              <Link
                href={`/u/${session.user.username ?? "me"}`}
                className="surface-pill inline-flex touch-target items-center justify-center rounded-full p-1 transition hover:-translate-y-0.5"
                aria-label="Go to profile"
              >
                <UserAvatar
                  name={session.user.publicDisplayName ?? session.user.name}
                  username={session.user.publicUsername ?? session.user.username}
                  imageUrl={session.user.image}
                  className="h-7 w-7 sm:h-8 sm:w-8"
                />
              </Link>
              <Button
                size="sm"
                variant="secondary"
                className="w-11 px-0 sm:hidden"
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={() => signOut({ callbackUrl: "/" })}>
                Log out
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link href="/sign-in?callbackUrl=%2Fmarket">
                <span className="sm:hidden">Join</span>
                <span className="hidden sm:inline">Join with UVA email</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
      <nav className="container grid grid-cols-5 gap-1.5 pb-2 pt-0.5 md:hidden">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1.5 py-1.5 text-[10.5px] font-semibold transition",
                active ? "surface-subtle bg-card text-foreground shadow-soft" : "text-muted-foreground hover:bg-card/60"
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
