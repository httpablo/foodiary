import { Profile } from '@application/entities/Profile';
import { birthDateSchema } from '@application/shared/birthDateSchema';
import z from 'zod';

export const signUpSchema = z.object({
  account: z.object({
    email: z.string().min(1, '"email" is required').email('Invalid email'),
    password: z.string().min(8, '"password" should be at least 8 characters long'),
  }),
  profile: z.object({
    name: z.string().trim().min(1, '"name" is required').max(120),
    birthDate: birthDateSchema,
    gender: z.nativeEnum(Profile.Gender),
    goal: z.nativeEnum(Profile.Goal),
    height: z.number().finite().positive().max(300),
    weight: z.number().finite().positive().max(700),
    activityLevel: z.nativeEnum(Profile.ActivityLevel),
  }),
});

export type SignUpBody = z.infer<typeof signUpSchema>;
