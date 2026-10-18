import { Gender } from '@app/types/Gender';
import { normalizeDecimalInput, parseDecimal } from '@ui/utils/parseDecimal';
import z from 'zod';

const positiveNumber = (requiredMessage: string) => z.string()
  .trim()
  .min(1, requiredMessage)
  .overwrite(normalizeDecimalInput)
  .refine((value) => {
    const parsed = parseDecimal(value);
    return Number.isFinite(parsed) && parsed > 0;
  }, 'Informe um valor maior que zero');

export const editProfileSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  birthDate: z.date({ message: 'Informe uma data válida' })
    .refine(date => date.getFullYear() >= 1900 && date <= new Date(), 'Informe uma data válida'),
  height: positiveNumber('Informe a altura'),
  weight: positiveNumber('Informe o peso'),
  gender: z.enum(Gender),
});

export type EditProfileSchema = z.infer<typeof editProfileSchema>;
