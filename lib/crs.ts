const CRS_BASE_URL = process.env.CRS_BASE_URL || "https://api-sandbox.stitchcredit.com/api";
const CRS_USERNAME = process.env.CRS_USERNAME || "";
const CRS_PASSWORD = process.env.CRS_PASSWORD || "";
const CRS_CONFIG_EXPERIAN = process.env.CRS_CONFIG || "exp-prequal-vantage4";
const CRS_CONFIG_TRANSUNION = "tu-prequal-vantage4";
const CRS_CONFIG_EQUIFAX = "efx-prequal-vantage4";

// Module-level JWT cache
let cachedToken: string | null = null;

export async function authenticateCRS(): Promise<string> {
  if (cachedToken) return cachedToken;

  const res = await fetch(`${CRS_BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: CRS_USERNAME,
      password: CRS_PASSWORD,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CRS auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.token || data.id_token || data.access_token;

  if (!cachedToken) {
    // Some CRS responses return the token differently
    cachedToken = typeof data === "string" ? data : JSON.stringify(data);
  }

  return cachedToken!;
}

export function clearCachedToken() {
  cachedToken = null;
}

// --------------- Credit Report Types ---------------

export interface CreditReportInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  ssn: string;
  birthDate?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export type Bureau = "experian" | "transunion" | "equifax";

function getBureauEndpoint(bureau: Bureau): string {
  switch (bureau) {
    case "experian":
      return `${CRS_BASE_URL}/experian/credit-profile/credit-report/standard/${CRS_CONFIG_EXPERIAN}`;
    case "transunion":
      return `${CRS_BASE_URL}/transunion/credit-report/standard/${CRS_CONFIG_TRANSUNION}`;
    case "equifax":
      return `${CRS_BASE_URL}/equifax/credit-report/standard/${CRS_CONFIG_EQUIFAX}`;
  }
}

// --------------- Credit Report Pull ---------------

export async function pullCreditReport(
  input: CreditReportInput,
  bureau: Bureau = "experian",
  retried = false
): Promise<Record<string, unknown>> {
  const token = await authenticateCRS();

  const body = {
    firstName: input.firstName,
    lastName: input.lastName,
    middleName: input.middleName || "",
    suffix: input.suffix || "",
    ssn: input.ssn.replace(/\D/g, ""),
    birthDate: input.birthDate || "",
    addresses: [
      {
        borrowerResidencyType: "Current",
        addressLine1: input.addressLine1,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode.replace(/\D/g, ""),
      },
    ],
  };

  const res = await fetch(getBureauEndpoint(bureau), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  // Handle 401 — re-auth once
  if (res.status === 401 && !retried) {
    clearCachedToken();
    return pullCreditReport(input, bureau, true);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CRS ${bureau} credit report failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  console.log(`[crs] ${bureau} bureau response`, data);
  return data as Record<string, unknown>;
}

/** Pull all 3 bureaus in parallel. Returns results keyed by bureau. Non-fatal failures return null. */
export async function pullTriBureauReports(
  input: CreditReportInput
): Promise<Record<Bureau, Record<string, unknown> | null>> {
  const bureaus: Bureau[] = ["experian", "transunion", "equifax"];

  const results = await Promise.allSettled(
    bureaus.map((b) => pullCreditReport(input, b))
  );

  const out: Record<Bureau, Record<string, unknown> | null> = {
    experian: null,
    transunion: null,
    equifax: null,
  };

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      out[bureaus[i]] = r.value;
    } else {
      console.error(`[crs] ${bureaus[i]} pull failed:`, r.reason);
    }
  });

  return out;
}

// --------------- FlexID Identity Verification ---------------

export interface FlexIDInput {
  firstName: string;
  lastName: string;
  ssn: string; // Last 4 digits
  dateOfBirth?: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  homePhone?: string;
}

export interface FlexIDResult {
  verified: boolean;
  riskScore?: number;
  summary: string;
  raw: Record<string, unknown>;
  verifiedElements?: Record<string, boolean>;
  riskIndicators?: Array<Record<string, unknown>>;
  nameAddressSSNSummary?: number;
}

export async function verifyIdentityFlexID(
  input: FlexIDInput,
  retried = false
): Promise<FlexIDResult> {
  const token = await authenticateCRS();

  // FlexID requires dateOfBirth in YYYY-MM-DD when present; omit when empty or invalid to avoid 400
  const dob = (input.dateOfBirth || "").trim();
  const dobValid = /^\d{4}-\d{2}-\d{2}$/.test(dob);

  const body: Record<string, string> = {
    firstName: input.firstName,
    lastName: input.lastName,
    ssn: input.ssn.replace(/\D/g, "").slice(-4), // Last 4 only
    streetAddress: input.streetAddress,
    city: input.city,
    state: input.state,
    zipCode: input.zipCode.replace(/\D/g, ""),
    homePhone: input.homePhone?.replace(/\D/g, "") || "",
  };
  if (dobValid) body.dateOfBirth = dob;

  const res = await fetch(`${CRS_BASE_URL}/flex-id/flex-id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401 && !retried) {
    clearCachedToken();
    return verifyIdentityFlexID(input, true);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FlexID verification failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Parse real FlexID response structure
  // data.result.comprehensiveVerification.comprehensiveVerificationIndex = CVI score
  // data.result.verifiedElementSummary = per-field boolean checks
  // data.result.nameAddressSSNSummary = numeric summary (higher = better match)
  const result = (data.result || data) as Record<string, unknown>;
  const compVerification = (result.comprehensiveVerification || {}) as Record<string, unknown>;
  const cvi = parseInt(String(compVerification.comprehensiveVerificationIndex || "0"), 10);
  const nassSum = typeof result.nameAddressSSNSummary === "number" ? result.nameAddressSSNSummary : 0;
  const verifiedElements = (result.verifiedElementSummary || {}) as Record<string, boolean>;

  // Identity is considered verified if CVI >= 20 OR nameAddressSSNSummary >= 6
  const verified = cvi >= 20 || nassSum >= 6;

  return {
    verified,
    riskScore: cvi > 0 ? cvi : undefined,
    summary: verified
      ? "Identity verified via LexisNexis FlexID"
      : "Identity could not be fully verified",
    raw: data,
    // Expose parsed fields for anomaly detection
    verifiedElements,
    riskIndicators: ((compVerification.riskIndicators || {}) as Record<string, unknown>).riskIndicator as Array<Record<string, unknown>> | undefined,
    nameAddressSSNSummary: nassSum,
  };
}

// --------------- Fraud Finder ---------------

export interface FraudFinderInput {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  ipAddress?: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface FraudFinderResult {
  riskLevel: "low" | "medium" | "high" | "unknown";
  signals: string[];
  summary: string;
  raw: Record<string, unknown>;
}

export async function runFraudFinder(
  input: FraudFinderInput,
  retried = false
): Promise<FraudFinderResult> {
  const token = await authenticateCRS();

  const body = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email || "",
    phoneNumber: input.phoneNumber?.replace(/\D/g, "") || "",
    ipAddress: input.ipAddress || "",
    address: {
      addressLine1: input.addressLine1,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode.replace(/\D/g, ""),
    },
  };

  const res = await fetch(`${CRS_BASE_URL}/fraud-finder/fraud-finder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401 && !retried) {
    clearCachedToken();
    return runFraudFinder(input, true);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fraud Finder failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Parse real Fraud Finder (AtData) response structure:
  // data.email_validation.status — "valid" | "invalid"
  // data.risk.score — 0-100 (higher = riskier)
  // data.risk.postal.deliverability — "deliverable" | "possibly_deliverable" | "undeliverable"
  // data.risk.postal.first_name_match / last_name_match — "match" | "mismatch" | "no_data"
  // data.risk.postal.address_type — "Highrise" | "Commercial" etc.
  // data.risk.postal.deliverability_substatus — reason detail
  // data.risk.ip.proxy_type — proxy detection

  const signals: string[] = [];
  let riskLevel: FraudFinderResult["riskLevel"] = "unknown";

  // Email validation
  const emailVal = (data.email_validation || {}) as Record<string, unknown>;
  if (emailVal.status === "invalid") {
    signals.push("Email address is invalid");
    riskLevel = "high";
  } else if (emailVal.status === "valid") {
    signals.push("Email address verified");
  }

  // Risk score
  const riskData = (data.risk || {}) as Record<string, unknown>;
  const riskScore = typeof riskData.score === "number" ? riskData.score : 0;

  // Postal / address signals
  const postal = (riskData.postal || {}) as Record<string, unknown>;
  const deliverability = String(postal.deliverability || "");
  if (deliverability === "undeliverable") {
    signals.push("Address is undeliverable");
    riskLevel = riskLevel === "high" ? "high" : "medium";
  } else if (deliverability === "possibly_deliverable") {
    signals.push("Address possibly deliverable");
  } else if (deliverability === "deliverable") {
    signals.push("Address deliverable");
  }

  // Address CMRA check
  if (postal.address_type === "Commercial") {
    signals.push("Commercial address detected");
    riskLevel = riskLevel === "high" ? "high" : "medium";
  }

  // Name match checks (only flag actual mismatches, not "no_data")
  if (postal.first_name_match === "mismatch") {
    signals.push("First name mismatch at address");
    riskLevel = riskLevel === "high" ? "high" : "medium";
  }
  if (postal.last_name_match === "mismatch") {
    signals.push("Last name mismatch at address");
    riskLevel = riskLevel === "high" ? "high" : "medium";
  }

  // IP proxy detection
  const ipData = (riskData.ip || {}) as Record<string, unknown>;
  if (ipData.proxy_type && ipData.proxy_type !== "") {
    signals.push(`IP proxy detected: ${ipData.proxy_type}`);
    riskLevel = riskLevel === "high" ? "high" : "medium";
  }

  // Overall risk score threshold
  if (riskScore >= 70 && riskLevel !== "high") {
    riskLevel = "high";
  } else if (riskScore >= 40 && riskLevel === "unknown") {
    riskLevel = "medium";
  }

  // Default to low if no flags
  if (riskLevel === "unknown" && res.ok) {
    riskLevel = "low";
  }

  if (signals.length === 0) {
    signals.push("No fraud signals detected");
  }

  return {
    riskLevel,
    signals,
    summary:
      riskLevel === "low"
        ? "No fraud signals detected — identity appears clean"
        : riskLevel === "medium"
        ? "Some inconsistencies detected — review flagged fields"
        : riskLevel === "high"
        ? "Elevated fraud risk detected — additional verification recommended"
        : "Fraud check completed",
    raw: data,
  };
}
