import { ListingStatus, TransactionStatus } from "@prisma/client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { LISTING_STATUS_LABELS, TRANSACTION_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function statusVariant(status: ListingStatus | TransactionStatus): BadgeProps["variant"] {
  if (status === "PENDING_CONFIRMATION") {
    return "blue";
  }

  if (status === "ISSUE_REPORTED") {
    return "outline";
  }

  if (status === "COMPLETED") {
    return "orange";
  }

  return "outline";
}

export function ListingStatusBadge({ status, className }: { status: ListingStatus; className?: string }) {
  return (
    <Badge variant={statusVariant(status)} className={cn(status === ListingStatus.CANCELLED && "opacity-90", className)}>
      {LISTING_STATUS_LABELS[status]}
    </Badge>
  );
}

export function TransactionStatusBadge({ status, className }: { status: TransactionStatus; className?: string }) {
  return (
    <Badge variant={statusVariant(status)} className={cn(status === TransactionStatus.CANCELLED && "opacity-90", className)}>
      {TRANSACTION_STATUS_LABELS[status]}
    </Badge>
  );
}
