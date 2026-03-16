import z from "zod";

export const envSchema = z.object({
  COGNITO_CLIENT_ID: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
