import z from 'zod';

const nonnegativeNumber = (requiredMessage: string) => z.string().min(1, requiredMessage)
  .refine(value => Number.isFinite(Number(value)) && Number(value) >= 0, 'Informe um número não negativo');

export const editGoalsSchema = z.object({
  calories: nonnegativeNumber('Informe as calorias'),
  carbohydrates: nonnegativeNumber('Informe os carboidratos'),
  proteins: nonnegativeNumber('Informe as proteínas'),
  fats: nonnegativeNumber('Informe as gorduras'),
});

export type EditGoalsSchema = z.infer<typeof editGoalsSchema>;
