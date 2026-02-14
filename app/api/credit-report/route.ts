import { NextRequest, NextResponse } from "next/server";
import { pullTriBureauReports, type CreditReportInput } from "@/lib/crs";
import { isDemoPersona, getDemoCreditReportResponse } from "@/lib/demo-persona";

function bureauReportSummary(report: Record<string, unknown> | null, bureau: string): Record<string, unknown> | null {
  if (!report) return null;
  const scores = report.scores as Array<Record<string, unknown>> | undefined;
  const scoreVal = scores?.[0] ? Number(scores[0].scoreValue ?? scores[0].value ?? null) : null;
  const tradelines = (report.tradelines ?? (report.creditFiles as Array<Record<string, unknown>>)?.[0]?.tradelines) as Array<unknown> | undefined;
  const requestData = report.requestData as Record<string, unknown> | undefined;
  return {
    bureau,
    score: scoreVal != null && !Number.isNaN(scoreVal) ? scoreVal : null,
    tradelineCount: Array.isArray(tradelines) ? tradelines.length : 0,
    requestEcho: requestData
      ? {
          firstName: requestData.firstName,
          lastName: requestData.lastName,
          ssn: requestData.ssn ? "••••" + String(requestData.ssn).slice(-4) : undefined,
        }
      : undefined,
  };
}

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

    if (isDemoPersona(body)) {
      return NextResponse.json(getDemoCreditReportResponse());
    }

    // Pull all 3 bureaus in parallel
    console.log("[credit-report] Pulling tri-bureau (Experian, TransUnion, Equifax)");
    const triBureau = await pullTriBureauReports(body);
    console.log("[credit-report] Tri-bureau done:", {
      experian: !!triBureau.experian,
      transunion: !!triBureau.transunion,
      equifax: !!triBureau.equifax,
    });

    // Log what each bureau reported (score, tradeline count, request echo) for debugging
    const summaries = [
      bureauReportSummary(triBureau.experian ?? null, "experian"),
      bureauReportSummary(triBureau.transunion ?? null, "transunion"),
      bureauReportSummary(triBureau.equifax ?? null, "equifax"),
    ].filter(Boolean);
    console.log("[credit-report] Bureau report summary:", JSON.stringify(summaries, null, 2));
    if (process.env.NODE_ENV === "development" && triBureau.experian) {
      console.log("[credit-report] Experian raw (dev):", JSON.stringify(triBureau.experian, null, 2));
    }

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
