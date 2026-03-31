"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle2, Loader2, SendHorizontal, Star, XCircle } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { LinkedPlaceText } from "@/components/shared/linked-place-text";
import { TransactionStatusBadge } from "@/components/shared/sale-status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type ListingCardData } from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";

type ConversationPayload = {
  id: string;
  role: "buyer" | "seller";
  listing: ListingCardData;
  otherUser: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
    username: string;
  };
  messages: {
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
    readAt: string | null;
  }[];
  transaction: {
    id: string;
    status: "PENDING_CONFIRMATION" | "COMPLETED" | "CANCELLED";
    agreedPriceCents: number | null;
    sellerMarkedSoldAt: string | null;
    buyerConfirmedReceivedAt: string | null;
    confirmedAt: string | null;
    review: {
      stars: number;
      comment: string | null;
      createdAt: string;
    } | null;
  } | null;
};

export function MessagesClient({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFromQuery = searchParams.get("conversation");

  const [conversations, setConversations] = useState<ConversationPayload[]>([]);
  const [activeId, setActiveId] = useState<string | null>(selectedFromQuery);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const loadConversations = useCallback(
    async (markReadId?: string) => {
      const query = markReadId ? `?conversationId=${markReadId}` : "";
      const response = await fetch(`/api/conversations${query}`);

      if (response.ok === false) {
        toast.error("Could not load your messages.");
        setLoading(false);
        return;
      }

      const data = (await response.json()) as ConversationPayload[];
      setConversations(data);

      if (activeId === null && data.length > 0) {
        setActiveId(selectedFromQuery || data[0].id);
      }

      setLoading(false);
    },
    [activeId, selectedFromQuery]
  );

  useEffect(() => {
    void loadConversations(selectedFromQuery || undefined);
  }, [selectedFromQuery, loadConversations]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId]
  );

  async function sendMessage() {
    if (draft.trim().length === 0 || activeConversation === null || sending) return;

    setSending(true);
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversation.id,
        body: draft.trim()
      })
    });

    setSending(false);

    if (response.ok === false) {
      toast.error("Message failed to send.");
      return;
    }

    const payload = (await response.json()) as { id: string; createdAt: string };
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              messages: [
                ...conversation.messages,
                {
                  id: payload.id,
                  senderId: userId,
                  body: draft.trim(),
                  createdAt: payload.createdAt,
                  readAt: null
                }
              ]
            }
          : conversation
      )
    );
    setDraft("");
  }

  async function markSold(conversationId: string) {
    setActionKey(`mark-${conversationId}`);
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId })
    });
    setActionKey(null);

    if (response.ok === false) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not mark this item as sold.");
      return;
    }

    toast.success("Buyer selected. HoosFinds is now waiting on receipt confirmation.");
    await loadConversations(conversationId);
    router.refresh();
  }

  async function cancelPending(transactionId: string, conversationId: string) {
    setActionKey(`cancel-${transactionId}`);
    const response = await fetch(`/api/transactions/${transactionId}/cancel`, {
      method: "POST"
    });
    setActionKey(null);

    if (response.ok === false) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not cancel this pending sale.");
      return;
    }

    toast.success("Pending sale cancelled.");
    await loadConversations(conversationId);
    router.refresh();
  }

  function renderSalePanel(conversation: ConversationPayload) {
    const isSeller = conversation.role === "seller";
    const isBuyer = conversation.role === "buyer";

    if (isSeller && conversation.listing.status === "ACTIVE") {
      return (
        <div className="surface-subtle flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Ready to close the handoff?</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Once you’ve met up with {conversation.otherUser.name || conversation.otherUser.username}, mark this listing sold to move it into buyer confirmation.
            </p>
          </div>
          <Button onClick={() => void markSold(conversation.id)} disabled={actionKey === `mark-${conversation.id}`}>
            {actionKey === `mark-${conversation.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Mark sold to this buyer
          </Button>
        </div>
      );
    }

    if (conversation.transaction?.status === "PENDING_CONFIRMATION") {
      return (
        <div className="surface-subtle flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <TransactionStatusBadge status={conversation.transaction.status} />
              <p className="text-sm font-medium text-foreground">
                {isBuyer ? "You can confirm receipt once the item is in hand." : "Waiting on the buyer to confirm receipt."}
              </p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {isBuyer
                ? "This keeps HoosFinds honest and only finalizes the sale after the real handoff happens."
                : "If plans changed, you can cancel the pending sale and relist the item right away."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isBuyer ? (
              <Button asChild>
                <Link href={`/purchases/${conversation.transaction.id}/confirm`}>Confirm receipt</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => void cancelPending(conversation.transaction!.id, conversation.id)}
                disabled={actionKey === `cancel-${conversation.transaction.id}`}
              >
                {actionKey === `cancel-${conversation.transaction.id}` ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-1.5 h-4 w-4" />
                )}
                Cancel pending sale
              </Button>
            )}
            <Button variant="secondary" asChild>
              <Link href="/purchases">Open purchases</Link>
            </Button>
          </div>
        </div>
      );
    }

    if (conversation.transaction?.status === "COMPLETED") {
      return (
        <div className="surface-subtle space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <TransactionStatusBadge status={conversation.transaction.status} />
            <p className="font-medium text-foreground">This transaction is complete.</p>
          </div>
          {conversation.transaction.review ? (
            <div className="rounded-[1rem] border border-border bg-card/72 px-4 py-3 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-1 font-medium text-foreground">
                <Star className="h-4 w-4 fill-uva-orange text-uva-orange" />
                {conversation.transaction.review.stars} star review
              </div>
              {conversation.transaction.review.comment ? (
                <p className="mt-2 leading-6">
                  “<LinkedPlaceText text={conversation.transaction.review.comment} />”
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Receipt was confirmed without a written review.</p>
          )}
        </div>
      );
    }

    if (conversation.transaction?.status === "CANCELLED" || conversation.listing.status === "CANCELLED") {
      return (
        <div className="surface-subtle flex items-start gap-3 p-4 text-sm leading-6 text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <p>This sale was cancelled. If the seller relists the item, the thread stays here so you can pick things back up.</p>
        </div>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <div className="surface-panel-strong flex min-h-[58dvh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading your conversations on Grounds...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        title="No messages yet"
        description="Message a seller from any listing to ask about fit, condition, or pickup timing. Every thread will show up here."
        ctaHref="/market"
        ctaLabel="Browse HoosFinds"
      />
    );
  }

  return (
    <div className="grid gap-4 xl:min-h-[72dvh] xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="surface-panel-strong overflow-hidden">
        <div className="border-b border-border/80 px-4 py-4">
          <p className="editorial-eyebrow">Conversations</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Ask questions, settle the details, and confirm the handoff when it is actually done.</p>
        </div>
        <ScrollArea className="min-h-[16rem] max-h-[38dvh] xl:h-[72dvh] xl:max-h-none">
          <div className="space-y-2 p-3">
            {conversations.map((conversation) => {
              const lastMessage = conversation.messages.at(-1);
              const active = conversation.id === activeId;

              return (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setActiveId(conversation.id);
                    void loadConversations(conversation.id);
                  }}
                  className={cn(
                    "grid min-h-[88px] w-full grid-cols-[64px_1fr] gap-3 rounded-[1.35rem] border px-3 py-3 text-left transition",
                    active
                      ? "border-uva-blue/20 bg-uva-blue/6"
                      : "border-transparent bg-card/55 hover:border-border hover:bg-card/78"
                  )}
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-[1rem] border border-border">
                    <Image
                      src={
                        conversation.listing.images[0] ||
                        "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"
                      }
                      alt={conversation.listing.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-display text-base font-bold tracking-tight">
                        {conversation.otherUser.name || conversation.otherUser.username}
                      </p>
                      {conversation.transaction ? <TransactionStatusBadge status={conversation.transaction.status} className="px-2.5 py-1 text-[10px]" /> : null}
                    </div>
                    <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {conversation.listing.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {lastMessage?.body ?? "Start the thread to work out pickup details."}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      <Card className="surface-panel-strong flex min-h-[54dvh] flex-col overflow-hidden xl:h-[72dvh]">
        {activeConversation ? (
          <>
            <div className="grid gap-4 border-b border-border/80 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={activeConversation.otherUser.name}
                  username={activeConversation.otherUser.username}
                  imageUrl={activeConversation.otherUser.profileImageUrl}
                  className="h-11 w-11"
                />
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold tracking-tight">
                    {activeConversation.otherUser.name || activeConversation.otherUser.username}
                  </p>
                  <p className="text-xs text-muted-foreground">@{activeConversation.otherUser.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-[56px_1fr] items-center gap-3 rounded-[1.2rem] border border-border bg-background/70 p-2">
                <div className="relative h-14 w-14 overflow-hidden rounded-[0.9rem] border border-border">
                  <Image
                    src={
                      activeConversation.listing.images[0] ||
                      "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"
                    }
                    alt={activeConversation.listing.title}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{activeConversation.listing.title}</p>
                    {activeConversation.listing.status !== "ACTIVE" ? (
                      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{activeConversation.listing.status.replaceAll("_", " ")}</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatCurrency(activeConversation.listing.priceCents / 100)}</p>
                </div>
              </div>
            </div>

            <div className="border-b border-border/70 px-4 py-3">{renderSalePanel(activeConversation)}</div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {activeConversation.messages.map((message) => {
                  const own = message.senderId === userId;

                  return (
                    <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[78%] rounded-[1.35rem] px-4 py-3 text-sm leading-6",
                          own ? "bg-uva-orange text-white" : "border border-border bg-background/80 text-foreground"
                        )}
                      >
                        <p>
                          <LinkedPlaceText text={message.body} linkClassName={own ? "decoration-white/45 hover:text-white" : undefined} />
                        </p>
                        <p className={cn("mt-1 text-[10px]", own ? "text-white/80" : "text-muted-foreground")}>
                          {format(new Date(message.createdAt), "MMM d, h:mm a")}
                          {own && message.readAt ? " · Seen" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t border-border/80 p-3">
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask about fit, condition, or the easiest pickup spot on Grounds"
                  aria-label="Message body"
                />
                <Button type="submit" disabled={sending || draft.trim().length === 0}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="m-auto max-w-sm px-6 text-center text-sm leading-6 text-muted-foreground">
            Pick a conversation to see the thread, review the listing, and lock in the handoff.
          </div>
        )}
      </Card>
    </div>
  );
}
