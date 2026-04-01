-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SellerKind" AS ENUM ('STUDENT', 'VERIFIED_SHOP');

-- CreateEnum
CREATE TYPE "VerifiedSellerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "sellerKind" "SellerKind" NOT NULL DEFAULT 'STUDENT',
ADD COLUMN     "verifiedShopApprovedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedShopInstagram" TEXT,
ADD COLUMN     "verifiedShopLocation" TEXT,
ADD COLUMN     "verifiedShopName" TEXT,
ADD COLUMN     "verifiedShopWebsite" TEXT;

-- CreateTable
CREATE TABLE "VerifiedSellerApplication" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "website" TEXT,
    "location" TEXT NOT NULL,
    "whatTheySell" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "whyJoin" TEXT NOT NULL,
    "status" "VerifiedSellerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "approvedUserId" TEXT,

    CONSTRAINT "VerifiedSellerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedSellerApplication_email_key" ON "VerifiedSellerApplication"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedSellerApplication_approvedUserId_key" ON "VerifiedSellerApplication"("approvedUserId");

-- CreateIndex
CREATE INDEX "VerifiedSellerApplication_status_createdAt_idx" ON "VerifiedSellerApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VerifiedSellerApplication_reviewedById_reviewedAt_idx" ON "VerifiedSellerApplication"("reviewedById", "reviewedAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_sellerKind_idx" ON "User"("sellerKind");

-- AddForeignKey
ALTER TABLE "VerifiedSellerApplication" ADD CONSTRAINT "VerifiedSellerApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedSellerApplication" ADD CONSTRAINT "VerifiedSellerApplication_approvedUserId_fkey" FOREIGN KEY ("approvedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
