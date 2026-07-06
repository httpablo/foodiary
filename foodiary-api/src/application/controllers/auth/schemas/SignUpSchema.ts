import z from "zod";

export const signUpSchema = z.object({
  account: z.object({
    email: z
      .string()
      .email({ message: "Invalid email" })
      .min(1, { message: "email is required" }),
    password: z
      .string()
      .min(8, { message: "password must be at least 8 characters long" }),
  }),
});

export type SignUpBody = z.infer<typeof signUpSchema>;
