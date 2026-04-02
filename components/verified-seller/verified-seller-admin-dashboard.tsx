"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VERIFIED_SHOP_LABEL } from "@/lib/verified-shop";

type AdminApplication = {
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
};

const statusBadgeVariant: Record<AdminApplication["status"], "outline" | "orange" | "blue"> = {
  PENDING: "orange",
  APPROVED: "blue",
  REJECTED: "outline",
  REVOKED: "outline"
};

export function VerifiedSellerAdminDashboard({ applications }: { applications: AdminApplication[] }) {
  const router = useRouter();
  const [notesById, setNotesById] = useState<Record<string, string>>(
    Object.fromEntries(applications.map((application) => [application.id, application.internalNotes ?? ""]))
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function updateApplication(id: string, action: "approve" | "reject" | "revoke") {
    setLoadingKey(`${id}:${action}`);
    const response = await fetch(`/api/admin/verified-sellers/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action,
        internalNotes: notesById[id] || undefined
      })
    });
    setLoadingKey(null);

    const data = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      toast.error(data?.message || "Could not update this application.");
      return;
    }

    toast.success(
      action === "approve"
        ? `${VERIFIED_SHOP_LABEL} approved. Password setup email sent.`
        : action === "revoke"
          ? `${VERIFIED_SHOP_LABEL} access revoked.`
          : "Application updated."
    );
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {applications.map((application) => (
        <Card key={application.id} className="surface-panel-strong">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusBadgeVariant[application.status]}>{application.status.toLowerCase()}</Badge>
                  {application.approvedUser ? <Badge variant="outline">User @{application.approvedUser.username}</Badge> : null}
                </div>
                <div className="space-y-1">
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">{application.businessName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {application.contactName} · {application.email} · {application.phone}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  onClick={() => updateApplication(application.id, "approve")}
                  disabled={Boolean(loadingKey)}
                >
                  {loadingKey === `${application.id}:approve` ? "Approving..." : "Approve"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => updateApplication(application.id, "reject")}
                  disabled={Boolean(loadingKey)}
                >
                  {loadingKey === `${application.id}:reject` ? "Saving..." : "Reject"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateApplication(application.id, "revoke")}
                  disabled={Boolean(loadingKey) || !application.approvedUser}
                >
                  {loadingKey === `${application.id}:revoke` ? "Revoking..." : "Revoke"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.4rem] border border-border bg-background/70 p-4">
                <p className="editorial-eyebrow">Shop details</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Instagram:</span> {application.instagram}</p>
                  <p><span className="font-medium text-foreground">Website:</span> {application.website || "Not provided"}</p>
                  <p><span className="font-medium text-foreground">Neighborhood:</span> {application.neighborhood}</p>
                  <p><span className="font-medium text-foreground">Address:</span> {application.address}</p>
                  <p><span className="font-medium text-foreground">What they sell:</span> {application.whatTheySell}</p>
                  {application.approvedUser ? (
                    <p>
                      <span className="font-medium text-foreground">Approved account:</span> @{application.approvedUser.username} · {application.approvedUser.role.toLowerCase()}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-border bg-background/70 p-4">
                <p className="editorial-eyebrow">Why HoosFinds</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{application.whyJoin}</p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border bg-background/70 p-4">
              <p className="editorial-eyebrow">Description</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{application.description}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`notes-${application.id}`}>Internal notes</Label>
              <Textarea
                id={`notes-${application.id}`}
                value={notesById[application.id] ?? ""}
                onChange={(event) => setNotesById((prev) => ({ ...prev, [application.id]: event.target.value }))}
                placeholder="Add review notes, approval context, or revocation details."
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
