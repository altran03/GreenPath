import { NextRequest, NextResponse } from "next/server";
import { verifyIdentityFlexID, type FlexIDInput } from "@/lib/crs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FlexIDInput;

    if (!body.firstName || !body.lastName || !body.ssn) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, ssn" },
        { status: 400 }
      );
    }

    const result = await verifyIdentityFlexID(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FlexID verification failed";
    console.error("[flex-id]", message);

    // If the upstream vendor sandbox doesn't recognize this identity, treat as "not registered"
    const isNotRegistered =
      message.includes("Service Error") ||
      message.includes("CRS779") ||
      message.includes("No record found") ||
      message.includes("404") ||
      message.includes("422");

    if (isNotRegistered) {
      return NextResponse.json({
        verified: false,
        notRegistered: true,
        summary: "Not registered with LexisNexis FlexID",
        raw: {},
      });
    }

    return NextResponse.json({ error: message, verified: false, summary: "Identity verification unavailable" }, { status: 500 });
  }
}
