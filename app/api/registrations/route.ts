import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserRegistrations } from "@/lib/registrations/service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId") || undefined;

    const registrations = await getUserRegistrations(user.id, eventId);
    return NextResponse.json({ success: true, registrations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
