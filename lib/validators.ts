import { Category, Condition, ListingStatus } from "@prisma/client";
import { z } from "zod";

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
  bio: z.string().max(240).optional(),
  gradYear: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(2024).max(2035).optional()),
  favoritePickup: z.string().max(80).optional(),
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

export const connectProductSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(600).optional(),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().url().safeParse(value).success, "Use a valid image URL"),
  priceInCents: z.number().int().min(100).max(500000),
  currency: z.string().trim().toLowerCase().default("usd")
});

export const connectCheckoutSchema = z.object({
  productId: z.string().min(1)
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
