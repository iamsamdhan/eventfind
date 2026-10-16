import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth/validation";
import { findUserByIdentifier } from "@/lib/auth/store";
import { verifyPassword } from "@/lib/auth/password";
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
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input. Please provide email/username and password.",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { identifier, password } = validation.data;
    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email/username or password." },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid email/username or password." },
        { status: 401 }
      );
    }

    await createAndSetUserSession(user.id);
    const redirectTo = getRoleDashboardUrl(user.role);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        bio: user.bio,
        college: user.college,
        organization: user.organization,
      },
      redirectTo,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
