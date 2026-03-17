import { z, ZodError } from "zod";

const schema = z.object({
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_CLIENT_SECRET: z.string().min(1),
  MAIN_TABLE_NAME: z.string().min(1),
});

function getEnv() {
  try {
    return schema.parse(process.env);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("Invalid environment variables", { cause: error });
    }
    throw error;
  }
}

export const env = getEnv();
