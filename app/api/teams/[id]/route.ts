import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";
import { getTeamByIdOrSlug, removeTeamMember, getTeamSentInvitations } from "@/lib/teams/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // If requester is a member of this team, also fetch pending sent invitations
    let sentInvitations = undefined;
    const isMember = team.members.some((m) => m.userId === user.id);
    if (isMember) {
      sentInvitations = await getTeamSentInvitations(team.id, user.id);
    }

    return NextResponse.json({
      success: true,
      team,
      sentInvitations,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    // Determine target member: either from query param `userId` or JSON body `userId`, defaulting to requester
    const url = new URL(request.url);
    let targetUserId = url.searchParams.get("userId");
    if (!targetUserId) {
      const body = await request.json().catch(() => ({}));
      targetUserId = body?.userId || user.id;
    }

    await removeTeamMember(team.id, targetUserId!, user.id);

    const isSelf = targetUserId === user.id;
    return NextResponse.json({
      success: true,
      message: isSelf ? "You have left the team." : "Member removed from team.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Forbidden") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

