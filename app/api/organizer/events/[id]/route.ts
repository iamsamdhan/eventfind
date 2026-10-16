import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";
import { updateEventSchema } from "@/lib/organizer/validation";
import { verifyEventOwnership, updateOrganizerEvent } from "@/lib/organizer/service";

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
    const event = await verifyEventOwnership(id, user.id, user.role);

    return NextResponse.json({ success: true, event });
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
    const validation = updateEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid update data.",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const updated = await updateOrganizerEvent(id, user.id, user.role, validation.data);

    return NextResponse.json({
      success: true,
      message: "Event updated successfully!",
      event: updated,
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
