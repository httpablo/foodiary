import z from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .email({ message: "Invalid email" })
    .min(1, { message: "Email is required" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

export type SignInBody = z.infer<typeof signInSchema>;
