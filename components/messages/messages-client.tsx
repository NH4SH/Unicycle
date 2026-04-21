"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowDown,
  BadgeDollarSign,
  CheckCircle2,
  ExternalLink,
  Handshake,
  Loader2,
  RefreshCw,
  SendHorizontal,
  ShieldAlert,
  Star,
  UserX,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { LinkedPlaceText } from "@/components/shared/linked-place-text";
import { TransactionStatusBadge } from "@/components/shared/sale-status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { type ListingCardData } from "@/lib/data";
import { cn, formatCurrencyFromCents, timeAgo } from "@/lib/utils";

type MessageKind = "TEXT" | "OFFER" | "SYSTEM";
type OfferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";

type OfferPayload = {
  id: string;
  amountCents: number;
  status: OfferStatus;
  note: string | null;
  buyerId: string;
  sellerId: string;
  acceptedTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
};

type ConversationMessage = {
  id: string;
  senderId: string;
  body: string;
  kind: MessageKind;
  offer: OfferPayload | null;
  createdAt: string;
  readAt: string | null;
};

type ConversationPayload = {
  id: string;
  role: "buyer" | "seller";
  unreadCount: number;
  lastActivityAt: string;
  listing: ListingCardData;
  otherUser: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
    username: string;
    usernameConfirmed: boolean;
    displayName: string;
    publicUsername: string | null;
  };
  messages: ConversationMessage[];
  transaction: {
    id: string;
    status: "PENDING_CONFIRMATION" | "ISSUE_REPORTED" | "COMPLETED" | "CANCELLED";
    handoffStatus: "PENDING_HANDOFF" | "MEETUP_SCHEDULED" | "HANDOFF_CONFIRMED" | "RECEIVED" | "ISSUE_REPORTED" | "CANCELLED";
    agreedPriceCents: number | null;
    sellerMarkedSoldAt: string | null;
    meetupLocation: string | null;
    meetupPlan: string | null;
    meetupScheduledFor: string | null;
    handoffConfirmedAt: string | null;
    buyerConfirmedReceivedAt: string | null;
    confirmedAt: string | null;
    order: {
      id: string;
      status: string;
      paidAt: string | null;
      refundedAt: string | null;
    } | null;
    openIssue: {
      id: string;
      issueType: string;
      description: string | null;
      createdAt: string;
    } | null;
    review: {
      stars: number;
      comment: string | null;
      createdAt: string;
    } | null;
  } | null;
};

const MESSAGE_REFRESH_CHANNEL = "hoosfinds-messages";
const MESSAGE_BOTTOM_THRESHOLD_PX = 160;

function broadcastMessageRefresh(conversationId?: string) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

  const channel = new BroadcastChannel(MESSAGE_REFRESH_CHANNEL);
  channel.postMessage({ type: "refresh", conversationId });
  channel.close();
}

function parseOfferAmountCents(value: string) {
  const normalized = value.replace(/[$,]/g, "").trim();
  if (!normalized) return null;

  const dollars = Number(normalized);
  if (!Number.isFinite(dollars)) return null;

  return Math.round(dollars * 100);
}

function getMessagePreview(message?: ConversationMessage) {
  if (!message) return "Start the thread to work out pickup details.";

  if (message.kind === "OFFER" && message.offer) {
    return `Offer ${formatCurrencyFromCents(message.offer.amountCents, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} · ${message.offer.status.toLowerCase()}`;
  }

  return message.body;
}

function getOfferStatusLabel(status: OfferStatus) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    default:
      return status;
  }
}

function offerStatusClass(status: OfferStatus) {
  switch (status) {
    case "ACCEPTED":
      return "border-emerald-500/35 bg-emerald-500/14 text-emerald-700 dark:text-emerald-100";
    case "DECLINED":
    case "CANCELLED":
    case "EXPIRED":
      return "border-border bg-card/82 text-foreground/75 dark:border-white/14 dark:bg-slate-950/86 dark:text-white/82";
    case "PENDING":
    default:
      return "border-uva-orange/35 bg-uva-orange/12 text-uva-orange dark:bg-uva-orange/20 dark:text-orange-50";
  }
}

