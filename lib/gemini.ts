import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GreenReadiness } from "./green-scoring";
import type { GreenInvestment } from "./green-investments";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
    model: "gemini-2.0-flash",
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

  const result = await model.generateContent([
    { text: ANALYSIS_SYSTEM_PROMPT },
    { text: userMessage },
  ]);

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
  investmentNames: string[]
): string {
  return `You are GreenPath AI, a helpful assistant specializing in green finance and sustainable living. You have access to the user's credit profile summary and green investment recommendations.

Context about the user:
- Green Readiness Tier: ${greenReadiness.tier}
- Credit Score: ${greenReadiness.creditScore}
- Credit Utilization: ${(greenReadiness.utilization * 100).toFixed(1)}%
- Total Debt: $${greenReadiness.totalDebt.toLocaleString()}
- Recommended investments: ${investmentNames.join(", ")}

Answer questions about:
- Their specific green investment options and financing
- How credit scores affect green loan rates
- Environmental impact of different choices
- Government rebates and incentives (IRA tax credits, state programs)
- Steps to improve their credit for better green financing
- General sustainability tips

Keep responses concise (2-4 sentences unless they ask for detail). Be encouraging and practical.`;
}

export async function streamChat(
  messages: { role: string; content: string }[],
  systemPrompt: string
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const chat = model.startChat({
    history: messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    systemInstruction: systemPrompt,
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessageStream(lastMessage.content);

  return result.stream;
}
