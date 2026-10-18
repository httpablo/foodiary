import { normalizeDecimalInput, parseDecimal } from '@ui/utils/parseDecimal';
import z from 'zod';

const nonnegativeNumber = (requiredMessage: string) => z.string()
  .trim()
  .min(1, requiredMessage)
  .overwrite(normalizeDecimalInput)
  .refine((value) => {
    const parsed = parseDecimal(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }, 'Informe um número não negativo');

export const editGoalsSchema = z.object({
  calories: nonnegativeNumber('Informe as calorias'),
  carbohydrates: nonnegativeNumber('Informe os carboidratos'),
  proteins: nonnegativeNumber('Informe as proteínas'),
  fats: nonnegativeNumber('Informe as gorduras'),
});

export type EditGoalsSchema = z.infer<typeof editGoalsSchema>;
