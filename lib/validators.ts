import { Category, Condition } from "@prisma/client";
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

export const profileSchema = z.object({
  bio: z.string().max(240).optional(),
  gradYear: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(2024).max(2035).optional()),
  favoritePickup: z.string().max(80).optional(),
  instagram: z
    .string()
    .optional()
    .refine((v) => !v || /^@?[a-zA-Z0-9_.]{1,30}$/.test(v), "Use a valid Instagram handle")
});

export const messageSchema = z.object({
  conversationId: z.string(),
  body: z.string().min(1).max(1000)
});

export const checkoutSessionSchema = z.object({
  listingId: z.string().min(1)
});
