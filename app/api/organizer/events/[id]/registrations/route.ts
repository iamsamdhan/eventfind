import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizerEventRegistrations } from "@/lib/organizer/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden: Organizer role required." }, { status: 403 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const query = url.searchParams.get("query") || undefined;

    const data = await getOrganizerEventRegistrations(id, user.id, user.role, {
      status,
      type,
      query,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let httpStatus = 500;
    if (message.includes("Forbidden") || message.includes("permission")) {
      httpStatus = 403;
    } else if (message.includes("not found")) {
      httpStatus = 404;
    }
    return NextResponse.json({ success: false, error: message }, { status: httpStatus });
  }
}
