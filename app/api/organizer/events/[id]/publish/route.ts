import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";
import { togglePublishEvent } from "@/lib/organizer/service";

export async function PATCH(
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
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden: Organizer role required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (typeof body.published !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Field 'published' must be a boolean." },
        { status: 400 }
      );
    }

    const result = await togglePublishEvent(id, user.id, user.role, body.published);

    return NextResponse.json({
      message: body.published ? "Event published successfully!" : "Event unpublished to draft mode.",
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let status = 400;
    if (message.includes("Forbidden") || message.includes("permission")) {
      status = 403;
    } else if (message.includes("not found")) {
      status = 404;
    }
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
