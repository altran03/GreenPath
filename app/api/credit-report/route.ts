import { NextRequest, NextResponse } from "next/server";
import { pullTriBureauReports, type CreditReportInput } from "@/lib/crs";

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

    // Pull all 3 bureaus in parallel
    const triBureau = await pullTriBureauReports(body);

    // Use Experian as the primary (guaranteed to work with original config)
    // Include all 3 in the response
    const primary = triBureau.experian || triBureau.transunion || triBureau.equifax;

    const responsePayload = {
      ...primary,
      _triBureau: {
        experian: triBureau.experian,
        transunion: triBureau.transunion,
        equifax: triBureau.equifax,
      },
    };
    console.log("[credit-report] Response payload (summary)", {
      hasExperian: !!triBureau.experian,
      hasTransUnion: !!triBureau.transunion,
      hasEquifax: !!triBureau.equifax,
      scores: [
        triBureau.experian && (triBureau.experian as { scores?: unknown[] }).scores?.[0],
        triBureau.transunion && (triBureau.transunion as { scores?: unknown[] }).scores?.[0],
        triBureau.equifax && (triBureau.equifax as { scores?: unknown[] }).scores?.[0],
      ],
      fullResponse: responsePayload,
    });

    if (!primary) {
      return NextResponse.json(
        { error: "All three bureau pulls failed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to pull credit report";
    console.error("[credit-report]", message);
    const status = message.includes("401") ? 401 : message.includes("400") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
