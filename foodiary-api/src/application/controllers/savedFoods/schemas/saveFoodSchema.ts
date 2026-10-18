import { foodInputSchema } from '@application/shared/foodSchema';
import { z } from 'zod';

export const saveFoodSchema = foodInputSchema;

export type SaveFoodBody = z.infer<typeof saveFoodSchema>;
