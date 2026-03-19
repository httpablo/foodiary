import { z } from "zod";

const schema = z.object({
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_CLIENT_SECRET: z.string().min(1),
  MAIN_TABLE_NAME: z.string().min(1),
});

function getEnv() {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    throw new Error("Invalid environment variables", { cause: result.error });
  }

  return result.data;
}

export const env = getEnv();
