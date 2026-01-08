import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  platform: z.enum(["web", "mobile"]),
});

export type LoginInput = z.infer<typeof loginSchema>;