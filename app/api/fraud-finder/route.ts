import { NextRequest, NextResponse } from "next/server";
import { runFraudFinder, type FraudFinderInput } from "@/lib/crs";
import { isDemoPersona, getDemoFraudResult } from "@/lib/demo-persona";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FraudFinderInput;

    if (!body.firstName || !body.lastName || !body.addressLine1) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, addressLine1" },
        { status: 400 }
      );
    }

    if (isDemoPersona(body)) {
      return NextResponse.json(getDemoFraudResult());
    }

    const result = await runFraudFinder(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fraud Finder failed";
    console.error("[fraud-finder]", message);
    return NextResponse.json({
      error: message,
      riskLevel: "unknown",
      signals: [],
      summary: "Fraud check unavailable",
    }, { status: 500 });
  }
}
