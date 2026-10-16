import { NextResponse } from "next/server";
import { profileUpdateSchema } from "@/lib/auth/validation";
import { getCurrentUser } from "@/lib/auth/session";
import { findUserByUsername, updateUserProfile } from "@/lib/auth/store";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Prevent privilege escalation: if role is provided, return 400 or ignore
    if ("role" in body && body.role !== currentUser.role) {
      return NextResponse.json(
        { success: false, error: "Forbidden: User role cannot be modified." },
        { status: 403 }
      );
    }

    const validation = profileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid profile data.",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Check username uniqueness if changed
    if (updates.username && updates.username !== currentUser.username) {
      const existing = await findUserByUsername(updates.username);
      if (existing && existing.id !== currentUser.id) {
        return NextResponse.json(
          { success: false, error: "This username is already taken. Please choose another." },
          { status: 409 }
        );
      }
    }

    const updatedUser = await updateUserProfile(currentUser.id, updates);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Failed to update profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

