import type { GreenReadiness } from "./green-scoring";
import type { GreenInvestment } from "./green-investments";

const GEMINI_BASE = "https://openrouter.ai/api/v1";
const MODEL = "google/gemini-3-flash-preview";

function getApiKey(): string {
  return process.env.OPENROUTER_API_KEY || "";
}

// Retry helper for rate-limited requests
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit = message.includes("429") || message.includes("rate") || message.includes("quota");
      if (isRateLimit && attempt < maxRetries) {
        const waitSec = 10 * (attempt + 1);
        console.log(`[gemini] Rate limited, retrying in ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

const ANALYSIS_SYSTEM_PROMPT = `You are GreenPath AI, a friendly financial and environmental advisor. You've been given a user's credit profile summary and their Green Readiness tier. Your job is to:

1. Write a brief, encouraging 2-3 sentence summary of their financial readiness for green investments.
2. For each recommended green investment, write a personalized 1-2 sentence explanation of why it's a good fit for them specifically, referencing their credit data.
3. If their tier is C or D, provide 2-3 specific, actionable credit improvement tips that would help them unlock higher-tier green investments. Be specific with numbers (e.g., "Paying down $X of your revolving balance would drop your utilization to Y%").
4. Calculate and state the total potential environmental impact if they adopted all recommended actions.

IMPORTANT — Tri-bureau data: When "bureauScores" is provided (Experian, TransUnion, Equifax), you MUST take all three bureaus into account. Mention their range of scores (e.g. "Your scores range from 665 to 695 across bureaus"). If there is a significant spread (e.g. 30+ points), note that lenders may pull from any bureau and suggest they shop around for the best rate.

IMPORTANT — Tradeline profile: When "tradelineProfile" is provided, reference specific accounts:
- If they have high-utilization cards, mention them by name (e.g. "Your Chase Visa is at 85% utilization — paying down $X would drop it to Y%")
- If they have an auto loan, reference it when discussing EV options (e.g. "You already have a car payment — switching to an EV could save $1,500+/yr in fuel")
- If they have no mortgage (isRenter: true), focus on renter-friendly options and flag homeowner-only investments
- Reference their monthly debt payment load when discussing affordability
- Mention federal incentives where applicable (30% solar ITC, $7,500 EV credit, $2,000 heat pump credit)

Keep the tone optimistic, informative, and actionable. Use plain language — no jargon. Format your response as JSON with this structure:
{
  "summary": "string",
  "investmentInsights": [{ "investmentId": "string", "insight": "string" }],
  "creditTips": [{ "tip": "string", "impact": "string" }],
  "totalImpactStatement": "string"
}`;

export interface GeminiAnalysis {
  summary: string;
  investmentInsights: { investmentId: string; insight: string }[];
  creditTips: { tip: string; impact: string }[];
  totalImpactStatement: string;
}

export async function analyzeGreenReadiness(
  greenReadiness: GreenReadiness,
  recommendedInvestments: GreenInvestment[],
  bureauScores?: Record<string, number | null> | null,
  tradelineProfile?: Record<string, unknown> | null
): Promise<GeminiAnalysis> {
  const payload: Record<string, unknown> = {
    greenReadiness: {
      tier: greenReadiness.tier,
      score: greenReadiness.score,
      creditScore: greenReadiness.creditScore,
      utilization: `${(greenReadiness.utilization * 100).toFixed(1)}%`,
      totalDebt: greenReadiness.totalDebt,
      totalCreditLimit: greenReadiness.totalCreditLimit,
      derogatoryCount: greenReadiness.derogatoryCount,
      tradelineCount: greenReadiness.tradelineCount,
      factors: greenReadiness.factors,
    },
    recommendedInvestments: recommendedInvestments.map((inv) => ({
      id: inv.id,
      name: inv.name,
      category: inv.category,
      estimatedCost: inv.estimatedCost,
      annualSavings: inv.annualSavings,
      annualCO2ReductionLbs: inv.annualCO2ReductionLbs,
      description: inv.description,
    })),
  };

  if (bureauScores && Object.keys(bureauScores).length > 0) {
    const scores = Object.entries(bureauScores).filter(([, v]) => v != null) as [string, number][];
    if (scores.length > 0) {
      payload.bureauScores = bureauScores;
      const values = scores.map(([, v]) => v);
      payload.bureauSummary = {
        experian: bureauScores.experian ?? "Not reported",
        transunion: bureauScores.transunion ?? "Not reported",
        equifax: bureauScores.equifax ?? "Not reported",
        scoreSpread: values.length >= 2 ? Math.max(...values) - Math.min(...values) : 0,
      };
    }
  }

  if (tradelineProfile) {
    payload.tradelineProfile = tradelineProfile;
  }

  const userMessage = JSON.stringify(payload, null, 2);

  const res = await withRetry(async () => {
    const r = await fetch(`${GEMINI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Gemini ${r.status}: ${errText}`);
    }
    return r.json();
  });

  const text = res.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(text) as GeminiAnalysis;
  } catch {
    return {
      summary: text,
      investmentInsights: [],
      creditTips: [],
      totalImpactStatement: "",
    };
  }
}

export function createChatSystemPrompt(
  greenReadiness: GreenReadiness,
  investments: GreenInvestment[],
  availableSavings?: number | null,
  bureauScores?: Record<string, number | null> | null,
  flexIdVerified?: boolean | null,
  fraudRiskLevel?: string | null
): string {
  const tierRates: Record<string, string> = {
    A: "5-6% APR (excellent rates)",
    B: "7-9% APR (good rates)",
    C: "12-16% APR (higher rates due to credit profile)",
    D: "18-24% APR (focus on free/low-cost options first)",
  };

  const investmentDetails = investments
    .slice(0, 8)
    .map((i) => `- ${i.name}: $${i.estimatedCost.toLocaleString()} upfront, saves $${i.annualSavings.toLocaleString()}/yr, reduces ${i.annualCO2ReductionLbs.toLocaleString()} lbs CO₂/yr`)
    .join("\n");

  const totalCO2 = investments.reduce((s, i) => s + i.annualCO2ReductionLbs, 0);
  const totalSavings = investments.reduce((s, i) => s + i.annualSavings, 0);

  return `You are GreenPath AI, a warm and knowledgeable advisor who helps people make green investments that fit their financial reality. You speak like a trusted friend who happens to know a lot about green finance.

THIS USER'S FULL PROFILE:
- Green Readiness Tier: ${greenReadiness.tier} (${greenReadiness.tier === "A" ? "Excellent" : greenReadiness.tier === "B" ? "Good" : greenReadiness.tier === "C" ? "Fair" : "Building"})
- Green Readiness Score: ${greenReadiness.score}/100
- Credit Score: ${greenReadiness.creditScore} (VantageScore 4.0)
- Credit Utilization: ${(greenReadiness.utilization * 100).toFixed(1)}% (${greenReadiness.utilization < 0.3 ? "healthy" : greenReadiness.utilization < 0.5 ? "moderate — paying down would help" : "high — this is limiting their options"})
- Total Debt: $${greenReadiness.totalDebt.toLocaleString()}
- Total Credit Limit: $${greenReadiness.totalCreditLimit.toLocaleString()}
- Open Accounts: ${greenReadiness.tradelineCount}
- Derogatory Marks: ${greenReadiness.derogatoryCount}
- Estimated Loan Rate for Their Tier: ${tierRates[greenReadiness.tier]}
- Available Savings (self-reported): ${availableSavings != null ? `$${availableSavings.toLocaleString()}` : "Not provided"}
${bureauScores ? `
TRI-BUREAU SCORES (all VantageScore 4.0):
- Experian: ${bureauScores.experian ?? "N/A"}
- TransUnion: ${bureauScores.transunion ?? "N/A"}
- Equifax: ${bureauScores.equifax ?? "N/A"}
${(() => {
  const scores = Object.values(bureauScores).filter((s): s is number => s != null);
  if (scores.length >= 2) {
    const spread = Math.max(...scores) - Math.min(...scores);
    return `- Score Spread: ${spread} points ${spread >= 30 ? "(significant — advise shopping around)" : "(consistent)"}`;
  }
  return "";
})()}` : ""}
- Identity Verified (FlexID): ${flexIdVerified === true ? "Yes" : flexIdVerified === false ? "Could not verify" : "Not checked"}
- Fraud Risk Level: ${fraudRiskLevel || "Not checked"}

THEIR RECOMMENDED GREEN INVESTMENTS:
${investmentDetails}

COMBINED POTENTIAL IMPACT: ${totalCO2.toLocaleString()} lbs CO₂/year reduced, $${totalSavings.toLocaleString()}/year saved

INSTRUCTIONS:
- Always reference their ACTUAL numbers (credit score, utilization, debt) when relevant — don't speak generically
- If they ask about a specific investment, tell them what rate they'd likely get, the monthly payment at their tier, and whether it makes sense for their situation
- For Tier C/D users, proactively suggest which credit improvements would unlock better options (e.g., "If you paid down $X, your utilization would drop to Y%, which could bump you to Tier B")
- Mention specific government incentives: IRA 30% solar tax credit, $7,500 EV credit, heat pump rebates, etc.
- When savings data is available, tell them which investments they can pay outright vs. which need financing — and what a realistic monthly payment would look like at their tier's rate
- Be concise (2-4 sentences) unless they ask for detail
- Be encouraging — everyone can do something green regardless of their credit tier`;
}

// Returns an async generator of text chunks for streaming chat
export async function* streamChat(
  messages: { role: string; content: string }[],
  systemPrompt: string
): AsyncGenerator<string> {
  const res = await withRetry(async () => {
    const r = await fetch(`${GEMINI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        ],
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Gemini ${r.status}: ${errText}`);
    }
    return r;
  });

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

// ── Quiz Generation ──

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_SYSTEM_PROMPT = `You are GreenPath AI, generating a short quiz for a credit & green finance education module. You have the user's REAL credit data — use it to create personalized questions with their actual numbers.

RULES:
- Generate exactly 3 multiple-choice questions
- Each question has exactly 4 options (A-D)
- Questions MUST reference the user's actual data (their credit score, utilization %, card names, balances, tier, etc.)
- Mix question types: 1 factual recall, 1 applied/calculation, 1 scenario-based
- Keep questions concise (1-2 sentences max)
- Explanations should be 1-2 sentences and educational
- Make wrong answers plausible but clearly wrong to someone who read the module

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "question": "string",
      "options": ["A answer", "B answer", "C answer", "D answer"],
      "correctIndex": 0,
      "explanation": "string"
    }
  ]
}`;

export async function generateQuiz(
  moduleTitle: string,
  moduleContent: string,
  userProfile: Record<string, unknown>
): Promise<QuizQuestion[]> {
  const userMessage = JSON.stringify({
    moduleTitle,
    moduleContent,
    userProfile,
  }, null, 2);

  const res = await withRetry(async () => {
    const r = await fetch(`${GEMINI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: QUIZ_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Gemini ${r.status}: ${errText}`);
    }
    return r.json();
  });

  const text = res.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(text) as { questions: QuizQuestion[] };
    // Validate structure
    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed.questions.map((q) => ({
        question: q.question || "",
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
        correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        explanation: q.explanation || "",
      }));
    }
  } catch {
    // fallback
  }
  return [];
}
