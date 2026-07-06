import z from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .email({ message: "Invalid email" })
    .min(1, { message: "email is required" }),
  password: z
    .string()
    .min(8, { message: "password must be at least 8 characters long" }),
});

export type SignInBody = z.infer<typeof signInSchema>;
