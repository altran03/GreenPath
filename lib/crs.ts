const CRS_BASE_URL = process.env.CRS_BASE_URL || "https://api-sandbox.stitchcredit.com/api";
const CRS_USERNAME = process.env.CRS_USERNAME || "";
const CRS_PASSWORD = process.env.CRS_PASSWORD || "";
const CRS_CONFIG = process.env.CRS_CONFIG || "exp-prequal-vantage4";

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

export async function pullCreditReport(
  input: CreditReportInput,
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

  const res = await fetch(
    `${CRS_BASE_URL}/experian/credit-profile/credit-report/standard/${CRS_CONFIG}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );

  // Handle 401 — re-auth once
  if (res.status === 401 && !retried) {
    clearCachedToken();
    return pullCreditReport(input, true);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CRS credit report failed (${res.status}): ${text}`);
  }

  return res.json();
}
