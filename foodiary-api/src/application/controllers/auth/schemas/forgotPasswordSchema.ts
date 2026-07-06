import z from "zod";

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email({ message: "Invalid email" })
    .min(1, { message: "email is required" }),
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