export function MessagesClient({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFromQuery = searchParams.get("conversation");

  const [conversations, setConversations] = useState<ConversationPayload[]>([]);
  const [activeId, setActiveId] = useState<string | null>(selectedFromQuery);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);
  const messageBottomRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const lastRenderedThreadRef = useRef<{ conversationId: string | null; messageId: string | null }>({
    conversationId: null,
    messageId: null
  });

  const isMessageViewportNearBottom = useCallback(() => {
    const viewport = messageViewportRef.current;
    if (!viewport) return true;

    return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= MESSAGE_BOTTOM_THRESHOLD_PX;
  }, []);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      messageBottomRef.current?.scrollIntoView({
        block: "end",
        behavior: prefersReducedMotion ? "auto" : behavior
      });
      shouldAutoScrollRef.current = true;
      setHasNewMessagesBelow(false);
    });
  }, []);

  const handleMessageViewportScroll = useCallback(() => {
    const nearBottom = isMessageViewportNearBottom();
    shouldAutoScrollRef.current = nearBottom;
    if (nearBottom) {
      setHasNewMessagesBelow(false);
    }
  }, [isMessageViewportNearBottom]);

  const loadConversations = useCallback(
    async (markReadId?: string, options: { silent?: boolean } = {}) => {
      if (options.silent) setRefreshing(true);
      const query = markReadId ? `?conversationId=${markReadId}` : "";

      try {
        const response = await fetch(`/api/conversations${query}`, {
          credentials: "same-origin",
          cache: "no-store"
        });

        if (response.ok === false) {
          throw new Error("Could not load conversations.");
        }

        const data = (await response.json()) as ConversationPayload[];
        setConversations(data);
        setActiveId((current) => current ?? selectedFromQuery ?? data[0]?.id ?? null);
        setLastSyncedAt(new Date().toISOString());
        if (markReadId) {
          window.dispatchEvent(new Event("hoosfinds:notifications-refresh"));
        }
      } catch (error) {
        if (!options.silent) {
          toast.error("Could not load your messages.");
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("[messages] load failed", error);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedFromQuery]
  );

  useEffect(() => {
    if (selectedFromQuery) {
      setActiveId(selectedFromQuery);
    }
    void loadConversations(selectedFromQuery || undefined);
  }, [selectedFromQuery, loadConversations]);

  useEffect(() => {
    setOfferOpen(false);
    setOfferAmount("");
    setOfferNote("");
    setHasNewMessagesBelow(false);
    shouldAutoScrollRef.current = true;
  }, [activeId]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadConversations(activeId ?? undefined, { silent: true });
      }
    };

    const interval = window.setInterval(refresh, 4500);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [activeId, loadConversations]);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(MESSAGE_REFRESH_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === "refresh") {
        void loadConversations(activeId ?? undefined, { silent: true });
      }
    };

    return () => channel.close();
  }, [activeId, loadConversations]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId]
  );
  const activeLastMessage = activeConversation?.messages.at(-1) ?? null;

  useLayoutEffect(() => {
    if (!activeConversation) return;

    const previous = lastRenderedThreadRef.current;
    const conversationChanged = previous.conversationId !== activeConversation.id;
    const messageChanged = previous.messageId !== activeLastMessage?.id;

    if (!conversationChanged && !messageChanged) return;

    const latestIsOwnMessage = activeLastMessage?.senderId === userId;
    const shouldScroll = conversationChanged || latestIsOwnMessage || shouldAutoScrollRef.current;

    lastRenderedThreadRef.current = {
      conversationId: activeConversation.id,
      messageId: activeLastMessage?.id ?? null
    };

    if (shouldScroll) {
      scrollMessagesToBottom(conversationChanged ? "auto" : "smooth");
      return;
    }

    if (messageChanged) {
      setHasNewMessagesBelow(true);
    }
  }, [activeConversation, activeLastMessage?.id, activeLastMessage?.senderId, scrollMessagesToBottom, userId]);

  const pendingOffer = useMemo(() => {
    if (!activeConversation) return null;
    return activeConversation.messages
      .map((message) => message.offer)
      .find((offer): offer is OfferPayload => Boolean(offer && offer.status === "PENDING")) ?? null;
  }, [activeConversation]);

  async function sendMessage() {
    const body = draft.trim();
    if (body.length === 0 || activeConversation === null || sending) return;

    setSending(true);
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversation.id,
        body
      })
    });

    setSending(false);

    if (response.ok === false) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Message failed to send.");
      return;
    }

    const payload = (await response.json()) as { id: string; createdAt: string };
    shouldAutoScrollRef.current = true;
    setHasNewMessagesBelow(false);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              lastActivityAt: payload.createdAt,
              messages: [
                ...conversation.messages,
                {
                  id: payload.id,
                  senderId: userId,
                  body,
                  kind: "TEXT",
                  offer: null,
                  createdAt: payload.createdAt,
                  readAt: null
                }
              ]
            }
          : conversation
      )
    );
    setDraft("");
    broadcastMessageRefresh(activeConversation.id);
    await loadConversations(activeConversation.id, { silent: true });
  }

  async function submitOffer() {
    if (!activeConversation || offerSubmitting) return;

    const amountCents = parseOfferAmountCents(offerAmount);
    if (!amountCents || amountCents < 100) {
      toast.error("Enter an offer of at least $1.00.");
      return;
    }

    if (amountCents > activeConversation.listing.priceCents) {
      toast.error("Offers cannot be higher than the listed price.");
      return;
    }

    setOfferSubmitting(true);
    const response = await fetch(`/api/conversations/${activeConversation.id}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversation.id,
        amountCents,
        note: offerNote.trim() || undefined
      })
    });
    setOfferSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not send this offer.");
      return;
    }

    toast.success("Offer sent to the seller.");
    shouldAutoScrollRef.current = true;
    setHasNewMessagesBelow(false);
    setOfferOpen(false);
    setOfferAmount("");
    setOfferNote("");
    broadcastMessageRefresh(activeConversation.id);
    await loadConversations(activeConversation.id, { silent: true });
  }

  async function respondToOffer(offerId: string, action: "accept" | "decline" | "cancel", conversationId: string) {
    const key = `${action}-${offerId}`;
    setActionKey(key);
    const response = await fetch(`/api/offers/${offerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    setActionKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not update this offer.");
      return;
    }

    const copy = action === "accept" ? "Offer accepted. The sale is now waiting on handoff confirmation." : action === "decline" ? "Offer declined." : "Offer cancelled.";
    toast.success(copy);
    shouldAutoScrollRef.current = true;
    setHasNewMessagesBelow(false);
    broadcastMessageRefresh(conversationId);
    await loadConversations(conversationId, { silent: true });
    if (action === "accept") {
      router.refresh();
    }
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
    broadcastMessageRefresh(conversationId);
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
    broadcastMessageRefresh(conversationId);
    await loadConversations(conversationId);
    router.refresh();
  }

  async function blockUser(targetUserId: string) {
    const reason = window.prompt("Optional: why are you blocking this user?", "") ?? "";
    setActionKey(`block-${targetUserId}`);
    const response = await fetch(`/api/users/${targetUserId}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || undefined })
    });
    setActionKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not block this user.");
      return;
    }

    toast.success("User blocked. Messaging is now disabled until you unblock them.");
    router.refresh();
  }

  async function unblockUser(targetUserId: string) {
    setActionKey(`unblock-${targetUserId}`);
    const response = await fetch(`/api/users/${targetUserId}/unblock`, {
      method: "POST"
    });
    setActionKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not unblock this user.");
      return;
    }

    toast.success("User unblocked.");
    router.refresh();
  }

  async function reportConversation(conversationId: string) {
    const reason = window.prompt("Share a short reason for this conversation report.", "");
    if (!reason) return;

    setActionKey(`report-${conversationId}`);
    const response = await fetch(`/api/conversations/${conversationId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    setActionKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not report this conversation.");
      return;
    }

    toast.success("Conversation reported for review.");
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
              Mark the listing sold after you and {conversation.otherUser.displayName} settle on the buyer and pickup details.
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
      const paid = Boolean(conversation.transaction.order?.paidAt);

      return (
        <div className="surface-subtle flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <TransactionStatusBadge status={conversation.transaction.status} />
              <p className="text-sm font-medium text-foreground">
                {conversation.transaction.handoffStatus === "MEETUP_SCHEDULED"
                  ? "Meetup details are set."
                  : conversation.transaction.handoffStatus === "HANDOFF_CONFIRMED"
                    ? isBuyer
                      ? "You can confirm receipt once the item is in hand."
                      : "Waiting on the buyer to confirm receipt."
                    : paid
                      ? "Payment is captured and the meetup still needs to happen."
                      : "The sale is reserved. Coordinate pickup and finish the handoff from Purchases."}
              </p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {conversation.transaction.meetupLocation || conversation.transaction.meetupPlan
                ? `${conversation.transaction.meetupLocation ? `Spot: ${conversation.transaction.meetupLocation}. ` : ""}${conversation.transaction.meetupPlan ?? ""}`.trim()
                : isBuyer
                  ? "HoosFinds only finalizes the sale after the real handoff happens. Schedule the meetup from Purchases."
                  : "If plans changed, you can cancel the sale or manage the meetup flow from Purchases."}
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

    if (conversation.transaction?.status === "ISSUE_REPORTED") {
      return (
        <div className="surface-subtle flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <TransactionStatusBadge status={conversation.transaction.status} />
              <p className="text-sm font-medium text-foreground">This handoff has an open issue.</p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {conversation.transaction.openIssue
                ? `${conversation.transaction.openIssue.issueType.replaceAll("_", " ")}${conversation.transaction.openIssue.description ? `: ${conversation.transaction.openIssue.description}` : ""}`
                : "HoosFinds paused the normal completion flow while this issue is active."}
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/purchases">Open purchases</Link>
          </Button>
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

  function renderOfferPanel(conversation: ConversationPayload) {
    if (!offerOpen) return null;

    return (
      <div className="mx-4 mb-3 rounded-[1.35rem] border border-uva-orange/20 bg-uva-orange/[0.07] p-4 shadow-soft dark:border-uva-orange/24 dark:bg-uva-orange/[0.12]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-display text-lg font-bold tracking-tight text-foreground">Make an offer</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              List price is {formatCurrencyFromCents(conversation.listing.priceCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. The seller can accept or decline right in chat.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOfferOpen(false)}>
            Close
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[12rem_1fr_auto] md:items-start">
          <Input
            value={offerAmount}
            onChange={(event) => setOfferAmount(event.target.value)}
            inputMode="decimal"
            placeholder="$35.00"
            aria-label="Offer amount"
          />
          <Textarea
            value={offerNote}
            onChange={(event) => setOfferNote(event.target.value)}
            placeholder="Optional note: pickup timing, bundle idea, or quick context"
            aria-label="Offer note"
            className="min-h-[3rem] md:min-h-[2.75rem]"
          />
          <Button type="button" onClick={() => void submitOffer()} disabled={offerSubmitting}>
            {offerSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BadgeDollarSign className="mr-1.5 h-4 w-4" />}
            Send offer
          </Button>
        </div>
      </div>
    );
  }

  function renderOfferMessage(message: ConversationMessage, conversation: ConversationPayload, own: boolean) {
    const offer = message.offer;
    if (!offer) return null;

    const amount = formatCurrencyFromCents(offer.amountCents, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const sellerCanRespond = conversation.role === "seller" && offer.status === "PENDING";
    const buyerCanCancel = conversation.role === "buyer" && offer.buyerId === userId && offer.status === "PENDING";

    return (
      <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "w-[min(25rem,86%)] rounded-[1.45rem] border p-4 shadow-soft",
            own
              ? "border-uva-orange/32 bg-uva-orange/[0.12] dark:border-uva-orange/28 dark:bg-uva-orange/[0.16]"
              : "border-border bg-card/82 dark:border-white/12 dark:bg-slate-950/88"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-uva-orange/14 text-uva-orange dark:bg-uva-orange/22 dark:text-orange-50">
                  <BadgeDollarSign className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{own ? "Your offer" : "Offer received"}</p>
                  <p className="font-display text-2xl font-extrabold tracking-tight text-foreground">{amount}</p>
                </div>
              </div>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold", offerStatusClass(offer.status))}>
              {getOfferStatusLabel(offer.status)}
            </span>
          </div>

          {offer.note ? (
            <p className="mt-3 rounded-[1rem] border border-border/70 bg-background/70 px-3 py-2 text-sm leading-6 text-foreground/88 dark:border-white/10 dark:bg-white/[0.04]">
              <LinkedPlaceText text={offer.note} />
            </p>
          ) : null}

          {offer.status === "ACCEPTED" ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Accepted offer. Use Purchases for the handoff checklist and receipt confirmation.
            </p>
          ) : null}

          {(sellerCanRespond || buyerCanCancel || offer.status === "ACCEPTED") ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {sellerCanRespond ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void respondToOffer(offer.id, "accept", conversation.id)}
                    disabled={actionKey === `accept-${offer.id}`}
                  >
                    {actionKey === `accept-${offer.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Handshake className="mr-1.5 h-4 w-4" />}
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void respondToOffer(offer.id, "decline", conversation.id)}
                    disabled={actionKey === `decline-${offer.id}`}
                  >
                    {actionKey === `decline-${offer.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    Decline
                  </Button>
                </>
              ) : null}
              {buyerCanCancel ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void respondToOffer(offer.id, "cancel", conversation.id)}
                  disabled={actionKey === `cancel-${offer.id}`}
                >
                  {actionKey === `cancel-${offer.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Cancel offer
                </Button>
              ) : null}
              {offer.status === "ACCEPTED" ? (
                <Button type="button" variant="secondary" size="sm" asChild>
                  <Link href="/purchases">Open purchases</Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {format(new Date(message.createdAt), "MMM d, h:mm a")}
          </p>
        </div>
      </div>
    );
  }

  function renderMessage(message: ConversationMessage, conversation: ConversationPayload) {
    const own = message.senderId === userId;

    if (message.kind === "SYSTEM") {
      return (
        <div key={message.id} className="flex justify-center">
          <div className="max-w-[86%] rounded-full border border-border bg-card/72 px-4 py-2 text-center text-xs font-medium text-foreground/78 dark:border-white/12 dark:bg-slate-950/82 dark:text-white/84">
            <LinkedPlaceText text={message.body} />
          </div>
        </div>
      );
    }

    if (message.kind === "OFFER") {
      return renderOfferMessage(message, conversation, own);
    }

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
        description="Message a seller from any listing to ask about fit, condition, offers, or pickup timing. Every thread will show up here."
        ctaHref="/market"
        ctaLabel="Browse HoosFinds"
      />
    );
  }

  return (
    <div className="grid gap-4 xl:min-h-[72dvh] xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="surface-panel-strong overflow-hidden">
        <div className="border-b border-border/80 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="editorial-eyebrow">Conversations</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Offers, pickup details, and buyer-seller handoffs.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
        </div>
        <ScrollArea className="min-h-[16rem] max-h-[38dvh] xl:h-[72dvh] xl:max-h-none">
          <div className="space-y-2 p-3">
            {conversations.map((conversation) => {
              const lastMessage = conversation.messages.at(-1);
              const active = conversation.id === activeId;
              const hasUnread = conversation.unreadCount > 0;

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
                      ? "border-uva-blue/24 bg-uva-blue/8 dark:border-white/16 dark:bg-white/[0.06]"
                      : hasUnread
                        ? "border-uva-orange/28 bg-uva-orange/[0.08] hover:border-uva-orange/38 dark:bg-uva-orange/[0.12]"
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn("truncate font-display text-base tracking-tight", hasUnread ? "font-extrabold" : "font-bold")}>
                            {conversation.otherUser.displayName}
                          </p>
                          {conversation.transaction ? <TransactionStatusBadge status={conversation.transaction.status} className="px-2.5 py-1 text-[10px]" /> : null}
                        </div>
                        <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {conversation.listing.title}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {timeAgo(conversation.lastActivityAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <p className={cn("min-w-0 flex-1 truncate text-xs", hasUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {getMessagePreview(lastMessage)}
                      </p>
                      {hasUnread ? (
                        <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-uva-orange px-1.5 text-[10px] font-bold text-white">
                          {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
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
                  name={activeConversation.otherUser.displayName}
                  username={activeConversation.otherUser.username}
                  imageUrl={activeConversation.otherUser.profileImageUrl}
                  className="h-11 w-11"
                />
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold tracking-tight">
                    {activeConversation.otherUser.displayName}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {activeConversation.otherUser.publicUsername ? <span>@{activeConversation.otherUser.publicUsername}</span> : null}
                    <span className="inline-flex items-center gap-1.5">
                      {refreshing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      {refreshing ? "Syncing" : lastSyncedAt ? `Synced ${timeAgo(lastSyncedAt)} ago` : "Live sync on"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[56px_1fr] items-center gap-3 rounded-[1.2rem] border border-border bg-background/70 p-2 dark:border-white/10 dark:bg-white/[0.04]">
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
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyFromCents(activeConversation.listing.priceCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-4 py-3">
              <Button type="button" variant="secondary" size="sm" asChild>
                <Link href={`/listing/${activeConversation.listing.id}`}>
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  View listing
                </Link>
              </Button>
              {activeConversation.role === "buyer" && activeConversation.listing.status === "ACTIVE" && !activeConversation.transaction ? (
                <Button
                  type="button"
                  variant={offerOpen ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setOfferOpen((current) => !current)}
                  disabled={Boolean(pendingOffer)}
                >
                  <BadgeDollarSign className="mr-1.5 h-4 w-4" />
                  {pendingOffer ? "Offer pending" : "Make offer"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void reportConversation(activeConversation.id)}
                disabled={actionKey === `report-${activeConversation.id}`}
              >
                {actionKey === `report-${activeConversation.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-1.5 h-4 w-4" />}
                Report
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void blockUser(activeConversation.otherUser.id)}
                disabled={actionKey === `block-${activeConversation.otherUser.id}`}
              >
                {actionKey === `block-${activeConversation.otherUser.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserX className="mr-1.5 h-4 w-4" />}
                Block
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void unblockUser(activeConversation.otherUser.id)}
                disabled={actionKey === `unblock-${activeConversation.otherUser.id}`}
              >
                {actionKey === `unblock-${activeConversation.otherUser.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Unblock
              </Button>
            </div>

            {renderOfferPanel(activeConversation)}

            <div className="border-y border-border/70 px-4 py-3">{renderSalePanel(activeConversation)}</div>

            <div className="relative min-h-0 flex-1">
              <ScrollArea
                className="h-full p-4"
                viewportRef={messageViewportRef}
                onViewportScroll={handleMessageViewportScroll}
              >
                <div className="space-y-3">
                  {activeConversation.messages.map((message) => renderMessage(message, activeConversation))}
                  <div ref={messageBottomRef} aria-hidden="true" className="h-1" />
                </div>
              </ScrollArea>
              {hasNewMessagesBelow ? (
                <Button
                  type="button"
                  size="sm"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-2xl"
                  onClick={() => scrollMessagesToBottom("smooth")}
                >
                  New messages
                  <ArrowDown className="ml-1.5 h-4 w-4" />
                </Button>
              ) : null}
            </div>

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
                  placeholder="Ask about fit, condition, offers, or pickup on Grounds"
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
            Pick a conversation to see the thread, review the listing, send offers, and lock in the handoff.
          </div>
        )}
      </Card>
    </div>
  );
}
