import { Gender } from '@app/types/Gender';
import z from 'zod';

const positiveNumber = (requiredMessage: string) => z.string().min(1, requiredMessage)
  .refine(value => Number.isFinite(Number(value)) && Number(value) > 0, 'Informe um valor maior que zero');

export const editProfileSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  birthDate: z.date({
    message: 'Informe a data de nascimento',
  }),
  height: positiveNumber('Informe a altura'),
  weight: positiveNumber('Informe o peso'),
  gender: z.enum(Gender),
});

export type EditProfileSchema = z.infer<typeof editProfileSchema>;
