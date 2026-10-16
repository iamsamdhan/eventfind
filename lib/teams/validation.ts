import { z } from "zod";

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(60, "Team name cannot exceed 60 characters")
    .trim(),
  description: z
    .string()
    .max(300, "Description cannot exceed 300 characters")
    .optional()
    .or(z.literal("")),
  eventId: z
    .string()
    .optional()
    .or(z.literal("")),
});

export type CreateTeamSchemaInput = z.infer<typeof createTeamSchema>;

export const inviteMemberSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
    .trim()
    .toLowerCase(),
});

export type InviteMemberSchemaInput = z.infer<typeof inviteMemberSchema>;

export const respondInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
  action: z.enum(["ACCEPT", "DECLINE"]),
});

export type RespondInvitationSchemaInput = z.infer<typeof respondInvitationSchema>;
