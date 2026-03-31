-- CreateTable
CREATE TABLE "ConnectOrder" (
    "id" TEXT NOT NULL,
    "connectProductId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "applicationFeeCents" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CHECKOUT_CREATED',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectOrder_stripeCheckoutSessionId_key" ON "ConnectOrder"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectOrder_stripePaymentIntentId_key" ON "ConnectOrder"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "ConnectOrder_connectProductId_idx" ON "ConnectOrder"("connectProductId");

-- CreateIndex
CREATE INDEX "ConnectOrder_buyerId_idx" ON "ConnectOrder"("buyerId");

-- CreateIndex
CREATE INDEX "ConnectOrder_sellerId_idx" ON "ConnectOrder"("sellerId");

-- CreateIndex
CREATE INDEX "ConnectOrder_connectedAccountId_idx" ON "ConnectOrder"("connectedAccountId");

-- CreateIndex
CREATE INDEX "ConnectOrder_status_idx" ON "ConnectOrder"("status");

-- AddForeignKey
ALTER TABLE "ConnectOrder" ADD CONSTRAINT "ConnectOrder_connectProductId_fkey" FOREIGN KEY ("connectProductId") REFERENCES "ConnectProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectOrder" ADD CONSTRAINT "ConnectOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectOrder" ADD CONSTRAINT "ConnectOrder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectOrder" ADD CONSTRAINT "ConnectOrder_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
