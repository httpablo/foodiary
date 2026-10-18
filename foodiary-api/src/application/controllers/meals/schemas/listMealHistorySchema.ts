import z from 'zod';

const cursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().regex(/^[a-zA-Z0-9]+$/).max(128),
});

export const listMealHistorySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(512).optional().transform((value, context) => {
    if (!value) {
      return undefined;
    }
    try {
      return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    } catch {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid history cursor' });
      return z.NEVER;
    }
  }),
});
