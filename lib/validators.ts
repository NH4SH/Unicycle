import { Category, Condition, ListingStatus } from "@prisma/client";
import { z } from "zod";
import { isValidUsername, normalizeUsername } from "@/lib/user-identity";

export const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  reason: z.string().min(5).max(240)
});

export const listingSchema = z.object({
  title: z.string().min(4).max(90),
  description: z.string().min(12).max(1500),
  priceCents: z.number().int().min(100).max(250000),
  category: z.nativeEnum(Category),
  condition: z.nativeEnum(Condition),
  images: z.array(z.string().url()).min(1).max(6),
  pickupLocations: z.array(z.string()).min(1).max(8),
  meetupNotes: z.string().max(180).optional()
});

export const listingUpdateSchema = listingSchema
  .partial()
  .extend({
    status: z
      .nativeEnum(ListingStatus)
      .optional()
      .refine((value) => value === undefined || value === ListingStatus.ACTIVE || value === ListingStatus.CANCELLED, {
        message: "Only live or paused availability can be edited directly."
      })
  });

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80, "Keep your display name under 80 characters.")
    .optional()
    .transform((value) => value || undefined),
  username: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? normalizeUsername(value) : undefined))
    .refine((value) => !value || isValidUsername(value), "Use 3-24 lowercase letters, numbers, hyphens, or underscores."),
  bio: z.string().max(240).optional(),
  gradYear: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(2024).max(2035).optional()),
  favoritePickup: z.string().max(80).optional(),
  verifiedShopLocation: z.string().max(120).optional(),
  verifiedShopInstagram: z.string().max(120).optional(),
  verifiedShopWebsite: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().url().safeParse(value).success, "Use a valid website URL"),
  profileImageUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().url().safeParse(value).success, "Use a valid image URL")
});

export const messageSchema = z.object({
  conversationId: z.string(),
  body: z.string().min(1).max(1000)
});

export const checkoutSessionSchema = z.object({
  listingId: z.string().min(1)
});

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Add the name you want buyers and sellers to see.")
      .max(80, "Keep your display name under 80 characters."),
    username: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? normalizeUsername(value) : undefined))
      .refine((value) => !value || isValidUsername(value), "Use 3-24 lowercase letters, numbers, hyphens, or underscores."),
    email: z.string().email("Enter a valid UVA email."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export const credentialsSignInSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password.")
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Enter a valid email.")
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email.")
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Enter a valid email."),
    token: z.string().min(1, "Reset token is missing."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export const createTransactionSchema = z.object({
  conversationId: z.string().min(1),
  agreedPriceCents: z.number().int().min(100).max(250000).optional()
});

export const confirmTransactionSchema = z
  .object({
    stars: z.number().int().min(1).max(5).optional(),
    comment: z
      .string()
      .trim()
      .max(280, "Keep feedback under 280 characters.")
      .optional()
      .transform((value) => value || undefined)
  })
  .superRefine((value, ctx) => {
    if (value.comment && !value.stars) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a star rating if you want to leave written feedback.",
        path: ["stars"]
      });
    }
  });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12)
});

export const followListQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(24).default(12)
});

export const followSuggestionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(6)
});

export const followingFeedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(1).max(16).default(8)
});

export const verifiedSellerApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  contactName: z.string().trim().min(2).max(80),
  email: z.string().email("Enter a valid contact email."),
  phone: z.string().trim().min(7).max(32),
  instagram: z.string().trim().min(2).max(120),
  website: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().url().safeParse(value).success, "Use a valid website URL"),
  location: z.string().trim().min(2).max(120),
  whatTheySell: z.string().trim().min(10).max(160),
  description: z.string().trim().min(20).max(280),
  whyJoin: z.string().trim().min(20).max(500)
});

export const verifiedSellerReviewSchema = z.object({
  action: z.enum(["approve", "reject", "revoke"]),
  internalNotes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || undefined)
});
