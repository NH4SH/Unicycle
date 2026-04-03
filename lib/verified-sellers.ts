import "server-only";

import { AdminAuditActionType, SellerKind, UserRole, VerifiedSellerApplicationStatus } from "@prisma/client";

import { sendVerifiedShopApprovalEmail } from "@/lib/auth-email";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { findUserByNormalizedEmail, reserveUsername } from "@/lib/auth-users";
import { normalizeEmail } from "@/lib/domain";
import { notifyAccountAlert, notifyVerifiedSellerDecision } from "@/lib/notifications";
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
    const updatedApplication = await prisma.$transaction(async (tx) => {
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

    const existingUser = await findUserByNormalizedEmail(application.email);
    if (existingUser) {
      try {
        await notifyVerifiedSellerDecision({
          userId: existingUser.id,
          applicationId: application.id,
          businessName: application.businessName,
          status: "REJECTED"
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[verified-sellers] reject notification failed", error);
        }
      }
    }

    return updatedApplication;
  }

  if (params.action === "revoke") {
    const updatedApplication = await prisma.$transaction(async (tx) => {
      if (application.approvedUserId) {
        const approvedUser = await tx.user.findUnique({
          where: {
            id: application.approvedUserId
          },
          select: {
            id: true,
            role: true
          }
        });

        await tx.user.update({
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

    if (application.approvedUserId) {
      try {
        await notifyAccountAlert({
          userId: application.approvedUserId,
          title: `${application.businessName} is no longer approved as a Verified Shop.`,
          body: "Your verified seller access has been removed. Reach out to HoosFinds if you need help restoring access.",
          href: "/verified-seller",
          externalKey: `verified-seller:${application.id}:revoked`
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[verified-sellers] revoke notification failed", error);
        }
      }
    }

    return updatedApplication;
  }

  const existingUser = await findUserByNormalizedEmail(application.email);
  const reservedUsername = existingUser
    ? existingUser.username
    : await reserveUsername({
        displayName: application.businessName,
        fallbackPrefix: "shop"
      });

  const { user } = await prisma.$transaction(async (tx) => {
    const approvedUser = existingUser
      ? await tx.user.update({
          where: {
            id: existingUser.id
          },
          data: {
            name: application.businessName,
            bio: application.description,
            role: existingUser.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.VERIFIED_SHOP,
            sellerKind: SellerKind.VERIFIED_SHOP,
            verifiedShopName: application.businessName,
            verifiedShopApprovedAt: reviewedAt,
            verifiedShopNeighborhood: application.neighborhood,
            verifiedShopAddress: application.address,
            verifiedShopInstagram: application.instagram,
            verifiedShopWebsite: application.website
          }
        })
      : await tx.user.create({
          data: {
            email: application.email,
            name: application.businessName,
            username: reservedUsername,
            usernameConfirmed: true,
            bio: application.description,
            role: UserRole.VERIFIED_SHOP,
            sellerKind: SellerKind.VERIFIED_SHOP,
            verifiedShopName: application.businessName,
            verifiedShopApprovedAt: reviewedAt,
            verifiedShopNeighborhood: application.neighborhood,
            verifiedShopAddress: application.address,
            verifiedShopInstagram: application.instagram,
            verifiedShopWebsite: application.website
          }
        });

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
        approvedUserId: approvedUser.id
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: params.reviewerId,
        action: AdminAuditActionType.VERIFIED_SELLER_APPROVED,
        reason: `${application.businessName} approved as a Verified Shop.`,
        notes: internalNotes,
        targetUserId: approvedUser.id,
        targetVerifiedSellerApplicationId: application.id,
        metadata: {
          businessName: application.businessName,
          email: application.email
        }
      }
    });

    return {
      updatedApplication,
      user: approvedUser
    };
  });

  const { rawToken } = await createPasswordResetToken(user.id, user.email);
  await sendVerifiedShopApprovalEmail({
    email: user.email,
    businessName: application.businessName,
    token: rawToken
  });

  try {
    await notifyVerifiedSellerDecision({
      userId: user.id,
      applicationId: application.id,
      businessName: application.businessName,
      status: "APPROVED"
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[verified-sellers] approval notification failed", error);
    }
  }

  return prisma.verifiedSellerApplication.findUniqueOrThrow({
    where: {
      id: application.id
    }
  });
}
