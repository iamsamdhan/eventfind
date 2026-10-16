import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";
import { createTeamSchema } from "@/lib/teams/validation";
import { createTeam, getUserTeams } from "@/lib/teams/service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const teams = await getUserTeams(user.id);
    return NextResponse.json({ success: true, teams });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = createTeamSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid team data.",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const team = await createTeam(user.id, validation.data);
    return NextResponse.json(
      {
        success: true,
        team,
        message: `Team "${team.name}" created successfully.`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : message.includes("not support") ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

