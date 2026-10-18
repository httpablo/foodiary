import { ActivityLevel } from '@app/types/ActivityLevel';
import { Gender } from '@app/types/Gender';
import { Goal } from '@app/types/Goal';
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

export const onboardingSchema = z.object({
  goal: z.enum(Goal),
  gender: z.enum(Gender),
  birthDate: z.date({ message: 'Informe uma data válida' })
    .refine(date => date.getFullYear() >= 1900 && date <= new Date(), 'Informe uma data válida'),
  height: positiveNumber('Informe a sua altura'),
  weight: positiveNumber('Informe o seu peso'),
  activityLevel: z.enum(ActivityLevel),
  account: z.object({
    name: z.string().min(1, 'Informe o seu nome'),
    email: z.email('Informe um e-mail válido'),
    password: z.string().min(8, 'Pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a sua senha'),
  }).refine(
    ({ password, confirmPassword }) => password === confirmPassword,
    {
      error: 'As senhas não coincidem',
      path: ['confirmPassword'],
    },
  ),
});

export type OnboardingSchema = z.infer<typeof onboardingSchema>;
