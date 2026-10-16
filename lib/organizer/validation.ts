import { z } from "zod";

export const eventCategoryEnum = z.enum(["HACKATHON", "WORKSHOP", "FEST", "COMPETITION"]);
export const eventFormatEnum = z.enum(["ONLINE", "IN_PERSON", "HYBRID"]);

export const createEventSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title cannot exceed 120 characters")
      .trim(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens")
      .optional()
      .or(z.literal("")),
    tagline: z
      .string()
      .min(5, "Tagline must be at least 5 characters")
      .max(200, "Tagline cannot exceed 200 characters")
      .trim(),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .trim(),
    category: eventCategoryEnum,
    format: eventFormatEnum,
    location: z.string().min(2, "Location details are required").trim(),
    city: z.string().min(2, "City is required").trim(),
    venue: z.string().optional().or(z.literal("")),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid start date is required"),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid end date is required"),
    registrationDeadline: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "Valid registration deadline is required"),
    capacity: z
      .number()
      .int("Capacity must be an integer")
      .min(1, "Capacity must be at least 1")
      .max(100000, "Capacity cannot exceed 100,000"),
    isTeamEvent: z.boolean().default(false),
    minTeamSize: z
      .number()
      .int()
      .min(1, "Minimum team size must be at least 1")
      .max(50, "Maximum team size cannot exceed 50")
      .default(1),
    maxTeamSize: z
      .number()
      .int()
      .min(1, "Maximum team size must be at least 1")
      .max(50, "Maximum team size cannot exceed 50")
      .default(1),
    eligibility: z.string().max(500).optional().default("Open to all enrolled students with valid student ID."),
    tags: z.array(z.string()).optional().default([]),
    prizes: z.array(z.string()).optional().default([]),
    published: z.boolean().default(true),
    isClosed: z.boolean().default(false),
    bannerGradient: z.string().optional().default("from-blue-600 via-indigo-600 to-purple-700"),
    imageUrl: z.string().url("Image URL must be valid").optional().or(z.literal("")),
  })
  .refine(
    (data) => new Date(data.startDate).getTime() <= new Date(data.endDate).getTime(),
    {
      message: "Start date must be before or equal to end date.",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => new Date(data.registrationDeadline).getTime() <= new Date(data.startDate).getTime(),
    {
      message: "Registration deadline must be before or equal to event start date.",
      path: ["registrationDeadline"],
    }
  )
  .refine(
    (data) => {
      if (!data.isTeamEvent) return true;
      return data.minTeamSize <= data.maxTeamSize;
    },
    {
      message: "Minimum team size cannot be greater than maximum team size.",
      path: ["maxTeamSize"],
    }
  );

export const updateEventSchema = z
  .object({
    title: z.string().min(3).max(120).trim().optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens")
      .optional()
      .or(z.literal("")),
    tagline: z.string().min(5).max(200).trim().optional(),
    description: z.string().min(10).trim().optional(),
    category: eventCategoryEnum.optional(),
    format: eventFormatEnum.optional(),
    location: z.string().min(2).trim().optional(),
    city: z.string().min(2).trim().optional(),
    venue: z.string().optional().or(z.literal("")),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid start date is required").optional(),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid end date is required").optional(),
    registrationDeadline: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "Valid registration deadline is required")
      .optional(),
    capacity: z.number().int().min(1).max(100000).optional(),
    isTeamEvent: z.boolean().optional(),
    minTeamSize: z.number().int().min(1).max(50).optional(),
    maxTeamSize: z.number().int().min(1).max(50).optional(),
    eligibility: z.string().max(500).optional(),
    tags: z.array(z.string()).optional(),
    prizes: z.array(z.string()).optional(),
    published: z.boolean().optional(),
    isClosed: z.boolean().optional(),
    bannerGradient: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate).getTime() <= new Date(data.endDate).getTime();
      }
      return true;
    },
    {
      message: "Start date must be before or equal to end date.",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.registrationDeadline && data.startDate) {
        return new Date(data.registrationDeadline).getTime() <= new Date(data.startDate).getTime();
      }
      return true;
    },
    {
      message: "Registration deadline must be before or equal to event start date.",
      path: ["registrationDeadline"],
    }
  )
  .refine(
    (data) => {
      if (data.minTeamSize !== undefined && data.maxTeamSize !== undefined) {
        return data.minTeamSize <= data.maxTeamSize;
      }
      return true;
    },
    {
      message: "Minimum team size cannot be greater than maximum team size.",
      path: ["maxTeamSize"],
    }
  );

export type CreateEventSchemaInput = z.infer<typeof createEventSchema>;
export type UpdateEventSchemaInput = z.infer<typeof updateEventSchema>;
