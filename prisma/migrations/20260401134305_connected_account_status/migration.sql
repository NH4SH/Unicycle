-- CreateEnum
CREATE TYPE "ConnectedAccountStatus" AS ENUM ('ACTIVE', 'REQUIRES_RECONNECT');

-- AlterTable
ALTER TABLE "ConnectedAccount" ADD COLUMN     "disconnectedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ConnectedAccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusReason" TEXT;
