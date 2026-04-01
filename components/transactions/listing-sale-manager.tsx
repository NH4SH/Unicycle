"use client";

import Link from "next/link";
import { ListingStatus, TransactionStatus } from "@prisma/client";
import { CheckCircle2, Loader2, RefreshCcw, ShoppingBag, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { LinkedPlaceText } from "@/components/shared/linked-place-text";
import { ListingStatusBadge, TransactionStatusBadge } from "@/components/shared/sale-status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, timeAgo } from "@/lib/utils";

type InterestedBuyer = {
  conversationId: string;
  buyer: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
    username: string;
    usernameConfirmed: boolean;
    displayName: string;
    publicUsername: string | null;
  };
  lastMessage: string | null;
  lastMessageAt: string | null;
  transactionStatus: TransactionStatus | null;
};

type CurrentTransaction = {
  id: string;
  status: TransactionStatus;
  agreedPriceCents: number | null;
  sellerMarkedSoldAt: string | null;
  buyerConfirmedReceivedAt: string | null;
  confirmedAt: string | null;
  conversationId: string | null;
  buyer: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
    username: string;
    usernameConfirmed: boolean;
    displayName: string;
    publicUsername: string | null;
  };
  review: {
    stars: number;
    comment: string | null;
    createdAt: string;
      reviewer: {
        id: string;
        name: string | null;
        profileImageUrl: string | null;
        username: string;
        usernameConfirmed: boolean;
        displayName: string;
        publicUsername: string | null;
      };
  } | null;
};

export function ListingSaleManager({
  listingStatus,
  currentTransaction,
  interestedBuyers
}: {
  listingStatus: ListingStatus;
  currentTransaction: CurrentTransaction | null;
  interestedBuyers: InterestedBuyer[];
}) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function requestSale(conversationId: string) {
    setLoadingKey(`mark-${conversationId}`);
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ conversationId })
    });
    setLoadingKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not mark this listing as sold.");
      return;
    }

    toast.success("Sale pending. The buyer can now confirm receipt.");
    router.refresh();
  }

  async function cancelSale() {
    if (!currentTransaction) return;

    setLoadingKey("cancel");
    const response = await fetch(`/api/transactions/${currentTransaction.id}/cancel`, {
      method: "POST"
    });
    setLoadingKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not cancel this pending sale.");
      return;
    }

    toast.success("Pending sale cancelled.");
    router.refresh();
  }

  async function relist() {
    if (!currentTransaction) return;

    setLoadingKey("relist");
    const response = await fetch(`/api/transactions/${currentTransaction.id}/relist`, {
      method: "POST"
    });
    setLoadingKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not relist this item.");
      return;
    }

    toast.success("Listing is live again.");
    router.refresh();
  }

  return (
    <Card className="surface-panel-strong overflow-hidden">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Sale management</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Close the loop cleanly.</h2>
            <ListingStatusBadge status={listingStatus} />
          </div>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Pick the buyer you actually handed the item to. HoosFinds will hold the listing in a pending state until that buyer confirms receipt.
          </p>
        </div>

        {listingStatus === ListingStatus.ACTIVE ? (
          interestedBuyers.length ? (
            <div className="grid gap-3">
              {interestedBuyers.map((entry) => (
                <div key={entry.conversationId} className="surface-subtle flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={entry.buyer.displayName}
                      username={entry.buyer.username}
                      imageUrl={entry.buyer.profileImageUrl}
                      className="h-11 w-11"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{entry.buyer.displayName}</p>
                        {entry.transactionStatus ? <TransactionStatusBadge status={entry.transactionStatus} /> : null}
                      </div>
                      {entry.buyer.publicUsername ? <p className="text-xs text-muted-foreground">@{entry.buyer.publicUsername}</p> : null}
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        <LinkedPlaceText text={entry.lastMessage || "Conversation started. No message has landed yet."} />
                      </p>
                      {entry.lastMessageAt ? (
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last note {timeAgo(entry.lastMessageAt)} ago</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" asChild>
                      <Link href={`/messages?conversation=${entry.conversationId}`}>Open thread</Link>
                    </Button>
                    <Button onClick={() => void requestSale(entry.conversationId)} disabled={loadingKey === `mark-${entry.conversationId}`}>
                      {loadingKey === `mark-${entry.conversationId}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                      Mark sold to this buyer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-panel-dashed flex flex-col gap-3 p-6 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">No interested buyers yet.</p>
              <p>Once someone messages about this listing, you’ll be able to mark the exact buyer and move the item into pending confirmation.</p>
            </div>
          )
        ) : null}

        {listingStatus === ListingStatus.PENDING_CONFIRMATION && currentTransaction ? (
          <div className="surface-subtle space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Waiting on buyer confirmation</p>
                <p className="text-sm text-muted-foreground">The item is marked sold to {currentTransaction.buyer.displayName}.</p>
              </div>
              <TransactionStatusBadge status={currentTransaction.status} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Marked sold {currentTransaction.sellerMarkedSoldAt ? timeAgo(currentTransaction.sellerMarkedSoldAt) : "just now"} ago</span>
              <span>Price {formatCurrency((currentTransaction.agreedPriceCents ?? 0) / 100)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentTransaction.conversationId ? (
                <Button variant="secondary" asChild>
                  <Link href={`/messages?conversation=${currentTransaction.conversationId}`}>Open conversation</Link>
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => void cancelSale()} disabled={loadingKey === "cancel"}>
                {loadingKey === "cancel" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                Cancel pending sale
              </Button>
            </div>
          </div>
        ) : null}

        {listingStatus === ListingStatus.COMPLETED && currentTransaction ? (
          <div className="surface-subtle space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Transaction completed</p>
                <p className="text-sm text-muted-foreground">Confirmed by {currentTransaction.buyer.displayName}.</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-uva-orange" />
            </div>
            {currentTransaction.review ? (
              <div className="rounded-[1.2rem] border border-border bg-card/70 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{currentTransaction.review.stars} star review</p>
                {currentTransaction.review.comment ? (
                  <p className="mt-2 leading-6">
                    “<LinkedPlaceText text={currentTransaction.review.comment} />”
                  </p>
                ) : (
                  <p className="mt-2">Buyer confirmed without written feedback.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">The buyer confirmed receipt without leaving a rating.</p>
            )}
          </div>
        ) : null}

        {listingStatus === ListingStatus.CANCELLED && currentTransaction ? (
          <div className="surface-subtle space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Sale cancelled</p>
                <p className="text-sm text-muted-foreground">This item is off the feed until you relist it.</p>
              </div>
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </div>
            <Button onClick={() => void relist()} disabled={loadingKey === "relist"}>
              {loadingKey === "relist" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-1.5 h-4 w-4" />}
              Relist item
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
