import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";
import { createEventSchema } from "@/lib/organizer/validation";
import { getOrganizerDashboardData, createOrganizerEvent } from "@/lib/organizer/service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Organizer account required." },
        { status: 403 }
      );
    }

    const data = await getOrganizerDashboardData(user.id, user.role);
    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
      return NextResponse.json(
        { success: false, error: "Forbidden: Organizer account required to create events." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = createEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid event data.",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const event = await createOrganizerEvent(user, validation.data);

    return NextResponse.json(
      {
        success: true,
        message: "Event created successfully!",
        event,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let status = 400;
    if (message.includes("Forbidden") || message.includes("permission")) {
      status = 403;
    }
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
