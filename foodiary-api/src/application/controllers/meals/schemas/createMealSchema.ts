import { mbToBytes } from '@shared/utils/mbToBytes';
import z from 'zod';

export const mealMediaMimeTypes = [
  'audio/m4a',
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type MealMediaMimeType = (typeof mealMediaMimeTypes)[number];

export const createMealSchema = z.object({
  file: z.object({
    type: z.preprocess(
      val => (typeof val === 'string' ? val.split(';')[0].trim().toLowerCase() : val),
      z.enum(mealMediaMimeTypes),
    ),
    size: z.number()
      .min(1, 'The file should have at least 1 byte.')
      .max(mbToBytes(10), 'The file shoud have up to 10MB.'),
  }),
  date: z.string().date().optional(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
});

export type CreateMealBody = z.infer<typeof createMealSchema>;
