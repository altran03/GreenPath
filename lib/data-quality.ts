/**
 * Data quality checks for CRS API responses (credit, FlexID, Fraud Finder).
 * Produces a report and 0–100 score for a given set of payloads.
 */

export interface DataQualityFinding {
  source: "Credit" | "FlexID" | "Fraud Finder";
  bureau?: "experian" | "transunion" | "equifax";
  severity: "error" | "warning" | "info";
  message: string;
  field?: string;
}

export interface DataQualityReport {
  score: number;
  findings: DataQualityFinding[];
  summary: string;
}

const MAX_DEDUCT_ERROR = 15;
const MAX_DEDUCT_WARNING = 5;
const MAX_DEDUCT_INFO = 2;

function getNum(obj: Record<string, unknown> | undefined, ...keys: string[]): number {
  if (!obj) return 0;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) {
      const n = parseFloat(String(v));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function getTradeSummary(report: Record<string, unknown>): Record<string, unknown> | null {
  const getFromSummaries = (s: Record<string, unknown> | undefined) =>
    (s?.tradeSummary ?? s?.TradeSummary) as Record<string, unknown> | undefined;
  let summaries = report.summaries as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  if (Array.isArray(summaries) && summaries.length > 0) summaries = summaries[0] as Record<string, unknown>;
  let tradeSummary = summaries && typeof summaries === "object" ? getFromSummaries(summaries as Record<string, unknown>) : undefined;
  if (tradeSummary) return tradeSummary;
  const creditFiles = report.creditFiles as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(creditFiles) && creditFiles[0]) {
    let cfSummaries = creditFiles[0].summaries as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
    if (Array.isArray(cfSummaries) && cfSummaries.length > 0) cfSummaries = cfSummaries[0] as Record<string, unknown>;
    tradeSummary = cfSummaries && typeof cfSummaries === "object" ? getFromSummaries(cfSummaries as Record<string, unknown>) : undefined;
  }
  return tradeSummary ?? null;
}

function getTradelines(report: Record<string, unknown>): Array<Record<string, unknown>> {
  const top = report.tradelines as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(top) && top.length > 0) return top;
  const creditFiles = report.creditFiles as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(creditFiles) && creditFiles[0]) {
    const fromFile = (creditFiles[0].tradelines ?? creditFiles[0].trades) as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(fromFile)) return fromFile;
  }
  return [];
}

function checkCreditReport(
  report: Record<string, unknown> | null,
  bureau: "experian" | "transunion" | "equifax"
): DataQualityFinding[] {
  const findings: DataQualityFinding[] = [];
  if (!report) {
    findings.push({ source: "Credit", bureau, severity: "info", message: "No report returned." });
    return findings;
  }

  const scores = report.scores as Array<Record<string, unknown>> | undefined;
  if (!scores || scores.length === 0) {
    findings.push({ source: "Credit", bureau, severity: "error", field: "scores", message: "Missing or empty scores array." });
  } else {
    const raw = scores[0].scoreValue ?? scores[0].value;
    const scoreVal = raw !== undefined && raw !== null ? parseInt(String(raw), 10) : NaN;
    if (Number.isNaN(scoreVal) || scoreVal < 0 || scoreVal > 850) {
      findings.push({ source: "Credit", bureau, severity: "warning", field: "scores", message: "Score value missing or out of expected range (0–850)." });
    }
  }

  const tradeSummary = getTradeSummary(report);
  if (!tradeSummary) {
    findings.push({ source: "Credit", bureau, severity: "warning", field: "tradeSummary", message: "Missing trade summary." });
  } else {
    const utilRaw = tradeSummary.revolvingCreditUtilization ?? tradeSummary.RevolvingCreditUtilization ?? tradeSummary.revolving_credit_utilization;
    if (utilRaw !== undefined && utilRaw !== null) {
      const s = String(utilRaw).trim();
      if (!s.startsWith(">")) {
        const n = parseFloat(s);
        if (!Number.isNaN(n) && (n < 0 || n > 100)) {
          findings.push({ source: "Credit", bureau, severity: "warning", field: "revolvingCreditUtilization", message: "Utilization outside 0–100." });
        }
      }
    }
    const balanceTotal = getNum(tradeSummary, "balanceTotal", "BalanceTotal", "balance_total");
    if (balanceTotal < 0) {
      findings.push({ source: "Credit", bureau, severity: "error", field: "balanceTotal", message: "Negative total balance." });
    }
  }

  const tradelines = getTradelines(report);
  for (let i = 0; i < tradelines.length; i++) {
    const tl = tradelines[i];
    const bal = getNum(tl, "currentBalanceAmount", "currentBalance", "balanceAmount", "balance", "CurrentBalanceAmount", "BalanceAmount");
    if (bal < 0) {
      findings.push({ source: "Credit", bureau, severity: "warning", field: "tradeline", message: `Tradeline ${i + 1} has negative balance.` });
    }
    const dateOpened = tl.dateOpened ?? tl.dateofFirstAccountActivity ?? tl.openDate;
    if (dateOpened !== undefined && dateOpened !== null && String(dateOpened).trim() !== "") {
      const d = new Date(String(dateOpened));
      if (Number.isNaN(d.getTime())) {
        findings.push({ source: "Credit", bureau, severity: "info", field: "dateOpened", message: `Tradeline ${i + 1}: dateOpened not parseable.` });
      }
    }
  }

  return findings;
}

