import { z } from "zod";

export const registerEventSchema = z.object({
  eventId: z.string().min(1, "Event ID or slug is required"),
  type: z.enum(["INDIVIDUAL", "TEAM"]),
  teamId: z.string().optional().or(z.literal("")),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().or(z.literal("")),
});

export type RegisterEventSchemaInput = z.infer<typeof registerEventSchema>;
