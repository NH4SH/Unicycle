"use client";

import Link from "next/link";
import { type ComponentType, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Shield, ShieldAlert, Store, Tag, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { VerifiedSellerAdminDashboard } from "@/components/verified-seller/verified-seller-admin-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyFromCents, timeAgo } from "@/lib/utils";
import { VERIFIED_SHOP_LABEL } from "@/lib/verified-shop";

type AdminDashboardData = {
  overview: {
    totalUsers: number;
    activeUsers30d: number;
    newUsersSeries: Array<{ date: string; count: number }>;
    totalListings: number;
    activeListings: number;
    soldListings: number;
    pendingHandoffs: number;
    removedListings: number;
    hiddenListings: number;
    pendingApplications: number;
    approvedVerifiedShops: number;
    paidOrders: number;
    gmvCents: number;
    buyerVolumeCents: number;
    platformRevenueCents: number;
    refundedOrders: number;
    openTransactionIssues: number;
    reportedConversations: number;
  };
  applications: Array<{
    id: string;
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    instagram: string;
    website: string | null;
    neighborhood: string;
    address: string;
    whatTheySell: string;
    description: string;
    whyJoin: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
    internalNotes: string | null;
    createdAt: string;
    reviewedAt: string | null;
    approvedAt: string | null;
    reviewedBy: {
      id: string;
      name: string | null;
      username: string;
    } | null;
    approvedUser: {
      id: string;
      email: string;
      username: string;
      role: "USER" | "VERIFIED_SHOP" | "ADMIN";
      sellerKind: "STUDENT" | "VERIFIED_SHOP";
      verifiedShopApprovedAt: string | null;
    } | null;
  }>;
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    username: string;
    role: "USER" | "VERIFIED_SHOP" | "ADMIN";
    sellerKind: "STUDENT" | "VERIFIED_SHOP";
    createdAt: string;
  }>;
  recentListings: Array<{
    id: string;
    title: string;
    status: string;
    moderationStatus: "VISIBLE" | "HIDDEN" | "REMOVED";
    moderationReason: string | null;
    createdAt: string;
    seller: {
      id: string;
      name: string | null;
      email: string;
      username: string;
      role: "USER" | "VERIFIED_SHOP" | "ADMIN";
      sellerKind: "STUDENT" | "VERIFIED_SHOP";
    };
  }>;
  recentSales: Array<{
    id: string;
    createdAt: string;
    amountCents: number;
    buyerTotalCents: number | null;
    buyerFeeTotalCents: number | null;
    taxAmountCents: number | null;
    sellerFeeCents: number | null;
    stripeFeeCents: number | null;
    perOrderFeeCents: number | null;
    sellerPayoutCents: number | null;
    listing: { id: string; title: string };
    buyer: { id: string; name: string | null; username: string };
    seller: { id: string; name: string | null; username: string };
  }>;
  recentAuditLog: Array<{
    id: string;
    createdAt: string;
    action: string;
    reason: string;
    notes: string | null;
    actor: { id: string; name: string | null; username: string } | null;
    targetUser: { id: string; name: string | null; email: string; username: string } | null;
    targetListing: { id: string; title: string } | null;
    targetVerifiedSellerApplication: { id: string; businessName: string; email: string } | null;
  }>;
  recentRefunds: Array<{
    id: string;
    status: "REFUND_PENDING" | "REFUNDED";
    refundReason: string | null;
    refundFailureReason: string | null;
    createdAt: string;
    paidAt: string | null;
    refundedAt: string | null;
    listing: { id: string; title: string };
    buyer: { id: string; name: string | null; username: string };
    seller: { id: string; name: string | null; username: string };
  }>;
  recentTransactionIssues: Array<{
    id: string;
    issueType: string;
    status: "OPEN" | "RESOLVED" | "DISMISSED";
    description: string | null;
    createdAt: string;
    resolvedAt: string | null;
    resolutionNotes: string | null;
    reporter: { id: string; name: string | null; username: string };
    resolvedBy: { id: string; name: string | null; username: string } | null;
    transaction: {
      id: string;
      status: string;
      listing: { id: string; title: string };
      buyer: { id: string; name: string | null; username: string };
      seller: { id: string; name: string | null; username: string };
    };
  }>;
  recentConversationReports: Array<{
    id: string;
    reason: string;
    status: "OPEN" | "REVIEWED" | "DISMISSED";
    notes: string | null;
    createdAt: string;
    reviewedAt: string | null;
    reporter: { id: string; name: string | null; username: string };
    reviewedBy: { id: string; name: string | null; username: string } | null;
    conversation: {
      id: string;
      listing: { id: string; title: string };
      buyer: { id: string; name: string | null; username: string };
      seller: { id: string; name: string | null; username: string };
    };
  }>;
  recentTrustEvents: Array<{
    id: string;
    type: string;
    description: string | null;
    createdAt: string;
    metadata: unknown;
    user: { id: string; name: string | null; username: string };
    listing: { id: string; title: string } | null;
    order: { id: string; status: string } | null;
    transaction: { id: string; status: string } | null;
  }>;
  userActivitySummaries: Array<{
    id: string;
    name: string | null;
    email: string;
    username: string;
    role: "USER" | "VERIFIED_SHOP" | "ADMIN";
    sellerKind: "STUDENT" | "VERIFIED_SHOP";
    verifiedShopApprovedAt: string | null;
    createdAt: string;
    latestActivity: string | null;
    listingCount: number;
    liveListingCount: number;
    purchaseCount: number;
    completedSalesCount: number;
    currentBan: {
      id: string;
      reason: string;
      endsAt: string | null;
      createdAt: string;
    } | null;
  }>;
};

