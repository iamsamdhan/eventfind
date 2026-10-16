import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserReceivedInvitations } from "@/lib/teams/service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const invitations = await getUserReceivedInvitations(user.id);
    return NextResponse.json({ success: true, invitations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

