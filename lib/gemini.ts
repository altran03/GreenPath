import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GreenReadiness } from "./green-scoring";
import type { GreenInvestment } from "./green-investments";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Retry helper for rate-limited requests
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit = message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("quota");
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
  recommendedInvestments: GreenInvestment[]
): Promise<GeminiAnalysis> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const userMessage = JSON.stringify(
    {
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
    },
    null,
    2
  );

  const result = await withRetry(() =>
    model.generateContent([
      { text: ANALYSIS_SYSTEM_PROMPT },
      { text: userMessage },
    ])
  );

  const text = result.response.text();
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
  availableSavings?: number | null
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

export async function streamChat(
  messages: { role: string; content: string }[],
  systemPrompt: string
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const chat = model.startChat({
    history: messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    systemInstruction: systemPrompt,
  });

  const lastMessage = messages[messages.length - 1];
  const result = await withRetry(() =>
    chat.sendMessageStream(lastMessage.content)
  );

  return result.stream;
}
