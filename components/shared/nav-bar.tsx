"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart, MessageCircle, Plus, Search, Shield, Store } from "lucide-react";

import { AccountMenu } from "@/components/shared/account-menu";
import { Logo } from "@/components/shared/logo";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isVerifiedShop = session?.user.sellerKind === "VERIFIED_SHOP" && Boolean(session.user.verifiedShopApprovedAt);
  const isAdmin = session?.user.role === "ADMIN";
  const hideMobileNavPaths = new Set(["/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-email"]);
  const showMobileNav = status === "authenticated" || !hideMobileNavPaths.has(pathname);
  const navItems = [
    { href: "/market", label: "Browse", icon: Search },
    isVerifiedShop ? { href: "/verified-seller/portal", label: "Portal", icon: Store } : { href: "/sell", label: "Sell", icon: Plus },
    { href: "/favorites", label: "Saved", icon: Heart },
    { href: "/messages", label: "Messages", icon: MessageCircle }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background md:bg-background/88 md:backdrop-blur-xl">
      <div className="container grid h-12 grid-cols-[auto_1fr_auto] items-center gap-2 sm:h-16 sm:gap-3">
        <Logo />
        <nav className="hidden items-center justify-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "surface-pill text-foreground dark:text-white"
                    : "text-muted-foreground hover:bg-card/70 hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {status === "authenticated" && isAdmin ? (
            <Button
              size="sm"
              variant={pathname.startsWith("/admin") ? "default" : "secondary"}
              className="h-10 rounded-full px-3 sm:px-4"
              asChild
            >
              <Link href="/admin">
                <Shield className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          ) : null}
          <ThemeToggle className="origin-right scale-[0.92] sm:scale-100" />
          {status === "authenticated" ? (
            <>
              <NotificationBell />
              <AccountMenu
                displayName={session.user.publicDisplayName ?? session.user.name}
                publicUsername={session.user.publicUsername}
                username={session.user.username}
                imageUrl={session.user.image}
                isVerifiedShop={isVerifiedShop}
                isAdmin={isAdmin}
              />
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
      {showMobileNav ? (
        <nav className="container grid grid-cols-4 gap-1 pb-1.5 pt-0.5 md:hidden">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-[0.95rem] px-1 py-1 text-[10px] font-semibold transition",
                  active
                    ? "surface-subtle text-foreground shadow-soft dark:text-white"
                    : "text-muted-foreground hover:bg-card/60 dark:hover:bg-white/[0.08]"
                )}
              >
                <item.icon className="h-[0.95rem] w-[0.95rem]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
