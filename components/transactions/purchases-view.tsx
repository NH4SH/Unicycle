"use client";

import Image from "next/image";
import Link from "next/link";
import { TransactionStatus } from "@prisma/client";
import { AlertCircle, CalendarDays, Loader2, MessageCircle, RefreshCcw, Star, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { TransactionStatusBadge } from "@/components/shared/sale-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkedPlaceText } from "@/components/shared/linked-place-text";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PurchaseSummaryData } from "@/lib/data";
import { TRANSACTION_ISSUE_TYPES } from "@/lib/trust-types";
import { formatCurrency, timeAgo } from "@/lib/utils";

type PurchasesViewProps = {
  purchases: PurchaseSummaryData[];
  sales: PurchaseSummaryData[];
};

function getHandoffCopy(item: PurchaseSummaryData, role: "buyer" | "seller") {
  if (item.status === TransactionStatus.ISSUE_REPORTED) {
    return item.openIssue
      ? `Issue reported: ${item.openIssue.issueType.replaceAll("_", " ").toLowerCase()}.`
      : "This handoff is paused while an issue is being reviewed.";
  }

  if (item.handoffStatus === "MEETUP_SCHEDULED") {
    return item.meetupScheduledFor
      ? `Meetup planned for ${new Date(item.meetupScheduledFor).toLocaleString()}.`
      : "Meetup details are set and waiting on the handoff.";
  }

  if (item.handoffStatus === "HANDOFF_CONFIRMED") {
    return role === "buyer" ? "The seller marked the handoff done. Confirm once the item is truly in hand." : "Handoff marked complete. Waiting on the buyer’s receipt confirmation.";
  }

  if (item.order?.status === "PAID") {
    return role === "buyer"
      ? "Your payment is captured. Use messages or schedule the meetup before confirming receipt."
      : "Payment is captured. Lock in the meetup details before asking the buyer to confirm receipt.";
  }

  return role === "buyer"
    ? "This sale is pending your real-world handoff."
    : "The sale is live inside HoosFinds and still waiting on the handoff.";
}

function TransactionCard({
  item,
  role,
  onCancel,
  onRelist,
  onScheduleMeetup,
  onConfirmHandoff,
  onReportIssue,
  loadingKey
}: {
  item: PurchaseSummaryData;
  role: "buyer" | "seller";
  onCancel: (transactionId: string) => void;
  onRelist: (transactionId: string) => void;
  onScheduleMeetup: (transactionId: string, listing: PurchaseSummaryData["listing"]) => void;
  onConfirmHandoff: (transactionId: string) => void;
  onReportIssue: (transactionId: string, role: "buyer" | "seller") => void;
  loadingKey: string | null;
}) {
  return (
    <Card className="surface-panel-strong overflow-hidden">
      <CardContent className="grid gap-4 p-4 md:grid-cols-[96px_1fr] md:p-5">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.2rem] border border-border/80 bg-card">
          <Image
            src={item.listing.images[0] || "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"}
            alt={item.listing.title}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <TransactionStatusBadge status={item.status} />
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{formatCurrency(item.agreedPriceCents / 100)}</p>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold tracking-tight">{item.listing.title}</p>
                <p className="text-sm text-muted-foreground">
                  {role === "buyer" ? "Seller" : "Buyer"}: {item.counterparty.displayName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground">
              <UserAvatar
                name={item.counterparty.displayName}
                username={item.counterparty.username}
                imageUrl={item.counterparty.profileImageUrl}
                className="h-6 w-6"
              />
              {item.counterparty.publicUsername ? `@${item.counterparty.publicUsername}` : item.counterparty.displayName}
            </div>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <p>Started {timeAgo(item.createdAt)} ago</p>
            <p>{item.order?.paidAt ? `Paid ${timeAgo(item.order.paidAt)} ago` : item.sellerMarkedSoldAt ? `Marked sold ${timeAgo(item.sellerMarkedSoldAt)} ago` : "Waiting on payment or seller mark"}</p>
            <p>{item.confirmedAt ? `Completed ${timeAgo(item.confirmedAt)} ago` : getHandoffCopy(item, role)}</p>
          </div>

          {item.meetupLocation || item.meetupPlan || item.meetupScheduledFor ? (
            <div className="rounded-[1.1rem] border border-border bg-card/72 px-4 py-3 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-1 font-medium text-foreground">
                <CalendarDays className="h-4 w-4 text-uva-orange" />
                Meetup flow
              </div>
              {item.meetupLocation ? <p className="mt-2">Spot: {item.meetupLocation}</p> : null}
              {item.meetupScheduledFor ? <p>When: {new Date(item.meetupScheduledFor).toLocaleString()}</p> : null}
              {item.meetupPlan ? <p className="mt-1 leading-6">{item.meetupPlan}</p> : null}
            </div>
          ) : null}

          {item.openIssue ? (
            <div className="rounded-[1.1rem] border border-uva-orange/20 bg-uva-orange/6 px-4 py-3 text-sm text-foreground/88">
              <div className="inline-flex items-center gap-1 font-medium text-foreground">
                <AlertCircle className="h-4 w-4 text-uva-orange" />
                Open issue
              </div>
              <p className="mt-2 uppercase tracking-[0.14em] text-xs text-muted-foreground">
                {item.openIssue.issueType.replaceAll("_", " ")}
              </p>
              {item.openIssue.description ? <p className="mt-1 leading-6">{item.openIssue.description}</p> : null}
            </div>
          ) : null}

          {item.review ? (
            <div className="rounded-[1.1rem] border border-border bg-card/72 px-4 py-3 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-1 font-medium text-foreground">
                <Star className="h-4 w-4 fill-uva-orange text-uva-orange" />
                {item.review.stars} star review
              </div>
              {item.review.comment ? (
                <p className="mt-2 leading-6">
                  “<LinkedPlaceText text={item.review.comment} />”
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {item.status === TransactionStatus.PENDING_CONFIRMATION && item.handoffStatus !== "MEETUP_SCHEDULED" ? (
              <Button variant="secondary" onClick={() => onScheduleMeetup(item.id, item.listing)} disabled={loadingKey === `meetup-${item.id}`}>
                {loadingKey === `meetup-${item.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-1.5 h-4 w-4" />}
                Schedule meetup
              </Button>
            ) : null}
            {item.status === TransactionStatus.PENDING_CONFIRMATION && item.handoffStatus !== "HANDOFF_CONFIRMED" ? (
              <Button variant="outline" onClick={() => onConfirmHandoff(item.id)} disabled={loadingKey === `handoff-${item.id}`}>
                {loadingKey === `handoff-${item.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Mark handoff done
              </Button>
            ) : null}
            {(item.status === TransactionStatus.PENDING_CONFIRMATION || item.status === TransactionStatus.ISSUE_REPORTED) ? (
              <Button variant="outline" onClick={() => onReportIssue(item.id, role)} disabled={loadingKey === `issue-${item.id}`}>
                {loadingKey === `issue-${item.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-1.5 h-4 w-4" />}
                Report issue
              </Button>
            ) : null}
            {role === "buyer" && item.status === TransactionStatus.PENDING_CONFIRMATION && !item.openIssue ? (
              <Button asChild>
                <Link href={`/purchases/${item.id}/confirm`}>Confirm receipt</Link>
              </Button>
            ) : null}
            {role === "seller" && (item.status === TransactionStatus.PENDING_CONFIRMATION || item.status === TransactionStatus.ISSUE_REPORTED) ? (
              <Button variant="outline" onClick={() => onCancel(item.id)} disabled={loadingKey === `cancel-${item.id}`}>
                {loadingKey === `cancel-${item.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                Cancel sale
              </Button>
            ) : null}
            {role === "seller" && item.status === TransactionStatus.CANCELLED ? (
              <Button onClick={() => onRelist(item.id)} disabled={loadingKey === `relist-${item.id}`}>
                {loadingKey === `relist-${item.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-1.5 h-4 w-4" />}
                Relist item
              </Button>
            ) : null}
            {item.conversationId ? (
              <Button variant="secondary" asChild>
                <Link href={`/messages?conversation=${item.conversationId}`}>
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  Open messages
                </Link>
              </Button>
            ) : null}
            <Button variant="ghost" asChild>
              <Link href={`/listing/${item.listing.id}`}>View listing</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PurchasesView({ purchases, sales }: PurchasesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const defaultTab = useMemo(() => {
    return searchParams.get("tab") === "sales" ? "sales" : "purchases";
  }, [searchParams]);

  async function cancelSale(transactionId: string) {
    setLoadingKey(`cancel-${transactionId}`);
    const response = await fetch(`/api/transactions/${transactionId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
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

  async function scheduleMeetup(transactionId: string, listing: PurchaseSummaryData["listing"]) {
    const location = window.prompt(`Meetup spot (${listing.pickupLocations.join(", ")})`, listing.pickupLocations[0] ?? "");
    if (location === null) return;

    const meetupPlan = window.prompt("Add an optional meetup note or timing detail.", "") ?? "";
    setLoadingKey(`meetup-${transactionId}`);
    const response = await fetch(`/api/transactions/${transactionId}/handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "schedule_meetup",
        meetupLocation: location.trim() || undefined,
        meetupPlan: meetupPlan.trim() || undefined
      })
    });
    setLoadingKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not save the meetup plan.");
      return;
    }

    toast.success("Meetup details saved.");
    router.refresh();
  }

  async function confirmHandoff(transactionId: string) {
    setLoadingKey(`handoff-${transactionId}`);
    const response = await fetch(`/api/transactions/${transactionId}/handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "confirm_handoff"
      })
    });
    setLoadingKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not mark the handoff as complete.");
      return;
    }

    toast.success("Handoff marked complete.");
    router.refresh();
  }

  async function reportIssue(transactionId: string, role: "buyer" | "seller") {
    const issueTypeInput = window.prompt(
      `Issue type (${TRANSACTION_ISSUE_TYPES.join(", ")})`,
      role === "buyer" ? "ITEM_NOT_AS_DESCRIBED" : "BUYER_NO_SHOW"
    );
    if (!issueTypeInput) return;

    const issueType = issueTypeInput.trim().toUpperCase();
    if (!TRANSACTION_ISSUE_TYPES.includes(issueType as (typeof TRANSACTION_ISSUE_TYPES)[number])) {
      toast.error("Use one of the listed issue types.");
      return;
    }

    const description = window.prompt("Share a short summary of what happened.", "");
    if (description === null) return;

    setLoadingKey(`issue-${transactionId}`);
    const response = await fetch(`/api/transactions/${transactionId}/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        issueType,
        description
      })
    });
    setLoadingKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not report this issue.");
      return;
    }

    toast.success("Issue reported. HoosFinds marked the transaction for review.");
    router.refresh();
  }

  async function relist(transactionId: string) {
    setLoadingKey(`relist-${transactionId}`);
    const response = await fetch(`/api/transactions/${transactionId}/relist`, {
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
    <Tabs defaultValue={defaultTab} className="space-y-5">
      <TabsList className="surface-panel inline-flex w-full justify-start gap-2 rounded-full p-1 md:w-auto">
        <TabsTrigger value="purchases">Purchases ({purchases.length})</TabsTrigger>
        <TabsTrigger value="sales">Sales ({sales.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="purchases" className="space-y-4">
        {purchases.length ? (
          purchases.map((item) => (
            <TransactionCard
              key={item.id}
              item={item}
              role="buyer"
              onCancel={cancelSale}
              onRelist={relist}
              onScheduleMeetup={scheduleMeetup}
              onConfirmHandoff={confirmHandoff}
              onReportIssue={reportIssue}
              loadingKey={loadingKey}
            />
          ))
        ) : (
          <EmptyState
            title="No purchases yet"
            description="Once you buy something through HoosFinds or get marked as the selected buyer, your pending confirmations will live here."
            ctaHref="/market"
            ctaLabel="Browse HoosFinds"
          />
        )}
      </TabsContent>

      <TabsContent value="sales" className="space-y-4">
        {sales.length ? (
          sales.map((item) => (
            <TransactionCard
              key={item.id}
              item={item}
              role="seller"
              onCancel={cancelSale}
              onRelist={relist}
              onScheduleMeetup={scheduleMeetup}
              onConfirmHandoff={confirmHandoff}
              onReportIssue={reportIssue}
              loadingKey={loadingKey}
            />
          ))
        ) : (
          <EmptyState
            title="No sales yet"
            description="When you mark a buyer or complete a Stripe-backed sale, the full confirmation trail will show up here."
            ctaHref="/sell"
            ctaLabel="List an item"
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
