/**
 * Duplicate tradeline detection — same account reported twice or under different names.
 * Compares within a single bureau and across bureaus using account identifiers or
 * creditor + type + balance fingerprint.
 */

export type Bureau = "experian" | "transunion" | "equifax";

export interface TradelineRef {
  bureau: Bureau;
  index: number;
  fingerprint: string;
  label: string;
}

export interface DuplicateGroup {
  fingerprint: string;
  refs: TradelineRef[];
  suggestedLabel: string;
}

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

function getStr(obj: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "";
}

function getTradelines(report: Record<string, unknown> | null): Array<Record<string, unknown>> {
  if (!report) return [];
  const top = report.tradelines as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(top) && top.length > 0) return top;
  const creditFiles = report.creditFiles as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(creditFiles) && creditFiles[0]) {
    const fromFile = (creditFiles[0].tradelines ?? creditFiles[0].trades) as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(fromFile)) return fromFile;
  }
  return [];
}

/** Build a stable key for dedup: account number if present, else creditor + type + balance bucket. */
function fingerprint(tl: Record<string, unknown>): string {
  const accountNum = getStr(
    tl,
    "accountNumber",
    "accountIdentifier",
    "AccountNumber",
    "account number",
    "subscriberAccountNumber"
  ).replace(/\s/g, "");
  if (accountNum && accountNum.length >= 4) {
    return `acct:${accountNum.toLowerCase()}`;
  }
  const creditor = getStr(
    tl,
    "subscriberName",
    "creditorName",
    "subscriber",
    "creditor",
    "SubscriberName",
    "CreditorName"
  ).toLowerCase();
  const type = getStr(tl, "accountType", "type", "AccountType").toLowerCase();
  const balance = getNum(tl, "currentBalanceAmount", "currentBalance", "balanceAmount", "balance", "CurrentBalanceAmount", "BalanceAmount");
  const balanceBucket = balance < 0 ? "neg" : balance < 100 ? "0" : balance < 1000 ? "1k" : balance < 10000 ? "10k" : "10k+";
  return `cred:${creditor || "unknown"}|${type || "unknown"}|${balanceBucket}`;
}

function label(tl: Record<string, unknown>): string {
  const creditor = getStr(tl, "subscriberName", "creditorName", "subscriber", "creditor", "SubscriberName", "CreditorName");
  const accountNum = getStr(tl, "accountNumber", "accountIdentifier", "AccountNumber").slice(-4);
  if (creditor && accountNum) return `${creditor} •••• ${accountNum}`;
  if (creditor) return creditor;
  return "Unknown account";
}

export interface DuplicateTradelinesInput {
  triBureau?: Record<string, Record<string, unknown> | null>;
}

export function detectDuplicateTradelines(input: DuplicateTradelinesInput): DuplicateGroup[] {
  const groups = new Map<string, TradelineRef[]>();
  const bureaus: Bureau[] = ["experian", "transunion", "equifax"];

  if (!input.triBureau) return [];

  for (const bureau of bureaus) {
    const report = input.triBureau[bureau];
    const tradelines = getTradelines(report ?? null);
    tradelines.forEach((tl, index) => {
      const fp = fingerprint(tl);
      const ref: TradelineRef = { bureau, index, fingerprint: fp, label: label(tl) };
      const list = groups.get(fp) ?? [];
      list.push(ref);
      groups.set(fp, list);
    });
  }

  const duplicateGroups: DuplicateGroup[] = [];
  groups.forEach((refs, fp) => {
    if (refs.length < 2) return;
    const suggestedLabel = refs[0].label;
    duplicateGroups.push({ fingerprint: fp, refs, suggestedLabel });
  });

  return duplicateGroups;
}
