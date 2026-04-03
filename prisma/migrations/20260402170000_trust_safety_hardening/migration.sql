-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('PENDING_HANDOFF', 'MEETUP_SCHEDULED', 'HANDOFF_CONFIRMED', 'RECEIVED', 'ISSUE_REPORTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionIssueType" AS ENUM (
    'ITEM_NOT_RECEIVED',
    'ITEM_NOT_AS_DESCRIBED',
    'WRONG_ITEM',
    'DAMAGED_OR_POOR_CONDITION',
    'SELLER_NO_SHOW',
    'BUYER_NO_SHOW',
    'LAST_MINUTE_CANCELLATION',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "TransactionIssueStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ConversationReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TrustEventType" AS ENUM (
    'PAID_CANCELLATION',
    'REFUND_ISSUED',
    'SELLER_NO_SHOW',
    'BUYER_NO_SHOW',
    'ISSUE_REPORTED',
    'CONVERSATION_REPORTED',
    'USER_BLOCKED',
    'RELIST_AFTER_FAILED_HANDOFF',
    'DUPLICATE_CHECKOUT_BLOCKED'
);

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'ISSUE_REPORTED';

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "refundFailureReason" TEXT,
ADD COLUMN "refundReason" TEXT,
ADD COLUMN "refundRequestedById" TEXT,
ADD COLUMN "refundedAt" TIMESTAMP(3),
ADD COLUMN "stripeRefundId" TEXT;

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "handoffConfirmedAt" TIMESTAMP(3),
ADD COLUMN "handoffStatus" "HandoffStatus" NOT NULL DEFAULT 'PENDING_HANDOFF',
ADD COLUMN "meetupLocation" TEXT,
ADD COLUMN "meetupPlan" TEXT,
ADD COLUMN "meetupScheduledAt" TIMESTAMP(3),
ADD COLUMN "meetupScheduledFor" TIMESTAMP(3);

-- Backfill older paid orders and handoff rows so existing sales remain coherent.
UPDATE "Order"
SET "paidAt" = COALESCE("paidAt", "updatedAt", "createdAt")
WHERE "status" = 'PAID'
  AND "paidAt" IS NULL;

UPDATE "Transaction"
SET
  "handoffStatus" = CASE
    WHEN "status" = 'COMPLETED' THEN 'RECEIVED'::"HandoffStatus"
    WHEN "status" = 'CANCELLED' THEN 'CANCELLED'::"HandoffStatus"
    ELSE 'PENDING_HANDOFF'::"HandoffStatus"
  END,
  "handoffConfirmedAt" = CASE
    WHEN "status" = 'COMPLETED' THEN COALESCE("buyerConfirmedReceivedAt", "confirmedAt", "sellerMarkedSoldAt")
    ELSE "handoffConfirmedAt"
  END
WHERE "handoffStatus" = 'PENDING_HANDOFF';

-- CreateTable
CREATE TABLE "CheckoutReservation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStartedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionIssue" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "resolvedById" TEXT,
    "issueType" "TransactionIssueType" NOT NULL,
    "description" TEXT,
    "status" "TransactionIssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "TransactionIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationReport" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ConversationReportStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ConversationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blockerUserId","blockedUserId")
);

-- CreateTable
CREATE TABLE "UserTrustEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TrustEventType" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "orderId" TEXT,
    "transactionId" TEXT,
    "listingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTrustEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutReservation_listingId_key" ON "CheckoutReservation"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutReservation_orderId_key" ON "CheckoutReservation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutReservation_stripeCheckoutSessionId_key" ON "CheckoutReservation"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "CheckoutReservation_buyerId_idx" ON "CheckoutReservation"("buyerId");

-- CreateIndex
CREATE INDEX "CheckoutReservation_expiresAt_idx" ON "CheckoutReservation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_eventType_createdAt_idx" ON "StripeWebhookEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_processingStartedAt_idx" ON "StripeWebhookEvent"("processingStartedAt");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_processedAt_idx" ON "StripeWebhookEvent"("processedAt");

-- CreateIndex
CREATE INDEX "TransactionIssue_transactionId_status_createdAt_idx" ON "TransactionIssue"("transactionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionIssue_reporterId_createdAt_idx" ON "TransactionIssue"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionIssue_issueType_createdAt_idx" ON "TransactionIssue"("issueType", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationReport_conversationId_createdAt_idx" ON "ConversationReport"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationReport_status_createdAt_idx" ON "ConversationReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationReport_reporterId_createdAt_idx" ON "ConversationReport"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBlock_blockedUserId_idx" ON "UserBlock"("blockedUserId");

-- CreateIndex
CREATE INDEX "UserBlock_createdAt_idx" ON "UserBlock"("createdAt");

-- CreateIndex
CREATE INDEX "UserTrustEvent_userId_type_createdAt_idx" ON "UserTrustEvent"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "UserTrustEvent_createdAt_idx" ON "UserTrustEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeRefundId_key" ON "Order"("stripeRefundId");

-- CreateIndex
CREATE INDEX "Order_refundRequestedById_idx" ON "Order"("refundRequestedById");

-- CreateIndex
CREATE INDEX "Transaction_handoffStatus_idx" ON "Transaction"("handoffStatus");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_refundRequestedById_fkey" FOREIGN KEY ("refundRequestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutReservation" ADD CONSTRAINT "CheckoutReservation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutReservation" ADD CONSTRAINT "CheckoutReservation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutReservation" ADD CONSTRAINT "CheckoutReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionIssue" ADD CONSTRAINT "TransactionIssue_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionIssue" ADD CONSTRAINT "TransactionIssue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionIssue" ADD CONSTRAINT "TransactionIssue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrustEvent" ADD CONSTRAINT "UserTrustEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrustEvent" ADD CONSTRAINT "UserTrustEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrustEvent" ADD CONSTRAINT "UserTrustEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrustEvent" ADD CONSTRAINT "UserTrustEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
