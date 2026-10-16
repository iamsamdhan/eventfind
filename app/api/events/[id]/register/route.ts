import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";
import { registerEventSchema } from "@/lib/registrations/validation";
import { registerForEvent } from "@/lib/registrations/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: "Authentication required to register for events." },
        { status: 401 }
      );
    }

    // Role check: Only students can register as attendees
    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only students are eligible to register as event attendees." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const validation = registerEventSchema.safeParse({
      ...body,
      eventId: id,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid registration data.",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const registration = await registerForEvent(user.id, {
      eventId: id,
      type: validation.data.type,
      teamId: validation.data.teamId || undefined,
      notes: validation.data.notes || undefined,
    });

    const isWaitlisted = registration.status === "WAITLISTED";
    const message = isWaitlisted
      ? "Event is currently at maximum capacity. You have been placed on the priority waitlist."
      : "Registration confirmed successfully!";

    return NextResponse.json(
      {
        success: true,
        registration,
        message,
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
    } else if (message.includes("already")) {
      status = 409;
    }
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
