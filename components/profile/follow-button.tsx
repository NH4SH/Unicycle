"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type FollowButtonProps = {
  profileUserId: string;
  profileUsername: string;
  viewerSignedIn: boolean;
  initialIsFollowing: boolean;
  onFollowStateChange: (next: { isFollowing: boolean; followerCount: number }) => void;
  initialFollowerCount: number;
};

export function FollowButton({
  profileUserId,
  profileUsername,
  viewerSignedIn,
  initialIsFollowing,
  initialFollowerCount,
  onFollowStateChange
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [pending, setPending] = useState(false);

  async function toggleFollow() {
    if (pending) return;

    setPending(true);
    const response = await fetch(`/api/users/${profileUserId}/${isFollowing ? "unfollow" : "follow"}`, {
      method: isFollowing ? "DELETE" : "POST"
    });
    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || `Could not ${isFollowing ? "unfollow" : "follow"} this closet.`);
      return;
    }

    const data = (await response.json()) as {
      followerCount: number;
      isFollowing: boolean;
    };

    setIsFollowing(data.isFollowing);
    setFollowerCount(data.followerCount);
    onFollowStateChange({
      isFollowing: data.isFollowing,
      followerCount: data.followerCount
    });
  }

  if (!viewerSignedIn) {
    return (
      <Button size="sm" asChild>
        <Link href={`/sign-in?callbackUrl=${encodeURIComponent(`/u/${profileUsername}`)}`}>Follow</Link>
      </Button>
    );
  }

  return (
    <Button size="sm" variant={isFollowing ? "secondary" : "default"} onClick={() => void toggleFollow()} disabled={pending}>
      {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
      {isFollowing ? "Following" : "Follow"}
      <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-current">
        {followerCount}
      </span>
    </Button>
  );
}
