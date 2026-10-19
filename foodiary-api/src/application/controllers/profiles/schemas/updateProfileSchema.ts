import { Profile } from '@application/entities/Profile';
import { birthDateSchema } from '@application/shared/birthDateSchema';
import z from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, '"name" is required').max(120),
  birthDate: birthDateSchema,
  gender: z.nativeEnum(Profile.Gender),
  height: z.number().finite().positive().max(300),
  weight: z.number().finite().positive().max(700),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
