"use client";

import Image from "next/image";
import Link from "next/link";
import { TransactionStatus } from "@prisma/client";
import { Loader2, MessageCircle, RefreshCcw, Star, XCircle } from "lucide-react";
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
import { formatCurrency, timeAgo } from "@/lib/utils";

type PurchasesViewProps = {
  purchases: PurchaseSummaryData[];
  sales: PurchaseSummaryData[];
};

function TransactionCard({
  item,
  role,
  onCancel,
  onRelist,
  loadingKey
}: {
  item: PurchaseSummaryData;
  role: "buyer" | "seller";
  onCancel: (transactionId: string) => void;
  onRelist: (transactionId: string) => void;
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
            <p>{role === "buyer" ? "Marked sold" : "Buyer confirmation"} {item.sellerMarkedSoldAt ? timeAgo(item.sellerMarkedSoldAt) + " ago" : "pending"}</p>
            <p>{item.confirmedAt ? `Completed ${timeAgo(item.confirmedAt)} ago` : "Still awaiting final confirmation"}</p>
          </div>

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
            {role === "buyer" && item.status === TransactionStatus.PENDING_CONFIRMATION ? (
              <Button asChild>
                <Link href={`/purchases/${item.id}/confirm`}>Confirm receipt</Link>
              </Button>
            ) : null}
            {role === "seller" && item.status === TransactionStatus.PENDING_CONFIRMATION ? (
              <Button variant="outline" onClick={() => onCancel(item.id)} disabled={loadingKey === `cancel-${item.id}`}>
                {loadingKey === `cancel-${item.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                Cancel pending sale
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
            <TransactionCard key={item.id} item={item} role="buyer" onCancel={cancelSale} onRelist={relist} loadingKey={loadingKey} />
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
            <TransactionCard key={item.id} item={item} role="seller" onCancel={cancelSale} onRelist={relist} loadingKey={loadingKey} />
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
