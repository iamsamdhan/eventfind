import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { exportOrganizerRegistrationsCsv } from "@/lib/organizer/service";

export async function GET(
  _request: Request,
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
    const { filename, csv } = await exportOrganizerRegistrationsCsv(id, user.id, user.role);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let status = 500;
    if (message.includes("Forbidden") || message.includes("permission")) {
      status = 403;
    } else if (message.includes("not found")) {
      status = 404;
    }
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
