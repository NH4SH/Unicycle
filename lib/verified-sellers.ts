import "server-only";

import { AdminAuditActionType, SellerKind, UserRole, VerifiedSellerApplicationStatus } from "@prisma/client";

import { sendVerifiedShopApprovalEmail } from "@/lib/auth-email";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { createVerifiedShopUser, findUserByNormalizedEmail } from "@/lib/auth-users";
import { normalizeEmail } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export type VerifiedSellerApplicationInput = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  instagram: string;
  website?: string | null;
  neighborhood: string;
  address: string;
  whatTheySell: string;
  description: string;
  whyJoin: string;
};

export async function submitVerifiedSellerApplication(input: VerifiedSellerApplicationInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const existing = await prisma.verifiedSellerApplication.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (existing?.status === VerifiedSellerApplicationStatus.APPROVED) {
    return {
      kind: "already_approved" as const
    };
  }

  const data = {
    businessName: input.businessName.trim(),
    contactName: input.contactName.trim(),
    email: normalizedEmail,
    phone: input.phone.trim(),
    instagram: input.instagram.trim(),
    website: input.website?.trim() || null,
    neighborhood: input.neighborhood.trim(),
    address: input.address.trim(),
    whatTheySell: input.whatTheySell.trim(),
    description: input.description.trim(),
    whyJoin: input.whyJoin.trim(),
    status: VerifiedSellerApplicationStatus.PENDING,
    reviewedAt: null,
    approvedAt: null
  };

  const application = existing
    ? await prisma.verifiedSellerApplication.update({
        where: {
          id: existing.id
        },
        data
      })
    : await prisma.verifiedSellerApplication.create({
        data
      });

  return {
    kind: existing ? ("resubmitted" as const) : ("created" as const),
    application
  };
}

export async function getVerifiedSellerApplicationsForAdmin() {
  return prisma.verifiedSellerApplication.findMany({
    include: {
      reviewedBy: {
        select: {
          id: true,
          name: true,
          username: true
        }
      },
      approvedUser: {
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          sellerKind: true,
          verifiedShopApprovedAt: true
        }
      }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
}

export async function getVerifiedSellerApplicationForUser(userId: string) {
  return prisma.verifiedSellerApplication.findFirst({
    where: {
      approvedUserId: userId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function reviewVerifiedSellerApplication(params: {
  applicationId: string;
  reviewerId: string;
  action: "approve" | "reject" | "revoke";
  internalNotes?: string;
}) {
  const application = await prisma.verifiedSellerApplication.findUnique({
    where: {
      id: params.applicationId
    }
  });

  if (!application) {
    throw new Error("Verified seller application not found.");
  }

  const reviewedAt = new Date();
  const internalNotes = params.internalNotes?.trim() || null;

  if (params.action === "reject") {
    return prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.verifiedSellerApplication.update({
        where: { id: application.id },
        data: {
          status: VerifiedSellerApplicationStatus.REJECTED,
          reviewedAt,
          approvedAt: null,
          reviewedById: params.reviewerId,
          internalNotes
        }
      });

      await tx.adminAuditLog.create({
        data: {
          actorId: params.reviewerId,
          action: AdminAuditActionType.VERIFIED_SELLER_REJECTED,
          reason: `${application.businessName} application rejected.`,
          notes: internalNotes,
          targetVerifiedSellerApplicationId: application.id
        }
      });

      return updatedApplication;
    });
  }

  if (params.action === "revoke") {
    if (application.approvedUserId) {
      const approvedUser = await prisma.user.findUnique({
        where: {
          id: application.approvedUserId
        },
        select: {
          id: true,
          role: true
        }
      });

      await prisma.user.update({
        where: {
          id: application.approvedUserId
        },
        data: {
          sellerKind: SellerKind.STUDENT,
          role: approvedUser?.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER,
          verifiedShopName: null,
          verifiedShopApprovedAt: null,
          verifiedShopNeighborhood: null,
          verifiedShopAddress: null,
          verifiedShopInstagram: null,
          verifiedShopWebsite: null
        }
      });
    }

    return prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.verifiedSellerApplication.update({
        where: { id: application.id },
        data: {
          status: VerifiedSellerApplicationStatus.REVOKED,
          reviewedAt,
          approvedAt: null,
          reviewedById: params.reviewerId,
          internalNotes
        }
      });

      await tx.adminAuditLog.create({
        data: {
          actorId: params.reviewerId,
          action: AdminAuditActionType.VERIFIED_SELLER_REVOKED,
          reason: `${application.businessName} verified seller access revoked.`,
          notes: internalNotes,
          targetUserId: application.approvedUserId ?? null,
          targetVerifiedSellerApplicationId: application.id
        }
      });

      return updatedApplication;
    });
  }

  let user = await findUserByNormalizedEmail(application.email);

  if (!user) {
    user = await createVerifiedShopUser({
      email: application.email,
      businessName: application.businessName,
      description: application.description,
      neighborhood: application.neighborhood,
      address: application.address,
      instagram: application.instagram,
      website: application.website
    });
  } else {
    user = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        name: application.businessName,
        bio: application.description,
        role: user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.VERIFIED_SHOP,
        sellerKind: SellerKind.VERIFIED_SHOP,
        verifiedShopName: application.businessName,
        verifiedShopApprovedAt: reviewedAt,
        verifiedShopNeighborhood: application.neighborhood,
        verifiedShopAddress: application.address,
        verifiedShopInstagram: application.instagram,
        verifiedShopWebsite: application.website
      }
    });
  }

  if (!user.verifiedShopApprovedAt) {
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        role: user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.VERIFIED_SHOP,
        sellerKind: SellerKind.VERIFIED_SHOP,
        verifiedShopApprovedAt: reviewedAt,
        verifiedShopName: application.businessName,
        verifiedShopNeighborhood: application.neighborhood,
        verifiedShopAddress: application.address,
        verifiedShopInstagram: application.instagram,
        verifiedShopWebsite: application.website
      }
    });
  }

  const { rawToken } = await createPasswordResetToken(user.id, user.email);
  await sendVerifiedShopApprovalEmail({
    email: user.email,
    businessName: application.businessName,
    token: rawToken
  });

  return prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.verifiedSellerApplication.update({
      where: {
        id: application.id
      },
      data: {
        status: VerifiedSellerApplicationStatus.APPROVED,
        reviewedAt,
        approvedAt: reviewedAt,
        reviewedById: params.reviewerId,
        internalNotes,
        approvedUserId: user.id
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: params.reviewerId,
        action: AdminAuditActionType.VERIFIED_SELLER_APPROVED,
        reason: `${application.businessName} approved as a Verified Shop.`,
        notes: internalNotes,
        targetUserId: user.id,
        targetVerifiedSellerApplicationId: application.id,
        metadata: {
          businessName: application.businessName,
          email: application.email
        }
      }
    });

    return updatedApplication;
  });
}
