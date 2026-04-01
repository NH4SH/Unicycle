import { redirect } from "next/navigation";

import { VerifiedSellerAdminDashboard } from "@/components/verified-seller/verified-seller-admin-dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { getVerifiedSellerApplicationsForAdmin } from "@/lib/verified-sellers";

export default async function AdminVerifiedSellersPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=%2Fadmin%2Fverified-sellers");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/market");
  }

  const applications = await getVerifiedSellerApplicationsForAdmin();

  return (
    <div className="container space-y-8 py-8 md:py-10">
      <section className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Admin</Badge>
            <Badge variant="blue">Verified Shop review</Badge>
          </div>
          <p className="editorial-eyebrow">Partner review queue</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Review local shops before they enter the marketplace.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Approved partners become Verified Shops inside the same HoosFinds listing and payout architecture. No second storefront, no separate inventory stack.
          </p>
        </div>
        <div className="rounded-full border border-border bg-card/75 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
          {applications.length} applications
        </div>
      </section>

      {applications.length ? (
        <VerifiedSellerAdminDashboard
          applications={applications.map((application) => ({
            ...application,
            createdAt: application.createdAt.toISOString(),
            reviewedAt: application.reviewedAt?.toISOString() ?? null,
            approvedAt: application.approvedAt?.toISOString() ?? null,
            approvedUser: application.approvedUser
              ? {
                  ...application.approvedUser,
                  verifiedShopApprovedAt: application.approvedUser.verifiedShopApprovedAt?.toISOString() ?? null
                }
              : null
          }))}
        />
      ) : (
        <Card className="surface-panel-strong">
          <CardContent className="p-6 text-sm leading-7 text-muted-foreground">
            No verified seller applications yet. Local shops can apply from <span className="font-medium text-foreground">/verified-seller/apply</span>.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
