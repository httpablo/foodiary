import z from "zod";

export const signUpSchema = z.object({
  account: z.object({
    email: z.string().email("Invalid email").min(1, "Email is required"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  }),
});

export type SignUpBody = z.infer<typeof signUpSchema>;
