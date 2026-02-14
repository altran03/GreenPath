import { NextRequest, NextResponse } from "next/server";
import { pullCreditReport, type CreditReportInput } from "@/lib/crs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreditReportInput;

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.ssn || !body.addressLine1 || !body.city || !body.state || !body.postalCode) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, ssn, addressLine1, city, state, postalCode" },
        { status: 400 }
      );
    }

    const report = await pullCreditReport(body);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to pull credit report";
    const status = message.includes("401") ? 401 : message.includes("400") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