function checkFlexID(raw: Record<string, unknown> | null | undefined): DataQualityFinding[] {
  const findings: DataQualityFinding[] = [];
  if (!raw || typeof raw !== "object") {
    findings.push({ source: "FlexID", severity: "info", message: "No FlexID response." });
    return findings;
  }
  const result = (raw.result || raw) as Record<string, unknown>;
  const compVer = result.comprehensiveVerification as Record<string, unknown> | undefined;
  if (compVer && compVer.comprehensiveVerificationIndex !== undefined) {
    const cvi = parseInt(String(compVer.comprehensiveVerificationIndex), 10);
    if (!Number.isNaN(cvi) && (cvi < 0 || cvi > 50)) {
      findings.push({ source: "FlexID", severity: "warning", field: "comprehensiveVerificationIndex", message: "CVI outside expected range (0–50)." });
    }
  }
  return findings;
}

function checkFraudFinder(raw: Record<string, unknown> | null | undefined): DataQualityFinding[] {
  const findings: DataQualityFinding[] = [];
  if (!raw || typeof raw !== "object") {
    findings.push({ source: "Fraud Finder", severity: "info", message: "No Fraud Finder response." });
    return findings;
  }
  const risk = raw.risk as Record<string, unknown> | undefined;
  if (risk && typeof risk.score === "number") {
    if (risk.score < 0 || risk.score > 100) {
      findings.push({ source: "Fraud Finder", severity: "warning", field: "risk.score", message: "Risk score outside 0–100." });
    }
  }
  const emailVal = raw.email_validation as Record<string, unknown> | undefined;
  if (emailVal && emailVal.status !== undefined) {
    const status = String(emailVal.status).toLowerCase();
    if (!["valid", "invalid", "unknown", "risky"].includes(status)) {
      findings.push({ source: "Fraud Finder", severity: "info", field: "email_validation.status", message: `Unexpected email status: ${status}.` });
    }
  }
  return findings;
}

export interface DataQualityInput {
  triBureau?: Record<string, Record<string, unknown> | null>;
  flexIdResult?: { raw?: Record<string, unknown> } | null;
  fraudResult?: { raw?: Record<string, unknown> } | null;
}

export function runDataQualityReport(input: DataQualityInput): DataQualityReport {
  const findings: DataQualityFinding[] = [];
  const bureaus = ["experian", "transunion", "equifax"] as const;

  if (input.triBureau) {
    for (const bureau of bureaus) {
      findings.push(...checkCreditReport(input.triBureau[bureau] ?? null, bureau));
    }
  }

  findings.push(...checkFlexID(input.flexIdResult?.raw));
  findings.push(...checkFraudFinder(input.fraudResult?.raw));

  let deduct = 0;
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const infos = findings.filter((f) => f.severity === "info");
  deduct += Math.min(errors.length * MAX_DEDUCT_ERROR, 50);
  deduct += Math.min(warnings.length * MAX_DEDUCT_WARNING, 30);
  deduct += Math.min(infos.length * MAX_DEDUCT_INFO, 10);
  const score = Math.max(0, Math.min(100, 100 - deduct));

  let summary: string;
  if (findings.length === 0) {
    summary = "No data quality issues found.";
  } else if (errors.length > 0) {
    summary = `${errors.length} error(s), ${warnings.length} warning(s). Review findings below.`;
  } else if (warnings.length > 0) {
    summary = `${warnings.length} warning(s) found. Data is generally usable.`;
  } else {
    summary = `${infos.length} minor note(s). Data quality is good.`;
  }

  return { score, findings, summary };
}
