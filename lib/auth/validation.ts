import { z } from "zod";

/**
 * Shared Login Schema
 * Strictly accepts email or username + password. No role selection!
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Please enter your email or username")
    .trim(),
  password: z
    .string()
    .min(1, "Please enter your password"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Public Signup Schema
 * Permits only STUDENT and ORGANIZER roles.
 * Disallows ADMIN registration.
 */
export const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username may only contain letters, numbers, and underscores"
    )
    .trim()
    .toLowerCase(),
  email: z
    .string()
    .email("Please provide a valid email address")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["STUDENT", "ORGANIZER"], {
    message: "Please select whether you are a Student or an Organizer",
  }),
  college: z.string().max(100).optional().or(z.literal("")),
  organization: z.string().max(100).optional().or(z.literal("")),
});

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Profile Update Schema
 * Strictly forbids role escalation (role field cannot be altered here).
 */
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .trim()
    .optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username may only contain letters, numbers, and underscores"
    )
    .trim()
    .toLowerCase()
    .optional(),
  bio: z
    .string()
    .max(500, "Bio cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
  college: z
    .string()
    .max(100, "College/University cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  organization: z
    .string()
    .max(100, "Organization cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
