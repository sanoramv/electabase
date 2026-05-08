import { z } from "zod";

export const correctionSubmissionSchema = z.object({
  politicianId: z.string().cuid(),
  fieldInQuestion: z.string().min(1).max(100),
  currentValue: z.string().min(1).max(2000),
  suggestedValue: z.string().min(1).max(2000),
  reason: z.string().min(10).max(5000),
  evidenceUrl: z.string().url().optional().or(z.literal("")),
  submittedByEmail: z.string().email(),
  honeypot: z.string().max(0, "Bot detected"), // must be empty
});

export const politicianCreateSchema = z.object({
  fullName: z.string().min(1).max(200),
  displayName: z.string().min(1).max(200),
  countryCode: z.string().length(2).default("IN"),
  dateOfBirth: z.string().datetime().optional(),
  placeOfBirth: z.string().max(200).optional(),
  gender: z.string().max(50).optional(),
  highestEducation: z.string().max(200).optional(),
  educationInstitution: z.string().max(200).optional(),
  currentPartyId: z.string().cuid().optional(),
  photoUrl: z.string().url().optional(),
  photoSourceUrl: z.string().url().optional(),
});

export const politicianUpdateSchema = politicianCreateSchema.partial();

export const sourceUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  isActive: z.boolean().optional(),
  scraperConfig: z
    .object({
      scope: z.object({
        house: z.string().nullable(),
        states: z.array(z.string()).nullable(),
      }),
    })
    .passthrough()
    .optional(),
});

export const adZoneUpdateSchema = z.object({
  isEnabled: z.boolean(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const politicianListQuerySchema = paginationSchema.extend({
  q: z.string().max(200).optional(),
  party: z.string().optional(),
  state: z.string().optional(),
  house: z.enum(["LOK_SABHA", "RAJYA_SABHA"]).optional(),
  gender: z.string().optional(),
  minEffectiveness: z.coerce.number().min(0).max(100).optional(),
  maxEffectiveness: z.coerce.number().min(0).max(100).optional(),
  minCorruption: z.coerce.number().min(0).max(100).optional(),
  maxCorruption: z.coerce.number().min(0).max(100).optional(),
});

export const compareQuerySchema = z.object({
  ids: z
    .string()
    .transform((v) => v.split(",").map((s) => s.trim()))
    .pipe(z.array(z.string()).min(2).max(4)),
});

export const leaderboardQuerySchema = paginationSchema.extend({
  category: z
    .enum(["effectiveness", "corruption", "attendance", "questions", "bills"])
    .default("effectiveness"),
  state: z.string().optional(),
  party: z.string().optional(),
  house: z.enum(["LOK_SABHA", "RAJYA_SABHA"]).optional(),
});
