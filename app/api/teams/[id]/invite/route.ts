import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";
import { inviteMemberSchema } from "@/lib/teams/validation";
import { getTeamByIdOrSlug, inviteUserByUsername } from "@/lib/teams/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params;
    const team = await getTeamByIdOrSlug(id);
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = inviteMemberSchema.safeParse({
      teamId: team.id,
      username: body.username,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid invitation payload.",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const invitation = await inviteUserByUsername(
      team.id,
      user.id,
      validation.data.username
    );

    return NextResponse.json(
      {
        success: true,
        invitation,
        message: `Invitation sent to @${invitation.invitee.username}.`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let status = 400;
    if (message.includes("Forbidden") || message.includes("authorized")) {
      status = 403;
    } else if (message.includes("not found")) {
      status = 404;
    } else if (message.includes("already been sent")) {
      status = 409;
    }
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