type UserModerationDraft = {
  reason: string;
  endsAt: string;
  internalNotes: string;
};

type ListingModerationDraft = {
  reason: string;
  internalNotes: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString();
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="surface-panel-strong">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="editorial-eyebrow">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="font-display text-3xl font-extrabold tracking-tight">{value}</p>
        <p className="text-sm leading-6 text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const router = useRouter();
  const [userDrafts, setUserDrafts] = useState<Record<string, UserModerationDraft>>({});
  const [listingDrafts, setListingDrafts] = useState<Record<string, ListingModerationDraft>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const topMetrics = useMemo(
    () => [
      {
        label: "Total users",
        value: data.overview.totalUsers.toLocaleString(),
        hint: `${data.overview.activeUsers30d.toLocaleString()} active in the last 30 days`,
        icon: UserRoundCheck
      },
      {
        label: "Listings live",
        value: data.overview.activeListings.toLocaleString(),
        hint: `${data.overview.totalListings.toLocaleString()} total listings in platform history`,
        icon: Tag
      },
      {
        label: `${VERIFIED_SHOP_LABEL}s approved`,
        value: data.overview.approvedVerifiedShops.toLocaleString(),
        hint: `${data.overview.pendingApplications.toLocaleString()} applications waiting on review`,
        icon: Store
      },
      {
        label: "Paid orders",
        value: data.overview.paidOrders.toLocaleString(),
        hint: `${data.overview.pendingHandoffs.toLocaleString()} paid orders still awaiting handoff`,
        icon: Shield
      },
      {
        label: "GMV",
        value: formatCurrencyFromCents(data.overview.gmvCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        hint: `${formatCurrencyFromCents(data.overview.buyerVolumeCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} charged to buyers`,
        icon: BarChart3
      },
      {
        label: "Platform revenue",
        value: formatCurrencyFromCents(data.overview.platformRevenueCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        hint: `${data.overview.refundedOrders.toLocaleString()} refunds · ${data.overview.openTransactionIssues.toLocaleString()} open handoff issues · ${data.overview.reportedConversations.toLocaleString()} reported threads`,
        icon: ShieldAlert
      }
    ],
    [data]
  );

  async function moderateUser(userId: string, action: "ban" | "unban") {
    const draft = userDrafts[userId] ?? { reason: "", endsAt: "", internalNotes: "" };
    setLoadingKey(`user:${userId}:${action}`);

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action,
        reason: draft.reason,
        endsAt: draft.endsAt || undefined,
        internalNotes: draft.internalNotes || undefined
      })
    });

    setLoadingKey(null);
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      toast.error(payload?.message || "Could not update this user.");
      return;
    }

    toast.success(action === "ban" ? "User restriction saved." : "Ban removed.");
    router.refresh();
  }

  async function moderateListing(listingId: string, action: "hide" | "remove" | "restore") {
    const draft = listingDrafts[listingId] ?? { reason: "", internalNotes: "" };
    setLoadingKey(`listing:${listingId}:${action}`);

    const response = await fetch(`/api/admin/listings/${listingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action,
        reason: draft.reason,
        internalNotes: draft.internalNotes || undefined
      })
    });

    setLoadingKey(null);
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      toast.error(payload?.message || "Could not update this listing.");
      return;
    }

    toast.success(action === "restore" ? "Listing restored." : "Listing moderation saved.");
    router.refresh();
  }

  return (
    <div className="container space-y-8 py-8 md:space-y-10 md:py-10">
      <section className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Admin</Badge>
            <Badge variant="blue">Founder tools</Badge>
          </div>
          <p className="editorial-eyebrow">HoosFinds control center</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Review applications, moderate the marketplace, and watch the business move.
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            This dashboard keeps verified seller approvals, user restrictions, listing moderation, sales history, and platform metrics in one place so the marketplace stays clean and easy to run.
          </p>
        </div>
        <div className="surface-pill px-4 py-2 text-xs uppercase tracking-[0.18em]">
          {data.overview.pendingApplications} applications pending
        </div>
      </section>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="w-full flex-wrap justify-start rounded-[1.25rem] p-1.5 md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="verified-sellers">Verified sellers</TabsTrigger>
          <TabsTrigger value="users">User moderation</TabsTrigger>
          <TabsTrigger value="listings">Listing moderation</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <Card className="surface-panel-strong">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Growth</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">New users over the last 14 days</h2>
                  <p className="text-sm leading-7 text-muted-foreground">A quick pulse on how fast HoosFinds is growing right now.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {data.overview.newUsersSeries.map((day) => (
                    <div key={day.date} className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{day.date.slice(5)}</p>
                      <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{day.count}</p>
                      <p className="text-sm text-muted-foreground">new users</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-panel-strong">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Recent sales</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">Latest marketplace orders</h2>
                </div>
                <div className="space-y-3">
                  {data.recentSales.length ? (
                    data.recentSales.map((sale) => (
                      <div key={sale.id} className="rounded-[1.3rem] border border-border bg-background/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link href={`/listing/${sale.listing.id}`} className="font-semibold text-foreground transition hover:text-uva-orange">
                              {sale.listing.title}
                            </Link>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {sale.buyer.name || `@${sale.buyer.username}`} bought from {sale.seller.name || `@${sale.seller.username}`}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-semibold text-foreground">
                              {formatCurrencyFromCents(sale.buyerTotalCents ?? sale.amountCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-muted-foreground">{timeAgo(sale.createdAt)} ago</p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between gap-3">
                            <span>Item price</span>
                            <span>{formatCurrencyFromCents(sale.amountCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Buyer fee</span>
                            <span>{formatCurrencyFromCents(sale.buyerFeeTotalCents ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Seller payout</span>
                            <span>{formatCurrencyFromCents(sale.sellerPayoutCents ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-muted-foreground">No completed Stripe orders yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <Card className="surface-panel-strong">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Newest accounts</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">Recent signups</h2>
                </div>
                <div className="space-y-3">
                  {data.recentUsers.map((user) => (
                    <div key={user.id} className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{user.name || `@${user.username}`}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge variant={user.role === "ADMIN" ? "blue" : "outline"}>{user.role.toLowerCase()}</Badge>
                          <Badge variant="outline">{user.sellerKind === "VERIFIED_SHOP" ? VERIFIED_SHOP_LABEL : "Student seller"}</Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Joined {formatDateTime(user.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-panel-strong">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Marketplace health</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">Quick state</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Active listings</p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{data.overview.activeListings}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Sold listings</p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{data.overview.soldListings}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Hidden listings</p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{data.overview.hiddenListings}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Removed listings</p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{data.overview.removedListings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="verified-sellers" className="space-y-5">
          <VerifiedSellerAdminDashboard applications={data.applications} />
        </TabsContent>

        <TabsContent value="users" className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.userActivitySummaries.map((user) => {
              const draft = userDrafts[user.id] ?? { reason: "", endsAt: "", internalNotes: "" };
              return (
                <Card key={user.id} className="surface-panel-strong">
                  <CardContent className="space-y-5 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-display text-2xl font-extrabold tracking-tight">{user.name || `@${user.username}`}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {formatDateTime(user.createdAt)} · Latest activity {user.latestActivity ? timeAgo(user.latestActivity) : "none yet"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={user.role === "ADMIN" ? "blue" : "outline"}>{user.role.toLowerCase()}</Badge>
                        <Badge variant="outline">{user.sellerKind === "VERIFIED_SHOP" ? VERIFIED_SHOP_LABEL : "Student seller"}</Badge>
                        {user.currentBan ? <Badge variant="orange">Restricted</Badge> : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-[1.2rem] border border-border bg-background/70 px-4 py-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Listings</p>
                        <p className="mt-2 font-semibold text-foreground">{user.liveListingCount} live</p>
                        <p className="text-muted-foreground">{user.listingCount} total</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-border bg-background/70 px-4 py-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Purchases</p>
                        <p className="mt-2 font-semibold text-foreground">{user.purchaseCount}</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-border bg-background/70 px-4 py-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Completed sales</p>
                        <p className="mt-2 font-semibold text-foreground">{user.completedSalesCount}</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-border bg-background/70 px-4 py-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current ban</p>
                        <p className="mt-2 font-semibold text-foreground">{user.currentBan ? (user.currentBan.endsAt ? "Temporary" : "Permanent") : "None"}</p>
                        <p className="text-muted-foreground">{user.currentBan?.endsAt ? `Until ${formatDateTime(user.currentBan.endsAt)}` : user.currentBan ? "Manual review required" : "No restriction"}</p>
                      </div>
                    </div>

                    {user.currentBan ? (
                      <div className="rounded-[1.2rem] border border-uva-orange/20 bg-uva-orange/7 px-4 py-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Current reason</p>
                        <p className="mt-1 leading-7">{user.currentBan.reason}</p>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label htmlFor={`ban-reason-${user.id}`}>Ban reason</Label>
                      <Textarea
                        id={`ban-reason-${user.id}`}
                        value={draft.reason}
                        onChange={(event) => setUserDrafts((prev) => ({ ...prev, [user.id]: { ...draft, reason: event.target.value } }))}
                        placeholder="Explain why this account is being restricted."
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`ban-ends-${user.id}`}>Temporary ban ends at (optional)</Label>
                        <Input
                          id={`ban-ends-${user.id}`}
                          type="datetime-local"
                          value={draft.endsAt}
                          onChange={(event) => setUserDrafts((prev) => ({ ...prev, [user.id]: { ...draft, endsAt: event.target.value } }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`ban-notes-${user.id}`}>Internal notes</Label>
                        <Textarea
                          id={`ban-notes-${user.id}`}
                          value={draft.internalNotes}
                          onChange={(event) => setUserDrafts((prev) => ({ ...prev, [user.id]: { ...draft, internalNotes: event.target.value } }))}
                          placeholder="Context for the founder/admin team."
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => moderateUser(user.id, "ban")}
                        disabled={loadingKey !== null || user.role === "ADMIN"}
                      >
                        {loadingKey === `user:${user.id}:ban` ? "Saving..." : user.currentBan ? "Replace ban" : "Ban user"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => moderateUser(user.id, "unban")}
                        disabled={loadingKey !== null || !user.currentBan}
                      >
                        {loadingKey === `user:${user.id}:unban` ? "Removing..." : "Remove ban"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="listings" className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.recentListings.map((listing) => {
              const draft = listingDrafts[listing.id] ?? { reason: "", internalNotes: "" };
              return (
                <Card key={listing.id} className="surface-panel-strong">
                  <CardContent className="space-y-5 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Link href={`/listing/${listing.id}`} className="font-display text-2xl font-extrabold tracking-tight text-foreground transition hover:text-uva-orange">
                          {listing.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Seller: {listing.seller.name || `@${listing.seller.username}`} · Created {formatDateTime(listing.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{listing.status.toLowerCase()}</Badge>
                        <Badge variant={listing.moderationStatus === "VISIBLE" ? "blue" : "orange"}>
                          {listing.moderationStatus.toLowerCase()}
                        </Badge>
                      </div>
                    </div>

                    {listing.moderationReason ? (
                      <div className="rounded-[1.2rem] border border-uva-orange/20 bg-uva-orange/7 px-4 py-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Current moderation reason</p>
                        <p className="mt-1 leading-7">{listing.moderationReason}</p>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label htmlFor={`listing-reason-${listing.id}`}>Moderation reason</Label>
                      <Textarea
                        id={`listing-reason-${listing.id}`}
                        value={draft.reason}
                        onChange={(event) => setListingDrafts((prev) => ({ ...prev, [listing.id]: { ...draft, reason: event.target.value } }))}
                        placeholder="Explain why this listing is being hidden or removed."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`listing-notes-${listing.id}`}>Internal notes</Label>
                      <Textarea
                        id={`listing-notes-${listing.id}`}
                        value={draft.internalNotes}
                        onChange={(event) => setListingDrafts((prev) => ({ ...prev, [listing.id]: { ...draft, internalNotes: event.target.value } }))}
                        placeholder="Optional context for the moderation trail."
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => moderateListing(listing.id, "hide")}
                        disabled={loadingKey !== null}
                      >
                        {loadingKey === `listing:${listing.id}:hide` ? "Saving..." : "Hide listing"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => moderateListing(listing.id, "remove")}
                        disabled={loadingKey !== null}
                      >
                        {loadingKey === `listing:${listing.id}:remove` ? "Saving..." : "Remove listing"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => moderateListing(listing.id, "restore")}
                        disabled={loadingKey !== null || listing.moderationStatus === "VISIBLE"}
                      >
                        {loadingKey === `listing:${listing.id}:restore` ? "Restoring..." : "Restore listing"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <Card className="surface-panel-strong">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Moderation + approval history</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">Admin audit trail</h2>
                </div>
                <div className="space-y-3">
                  {data.recentAuditLog.length ? (
                    data.recentAuditLog.map((entry) => (
                      <div key={entry.id} className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{entry.action.replaceAll("_", " ").toLowerCase()}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p>
                          </div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{timeAgo(entry.createdAt)} ago</p>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                          <p>Actor: {entry.actor?.name || (entry.actor ? `@${entry.actor.username}` : "System")}</p>
                          {entry.targetUser ? <p>Target user: {entry.targetUser.name || `@${entry.targetUser.username}`}</p> : null}
                          {entry.targetListing ? <p>Target listing: {entry.targetListing.title}</p> : null}
                          {entry.targetVerifiedSellerApplication ? <p>Target shop: {entry.targetVerifiedSellerApplication.businessName}</p> : null}
                          {entry.notes ? <p>Notes: {entry.notes}</p> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-muted-foreground">No admin actions recorded yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-panel-strong">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Useful links</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">Quick jumps</h2>
                </div>
                <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                  <p>Use this dashboard for approvals, moderation, sales, and platform diagnostics.</p>
                  <div className="grid gap-3">
                    <Button asChild variant="secondary" className="justify-start">
                      <Link href="/verified-seller/apply">Open Verified Shop application page</Link>
                    </Button>
                    <Button asChild variant="secondary" className="justify-start">
                      <Link href="/payments">Open payout center</Link>
                    </Button>
                    <Button asChild variant="secondary" className="justify-start">
                      <Link href="/market">View live marketplace</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="surface-panel-strong">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Refund history</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">Paid sale reversals</h2>
                </div>
                <div className="space-y-3">
                  {data.recentRefunds.length ? (
                    data.recentRefunds.map((refund) => (
                      <div key={refund.id} className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link href={`/listing/${refund.listing.id}`} className="font-semibold text-foreground transition hover:text-uva-orange">
                              {refund.listing.title}
                            </Link>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Buyer {refund.buyer.name || `@${refund.buyer.username}`} · Seller {refund.seller.name || `@${refund.seller.username}`}
                            </p>
                          </div>
                          <Badge variant={refund.status === "REFUNDED" ? "orange" : "outline"}>{refund.status.toLowerCase()}</Badge>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                          <p>Created {formatDateTime(refund.createdAt)}</p>
                          {refund.paidAt ? <p>Paid at {formatDateTime(refund.paidAt)}</p> : null}
                          {refund.refundedAt ? <p>Refunded at {formatDateTime(refund.refundedAt)}</p> : null}
                          {refund.refundReason ? <p>Reason: {refund.refundReason}</p> : null}
                          {refund.refundFailureReason ? <p>Failure: {refund.refundFailureReason}</p> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-muted-foreground">No refund activity yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-panel-strong">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Transaction problems</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">Open handoff issues</h2>
                </div>
                <div className="space-y-3">
                  {data.recentTransactionIssues.length ? (
                    data.recentTransactionIssues.map((issue) => (
                      <div key={issue.id} className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link href={`/listing/${issue.transaction.listing.id}`} className="font-semibold text-foreground transition hover:text-uva-orange">
                              {issue.transaction.listing.title}
                            </Link>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {issue.issueType.replaceAll("_", " ").toLowerCase()} · reported by {issue.reporter.name || `@${issue.reporter.username}`}
                            </p>
                          </div>
                          <Badge variant={issue.status === "OPEN" ? "orange" : "outline"}>{issue.status.toLowerCase()}</Badge>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                          <p>Buyer: {issue.transaction.buyer.name || `@${issue.transaction.buyer.username}`}</p>
                          <p>Seller: {issue.transaction.seller.name || `@${issue.transaction.seller.username}`}</p>
                          <p>Opened {formatDateTime(issue.createdAt)}</p>
                          {issue.description ? <p>Details: {issue.description}</p> : null}
                          {issue.resolvedAt ? <p>Resolved {formatDateTime(issue.resolvedAt)}</p> : null}
                          {issue.resolutionNotes ? <p>Resolution: {issue.resolutionNotes}</p> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-muted-foreground">No transaction issues have been reported yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="surface-panel-strong">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Messaging safety</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">Reported conversations</h2>
                </div>
                <div className="space-y-3">
                  {data.recentConversationReports.length ? (
                    data.recentConversationReports.map((report) => (
                      <div key={report.id} className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link href={`/listing/${report.conversation.listing.id}`} className="font-semibold text-foreground transition hover:text-uva-orange">
                              {report.conversation.listing.title}
                            </Link>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Buyer {report.conversation.buyer.name || `@${report.conversation.buyer.username}`} · Seller {report.conversation.seller.name || `@${report.conversation.seller.username}`}
                            </p>
                          </div>
                          <Badge variant={report.status === "OPEN" ? "orange" : "outline"}>{report.status.toLowerCase()}</Badge>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                          <p>Reported by {report.reporter.name || `@${report.reporter.username}`}</p>
                          <p>Reason: {report.reason}</p>
                          <p>Opened {formatDateTime(report.createdAt)}</p>
                          {report.notes ? <p>Notes: {report.notes}</p> : null}
                          {report.reviewedAt ? <p>Reviewed {formatDateTime(report.reviewedAt)}</p> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-muted-foreground">No conversation reports yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-panel-strong">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Trust signals</p>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">Behavior patterns</h2>
                </div>
                <div className="space-y-3">
                  {data.recentTrustEvents.length ? (
                    data.recentTrustEvents.map((event) => (
                      <div key={event.id} className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{event.type.replaceAll("_", " ").toLowerCase()}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {event.user.name || `@${event.user.username}`}
                              {event.listing ? ` · ${event.listing.title}` : ""}
                            </p>
                          </div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{timeAgo(event.createdAt)} ago</p>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                          {event.description ? <p>{event.description}</p> : null}
                          {event.order ? <p>Order: {event.order.id} · {event.order.status.toLowerCase()}</p> : null}
                          {event.transaction ? <p>Transaction: {event.transaction.id} · {event.transaction.status.toLowerCase()}</p> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-muted-foreground">No trust events recorded yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
