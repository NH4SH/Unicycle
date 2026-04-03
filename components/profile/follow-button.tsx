"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FollowButtonProps = {
  profileUserId: string;
  profileUsername: string;
  viewerSignedIn: boolean;
  initialIsFollowing: boolean;
  initialFollowerCount?: number;
  onFollowStateChange?: (next: { isFollowing: boolean; followerCount: number }) => void;
  callbackUrl?: string;
  followLabel?: string;
  followingLabel?: string;
  unfollowLabel?: string;
  showCount?: boolean;
  size?: ButtonProps["size"];
  className?: string;
};

export function FollowButton({
  profileUserId,
  profileUsername,
  viewerSignedIn,
  initialIsFollowing,
  initialFollowerCount = 0,
  onFollowStateChange,
  callbackUrl,
  followLabel = "Follow",
  followingLabel = "Following",
  unfollowLabel = "Unfollow",
  showCount = false,
  size = "sm",
  className
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [pending, setPending] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  useEffect(() => {
    setFollowerCount(initialFollowerCount);
  }, [initialFollowerCount]);

  const signInHref = useMemo(() => {
    const next = callbackUrl ?? `/u/${profileUsername}`;
    return `/sign-in?callbackUrl=${encodeURIComponent(next)}`;
  }, [callbackUrl, profileUsername]);

  const label = pending
    ? isFollowing
      ? followingLabel
      : followLabel
    : isFollowing
      ? hovering
        ? unfollowLabel
        : followingLabel
      : followLabel;

  async function toggleFollow() {
    if (pending) return;

    const previous = {
      isFollowing,
      followerCount
    };
    const optimisticIsFollowing = !isFollowing;
    const optimisticFollowerCount = Math.max(0, followerCount + (optimisticIsFollowing ? 1 : -1));

    setPending(true);
    setIsFollowing(optimisticIsFollowing);
    setFollowerCount(optimisticFollowerCount);
    onFollowStateChange?.({
      isFollowing: optimisticIsFollowing,
      followerCount: optimisticFollowerCount
    });

    try {
      const response = await fetch(`/api/users/${profileUserId}/${previous.isFollowing ? "unfollow" : "follow"}`, {
        method: previous.isFollowing ? "DELETE" : "POST"
      });

      const data = (await response.json().catch(() => null)) as
        | {
            message?: string;
            followerCount?: number;
            isFollowing?: boolean;
          }
        | null;

      if (!response.ok) {
        throw new Error(data?.message || `Could not ${previous.isFollowing ? "unfollow" : "follow"} this seller.`);
      }

      const resolvedIsFollowing = data?.isFollowing ?? optimisticIsFollowing;
      const resolvedFollowerCount = data?.followerCount ?? optimisticFollowerCount;

      setIsFollowing(resolvedIsFollowing);
      setFollowerCount(resolvedFollowerCount);
      onFollowStateChange?.({
        isFollowing: resolvedIsFollowing,
        followerCount: resolvedFollowerCount
      });
    } catch (error) {
      setIsFollowing(previous.isFollowing);
      setFollowerCount(previous.followerCount);
      onFollowStateChange?.(previous);
      toast.error(error instanceof Error ? error.message : "Could not update follow state.");
    } finally {
      setPending(false);
    }
  }

  if (!viewerSignedIn) {
    return (
      <Button size={size} className={className} asChild>
        <Link href={signInHref}>{followLabel}</Link>
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={isFollowing ? "secondary" : "default"}
      onClick={() => void toggleFollow()}
      disabled={pending}
      className={cn("group", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      aria-pressed={isFollowing}
    >
      {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
      <span>{label}</span>
      {showCount ? (
        <span
          className={cn(
            "ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
            isFollowing
              ? "bg-black/8 text-current dark:bg-white/[0.14] dark:text-white/96"
              : "bg-white/18 text-white"
          )}
        >
          {followerCount}
        </span>
      ) : null}
    </Button>
  );
}
