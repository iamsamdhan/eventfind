import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/auth/validation";
import { findUserByEmail, findUserByUsername, createUser } from "@/lib/auth/store";
import { hashPassword } from "@/lib/auth/password";
import { createAndSetUserSession, getRoleDashboardUrl } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";

export async function POST(request: Request) {
  try {
    // CSRF & Origin Verification
    const originCheck = verifyRequestOrigin(request);
    if (!originCheck.valid) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Invalid or untrusted request origin." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Validation failed.",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, username, email, password, role, college, organization } = validation.data;

    // Check duplicate email
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // Check duplicate username
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: "This username is already taken. Please choose another." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const newUser = await createUser({
      name,
      username,
      email,
      passwordHash,
      role,
      college,
      organization,
    });

    await createAndSetUserSession(newUser.id);
    const redirectTo = getRoleDashboardUrl(newUser.role);

    return NextResponse.json(
      {
        success: true,
        user: newUser,
        redirectTo,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
