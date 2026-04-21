DO $$
BEGIN
  CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'OFFER', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "kind" "MessageKind" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "offerId" TEXT;

CREATE TABLE IF NOT EXISTS "ConversationOffer" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "acceptedTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "ConversationOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Message_offerId_key" ON "Message"("offerId");
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationOffer_acceptedTransactionId_key" ON "ConversationOffer"("acceptedTransactionId");
CREATE INDEX IF NOT EXISTS "Message_kind_idx" ON "Message"("kind");
CREATE INDEX IF NOT EXISTS "ConversationOffer_conversationId_createdAt_idx" ON "ConversationOffer"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ConversationOffer_listingId_status_idx" ON "ConversationOffer"("listingId", "status");
CREATE INDEX IF NOT EXISTS "ConversationOffer_buyerId_createdAt_idx" ON "ConversationOffer"("buyerId", "createdAt");
CREATE INDEX IF NOT EXISTS "ConversationOffer_sellerId_createdAt_idx" ON "ConversationOffer"("sellerId", "createdAt");
CREATE INDEX IF NOT EXISTS "ConversationOffer_status_createdAt_idx" ON "ConversationOffer"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_offerId_fkey') THEN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ConversationOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationOffer_conversationId_fkey') THEN
    ALTER TABLE "ConversationOffer" ADD CONSTRAINT "ConversationOffer_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationOffer_listingId_fkey') THEN
    ALTER TABLE "ConversationOffer" ADD CONSTRAINT "ConversationOffer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationOffer_buyerId_fkey') THEN
    ALTER TABLE "ConversationOffer" ADD CONSTRAINT "ConversationOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationOffer_sellerId_fkey') THEN
    ALTER TABLE "ConversationOffer" ADD CONSTRAINT "ConversationOffer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationOffer_acceptedTransactionId_fkey') THEN
    ALTER TABLE "ConversationOffer" ADD CONSTRAINT "ConversationOffer_acceptedTransactionId_fkey" FOREIGN KEY ("acceptedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
