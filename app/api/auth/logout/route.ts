import { NextResponse } from "next/server";
import { invalidateSession } from "@/lib/auth/session";

export async function POST() {
  try {
    await invalidateSession();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

