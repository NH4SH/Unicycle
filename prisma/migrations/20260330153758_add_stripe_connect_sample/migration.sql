-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectProduct" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "stripeProductId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_key" ON "ConnectedAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_stripeAccountId_key" ON "ConnectedAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "ConnectedAccount_createdAt_idx" ON "ConnectedAccount"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectProduct_stripeProductId_key" ON "ConnectProduct"("stripeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectProduct_stripePriceId_key" ON "ConnectProduct"("stripePriceId");

-- CreateIndex
CREATE INDEX "ConnectProduct_ownerUserId_createdAt_idx" ON "ConnectProduct"("ownerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ConnectProduct_connectedAccountId_createdAt_idx" ON "ConnectProduct"("connectedAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "ConnectProduct_active_createdAt_idx" ON "ConnectProduct"("active", "createdAt");

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectProduct" ADD CONSTRAINT "ConnectProduct_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectProduct" ADD CONSTRAINT "ConnectProduct_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
