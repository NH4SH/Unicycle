"use client";

import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, LogOut, PackageCheck, Shield, Store, UserRound, WalletCards } from "lucide-react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
  displayName?: string | null;
  publicUsername?: string | null;
  username: string;
  imageUrl?: string | null;
  isVerifiedShop: boolean;
  isAdmin: boolean;
};

type AccountLink = {
  href: string;
  label: string;
  icon: typeof UserRound;
  match: (pathname: string) => boolean;
};

export function AccountMenu({
  displayName,
  publicUsername,
  username,
  imageUrl,
  isVerifiedShop,
  isAdmin
}: AccountMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const profileHref = `/u/${username}`;

  const accountLinks: AccountLink[] = [
    {
      href: profileHref,
      label: "Profile",
      icon: UserRound,
      match: (currentPath) => currentPath === profileHref
    },
    {
      href: "/purchases",
      label: "Purchases",
      icon: PackageCheck,
      match: (currentPath) => currentPath.startsWith("/purchases")
    },
    {
      href: "/payments",
      label: "Payments",
      icon: WalletCards,
      match: (currentPath) => currentPath.startsWith("/payments")
    },
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: "Admin",
            icon: Shield,
            match: (currentPath: string) => currentPath.startsWith("/admin")
          }
        ]
      : []),
    ...(isVerifiedShop
      ? [
          {
            href: "/verified-seller/portal",
            label: "Verified Shop portal",
            icon: Store,
            match: (currentPath: string) => currentPath.startsWith("/verified-seller/portal")
          }
        ]
      : [])
  ];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          className="surface-pill inline-flex min-h-11 items-center gap-2 rounded-full p-1 pr-2 transition hover:-translate-y-0.5 hover:border-uva-orange/35 hover:text-foreground dark:hover:border-white/22 dark:hover:text-white"
        >
          <UserAvatar
            name={displayName}
            username={publicUsername ?? username}
            imageUrl={imageUrl}
            className="h-8 w-8 sm:h-9 sm:w-9"
          />
          <div className="hidden min-w-0 text-left sm:block">
            <p className="max-w-[7.5rem] truncate text-sm font-semibold text-foreground">
              {displayName || publicUsername || username}
            </p>
            {publicUsername ? <p className="max-w-[7.5rem] truncate text-xs text-muted-foreground">@{publicUsername}</p> : null}
          </div>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={12}
          className="z-50 w-[min(19rem,calc(100vw-1rem))] rounded-[1.5rem] border border-border/80 bg-background/98 p-3 shadow-2xl backdrop-blur-xl"
        >
          <div className="surface-subtle rounded-[1.25rem] px-3 py-3">
            <p className="text-sm font-semibold text-foreground">{displayName || publicUsername || username}</p>
            <p className="mt-1 text-xs text-muted-foreground">{publicUsername ? `@${publicUsername}` : "HoosFinds account"}</p>
          </div>

          <div className="mt-3 space-y-1.5">
            {accountLinks.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathname);

              return (
                <Popover.Close asChild key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-3 rounded-[1.15rem] border px-3 py-3 text-sm font-medium transition",
                      active
                        ? "border-uva-orange/30 bg-uva-orange/[0.08] text-foreground dark:border-uva-orange/34 dark:bg-uva-orange/[0.18] dark:text-orange-50"
                        : "border-transparent text-foreground/88 hover:border-border/70 hover:bg-card/70 hover:text-foreground dark:text-white/88 dark:hover:border-white/14 dark:hover:bg-white/[0.08] dark:hover:text-white"
                    )}
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                  </Link>
                </Popover.Close>
              );
            })}
          </div>

          <div className="mt-3 border-t border-border/70 pt-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut({ callbackUrl: "/" });
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-[1.15rem] px-3 py-3 text-left text-sm font-medium text-foreground/88 transition hover:bg-card/70 hover:text-foreground dark:text-white/88 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
