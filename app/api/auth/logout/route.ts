import { NextResponse } from "next/server";
import { invalidateSession } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";

export async function POST(request: Request) {
  try {
    const originCheck = verifyRequestOrigin(request);
    if (!originCheck.valid) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Invalid or untrusted request origin." },
        { status: 403 }
      );
    }

    await invalidateSession();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
