import { NextResponse } from "next/server";
import { authenticateCRS } from "@/lib/crs";

export async function POST() {
  try {
    const token = await authenticateCRS();
    return NextResponse.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
