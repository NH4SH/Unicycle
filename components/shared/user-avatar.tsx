"use client";

import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

function getInitials(name?: string | null, username?: string | null) {
  const seed = (name || username || "HF").trim();
  const parts = seed.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
  }

  return seed.slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, username, imageUrl, className, fallbackClassName }: UserAvatarProps) {
  const normalizedUrl = imageUrl?.trim() || null;
  const [didFail, setDidFail] = useState(false);

  useEffect(() => {
    setDidFail(false);
  }, [normalizedUrl]);

  return (
    <Avatar className={cn("border border-border", className)}>
      <AvatarImage
        src={!didFail ? normalizedUrl ?? undefined : undefined}
        alt={name || username || "Profile"}
        onError={() => setDidFail(true)}
        className="object-cover"
      />
      <AvatarFallback className={cn("bg-card text-xs font-semibold text-foreground", fallbackClassName)}>
        {getInitials(name, username)}
      </AvatarFallback>
    </Avatar>
  );
}
