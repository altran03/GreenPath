/**
 * Master curriculum definition for the Study Plan Creator.
 *
 * Every possible module is defined here as a typed constant.
 * Content uses {{placeholder}} and {{#if condition}}...{{/if}} syntax
 * for personalization via the study-plan-engine interpolation.
 */

// ── Types ──

export type ModuleCategory =
  | "credit-fundamentals"
  | "credit-repair"
  | "green-finance"
  | "green-action";

export type ModuleDifficulty = "beginner" | "intermediate" | "advanced";
export type ModulePriority = "urgent" | "high" | "medium" | "low";

export interface ModuleCondition {
  minTier?: "A" | "B" | "C" | "D";
  maxTier?: "A" | "B" | "C" | "D";
  minUtilization?: number;
  maxUtilization?: number;
  minCreditScore?: number;
  maxCreditScore?: number;
  minDerogatoryCount?: number;
  maxTradelineCount?: number;
  hasNegativeFactor?: string;
  isRenter?: boolean;
  hasMortgage?: boolean;
  hasAutoLoan?: boolean;
  hasStudentLoan?: boolean;
  hasHighUtilCards?: boolean;
  hasBureauData?: boolean;
  minBureauSpread?: number;
}

export interface ModuleActionItem {
  text: string;
  priority: string; // ModulePriority or template string like "{{#if x}}urgent{{/if}}"
  estimatedImpact?: string;
}

export interface StudyModule {
  id: string;
  title: string;
  category: ModuleCategory;
  icon: string;
  difficulty: ModuleDifficulty;
  estimatedMinutes: number;
  prerequisiteIds: string[];
  conditions: ModuleCondition;
  priority: ModulePriority;
  highlight: string;
  content: string;
  actionItems: ModuleActionItem[];
  relevance: string;
  relatedInvestmentId?: string;
}

// ── Curriculum ──

export const STUDY_CURRICULUM: StudyModule[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CREDIT FUNDAMENTALS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "credit-101-score",
    title: "How Your Credit Score Works",
    category: "credit-fundamentals",
    icon: "BarChart3",
    difficulty: "beginner",
    estimatedMinutes: 5,
    prerequisiteIds: [],
    conditions: {},
    priority: "high",
    highlight: "Your score is {{creditScore}} — here's what drives it",
    content:
      "Your credit score of {{creditScore}} is built from five factors: payment history (35%), amounts owed (30%), length of credit history (15%), new credit (10%), and credit mix (10%). With {{tradelineCount}} open accounts and {{utilizationPct}}% utilization, your biggest area of opportunity is {{biggestLever}}. Understanding these levers is the first step to improving your Green Readiness tier and unlocking better financing rates.",
    actionItems: [
      {
        text: "Review all {{tradelineCount}} accounts to confirm they're reporting correctly across bureaus.",
        priority: "medium",
      },
    ],
    relevance: "Foundation lesson based on your {{creditScore}} credit score",
  },

  {
    id: "credit-101-utilization",
    title: "Credit Utilization: Your Fastest Win",
    category: "credit-fundamentals",
    icon: "CreditCard",
    difficulty: "beginner",
    estimatedMinutes: 4,
    prerequisiteIds: ["credit-101-score"],
    conditions: {},
    priority: "high",
    highlight: "You're using {{utilizationPct}}% of your {{totalCreditLimitFormatted}} limit",
    content:
      "Credit utilization — how much of your available credit you're using — makes up 30% of your score. The sweet spot is under 30%, with under 10% being optimal. Your current utilization is {{utilizationPct}}%.{{#if isHighUtilization}} You're using {{revolvingBalanceFormatted}} of your {{totalCreditLimitFormatted}} revolving limit. Paying down {{paydownToTargetFormatted}} would bring you to the 30% threshold — one of the fastest ways to boost your score.{{/if}}{{#if isLowUtilization}} Your utilization is already excellent — this is one of your strongest credit factors. Keep balances low and you'll maintain this advantage.{{/if}}",
    actionItems: [
      {
        text: "{{#if isHighUtilization}}Pay down {{paydownToTargetFormatted}} in revolving balances to hit the 30% utilization target.{{/if}}{{#if isLowUtilization}}Maintain your low utilization by keeping balances below 30% of each card's limit.{{/if}}",
        priority: "high",
        estimatedImpact: "{{#if isHighUtilization}}Could improve your score by 20-40 points within 1-2 billing cycles{{/if}}",
      },
    ],
    relevance: "Based on your {{utilizationPct}}% credit utilization",
  },

  {
    id: "bureau-spread",
    title: "Why Your Bureau Scores Differ",
    category: "credit-fundamentals",
    icon: "BarChart3",
    difficulty: "beginner",
    estimatedMinutes: 4,
    prerequisiteIds: ["credit-101-score"],
    conditions: { hasBureauData: true },
    priority: "medium",
    highlight: "{{bureauSpread}}-point spread across {{bureauCount}} bureaus",
    content:
      "Your credit scores vary by {{bureauSpread}} points across bureaus — {{highBureauName}} is highest at {{highBureauScore}} and {{lowBureauName}} is lowest at {{lowBureauScore}}.{{#if isLargeSpread}} This {{bureauSpread}}-point gap happens because creditors don't always report to all three bureaus, and they report at different times. The bureau a lender pulls can change your rate by 0.5-1%. GreenPath uses your lowest score ({{lowBureauScore}}) so you're prepared no matter which bureau a lender checks.{{/if}}{{#if isSmallSpread}} Your scores are fairly consistent, which is a positive signal — lenders will see a similar picture regardless of which bureau they check.{{/if}}",
    actionItems: [
      {
        text: "{{#if isLargeSpread}}When applying for green financing, ask which bureau the lender uses. Your {{highBureauName}} score ({{highBureauScore}}) would get you the best rate.{{/if}}{{#if isSmallSpread}}Your consistent scores mean you can apply to any lender without worrying about bureau selection.{{/if}}",
        priority: "{{#if isLargeSpread}}high{{/if}}{{#if isSmallSpread}}low{{/if}}",
      },
    ],
    relevance: "Generated from your tri-bureau credit pull",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CREDIT REPAIR
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "repair-high-utilization",
    title: "Paying Down Your High-Balance Cards",
    category: "credit-repair",
    icon: "CreditCard",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    prerequisiteIds: ["credit-101-utilization"],
    conditions: { hasHighUtilCards: true },
    priority: "urgent",
    highlight: "{{topHighUtilCardName}} is at {{topHighUtilCardPct}}% — your fastest score fix",
    content:
      "Your {{topHighUtilCardName}} card has a {{topHighUtilCardBalanceFormatted}} balance against a {{topHighUtilCardLimitFormatted}} limit ({{topHighUtilCardPct}}% utilization). High individual card utilization hurts your score even when overall utilization is acceptable. The fastest strategy: pay minimums on everything else and throw extra money at the highest-utilization card first.{{#if hasMultipleHighUtilCards}} You have {{highUtilCardCount}} cards over 50% utilization — tackling them one at a time, starting with the highest, will create the biggest score improvement.{{/if}}",
    actionItems: [
      {
        text: "Pay down {{topHighUtilCardPaydownFormatted}} on your {{topHighUtilCardName}} to bring it under 50% utilization.",
        priority: "urgent",
        estimatedImpact: "Dropping individual card utilization below 50% typically adds 10-20 points",
      },
      {
        text: "Call {{topHighUtilCardName}} and request a credit limit increase — this instantly lowers your utilization ratio.",
        priority: "high",
        estimatedImpact: "A limit increase lowers utilization without paying anything down",
      },
    ],
    relevance: "Based on your {{highUtilCardCount}} high-utilization card(s)",
  },

  {
    id: "repair-derogatory",
    title: "Dealing With Derogatory Marks",
    category: "credit-repair",
    icon: "AlertTriangle",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    prerequisiteIds: ["credit-101-score"],
    conditions: { minDerogatoryCount: 1 },
    priority: "urgent",
    highlight: "{{derogatoryCount}} derogatory mark{{derogatoryPlural}} on your report",
    content:
      "You have {{derogatoryCount}} derogatory mark{{derogatoryPlural}} — these could be collections, charge-offs, or late payments. They stay on your report for 7 years, but their impact fades over time. The good news: if any are incorrect, you can dispute them with the bureau for free. For legitimate marks, a 'pay for delete' negotiation can sometimes get them removed entirely. Even without removal, focusing on your other credit factors (utilization, payment history going forward) will gradually offset the damage.",
    actionItems: [
      {
        text: "Pull your free annual credit report at annualcreditreport.com and verify all {{derogatoryCount}} mark{{derogatoryPlural}} are accurate.",
        priority: "urgent",
        estimatedImpact: "Removing even one incorrect derogatory mark can improve your score by 25-50 points",
      },
      {
        text: "For legitimate collections, contact the agency and negotiate a 'pay for delete' agreement in writing before paying.",
        priority: "high",
      },
    ],
    relevance: "Based on {{derogatoryCount}} derogatory mark{{derogatoryPlural}} on your report",
  },

  {
    id: "repair-thin-file",
    title: "Building a Stronger Credit History",
    category: "credit-repair",
    icon: "FileStack",
    difficulty: "beginner",
    estimatedMinutes: 5,
    prerequisiteIds: ["credit-101-score"],
    conditions: { maxTradelineCount: 3 },
    priority: "high",
    highlight: "Only {{tradelineCount}} account{{tradelinePlural}} — a 'thin file'",
    content:
      "With only {{tradelineCount}} account{{tradelinePlural}}, lenders see limited history to evaluate your reliability. Having 5+ accounts across different types (revolving credit, installment loans) is ideal for credit scoring. You don't need to carry balances — just having open, active accounts in good standing builds your profile. Secured credit cards ($200-$500 deposit), credit-builder loans, and becoming an authorized user on a family member's card are the safest ways to add tradelines without risk.",
    actionItems: [
      {
        text: "Open a secured credit card or credit-builder loan to add a new tradeline to your report.",
        priority: "high",
        estimatedImpact: "Adding 1-2 accounts can improve your score by 10-25 points over 3-6 months",
      },
    ],
    relevance: "Based on your {{tradelineCount}}-account credit file",
  },

  {
    id: "repair-utilization-strategy",
    title: "Strategic Paydown Plan",
    category: "credit-repair",
    icon: "Target",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    prerequisiteIds: ["credit-101-utilization"],
    conditions: { minUtilization: 0.30 },
    priority: "urgent",
    highlight: "{{utilizationPct}}% utilization → target 30% by paying down {{paydownToTargetFormatted}}",
    content:
      "At {{utilizationPct}}% utilization, you're using {{revolvingBalanceFormatted}} of your {{totalCreditLimitFormatted}} revolving credit. The goal is to get below 30% ({{target30Formatted}}). That means paying down {{paydownToTargetFormatted}} total across your revolving accounts. Two strategies: the avalanche method (pay the highest-utilization card first for fastest score impact) or the snowball method (pay the smallest balance first for quick psychological wins). For green financing readiness, the avalanche method is usually better since utilization is scored per-card.",
    actionItems: [
      {
        text: "Pay down {{paydownToTargetFormatted}} total across revolving accounts — start with your highest-utilization card.",
        priority: "urgent",
        estimatedImpact: "Reaching 30% utilization typically improves scores by 20-50 points",
      },
    ],
    relevance: "Paydown strategy for your {{utilizationPct}}% utilization",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GREEN FINANCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "green-finance-tiers",
    title: "What Tier {{tier}} Means for Green Financing",
    category: "green-finance",
    icon: "Leaf",
    difficulty: "beginner",
    estimatedMinutes: 4,
    prerequisiteIds: [],
    conditions: {},
    priority: "high",
    highlight: "Tier {{tier}} ({{tierLabel}}) — {{estimatedRate}}% est. APR",
    content:
      "Your Green Readiness score of {{score}}/100 places you in Tier {{tier}} ({{tierLabel}}). At this tier, you can expect interest rates around {{estimatedRate}}% APR on green financing products. You currently qualify for {{investmentCount}} sustainable investment options.{{#if hasNextTier}} You're {{pointsToNextTier}} points away from Tier {{nextTier}}, which would unlock more options and lower your estimated APR to {{nextTierRate}}%.{{/if}}{{#if isTopTier}} You've reached the highest tier — you have access to all green investments at the best available rates.{{/if}}",
    actionItems: [
      {
        text: "{{#if hasNextTier}}Focus on improving your score by {{pointsToNextTier}} points to reach Tier {{nextTier}} and unlock better rates.{{/if}}{{#if isTopTier}}Maintain your profile and explore all available green investments — you qualify for the best rates.{{/if}}",
        priority: "high",
      },
    ],
    relevance: "Based on your composite Green Readiness score",
  },

  {
    id: "green-finance-incentives",
    title: "Federal Incentives You Qualify For",
    category: "green-finance",
    icon: "BadgeDollarSign",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    prerequisiteIds: ["green-finance-tiers"],
    conditions: {},
    priority: "medium",
    highlight: "Up to {{totalIncentivesFormatted}} in available tax credits & rebates",
    content:
      "The Inflation Reduction Act (IRA) offers major incentives for green investments. Based on your eligible investments: Solar panels get a 30% federal ITC (worth up to $7,500 on a $25K system). New EVs qualify for up to $7,500 in Clean Vehicle Credits. Used EVs get up to $4,000. Heat pumps earn a $2,000 tax credit under Section 25C. These are credits — they reduce your tax bill dollar-for-dollar, not just your taxable income. Most are available through 2032, so there's no rush, but the sooner you act, the sooner you save.",
    actionItems: [
      {
        text: "When filing taxes, use IRS Form 5695 (Residential Energy Credits) to claim green investment tax credits.",
        priority: "medium",
      },
      {
        text: "Check your state and local utility for additional rebates that stack on top of federal incentives.",
        priority: "medium",
      },
    ],
    relevance: "Based on your {{investmentCount}} eligible green investments",
  },

  {
    id: "green-finance-renter",
    title: "Green Investments for Renters",
    category: "green-finance",
    icon: "Home",
    difficulty: "beginner",
    estimatedMinutes: 5,
    prerequisiteIds: ["green-finance-tiers"],
    conditions: { isRenter: true },
    priority: "high",
    highlight: "{{renterFriendlyCount}} green options that don't require homeownership",
    content:
      "As a renter, you might think green investments are out of reach — but {{renterFriendlyCount}} of your {{investmentCount}} options work without owning a home. Community solar (subscribe to a solar farm, save on your bill — free to join), transit passes, e-bikes, LED upgrades, composting, and green banking all deliver real environmental impact without homeownership. Several are free or under $250. You can also advocate to your landlord for building-level improvements like heat pumps or weatherization, which increase property value.",
    actionItems: [
      {
        text: "Start with community solar (free, saves ~$400/yr) or switch to a green bank account (free, immediate impact).",
        priority: "high",
        estimatedImpact: "Community solar alone reduces ~4,000 lbs CO2/year",
      },
    ],
    relevance: "Tailored for your renter status",
  },

  {
    id: "green-finance-homeowner",
    title: "Maximizing Your Home's Green Potential",
    category: "green-finance",
    icon: "Home",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    prerequisiteIds: ["green-finance-tiers"],
    conditions: { hasMortgage: true },
    priority: "high",
    highlight: "{{homeInvestmentCount}} home upgrades available at your tier",
    content:
      "As a homeowner, you have access to the most impactful green investments: solar panels, battery storage, heat pumps, weatherization, and energy-efficient appliances. The 30% federal ITC alone could save you thousands on solar. At your Tier {{tier}} rate of {{estimatedRate}}%, a $25,000 solar system would cost approximately {{solarMonthlyFormatted}}/month after the tax credit — often less than your current electricity bill. Start with a free home energy audit to identify which improvements will have the biggest ROI for your specific home.",
    actionItems: [
      {
        text: "Schedule a free home energy audit to identify your highest-ROI upgrades.",
        priority: "high",
      },
      {
        text: "Get 3+ quotes for solar installation — prices vary by 30-50% between installers.",
        priority: "medium",
      },
    ],
    relevance: "Based on your homeownership and Tier {{tier}} rate",
    relatedInvestmentId: "energy_audit",
  },

  {
    id: "green-finance-ev-transition",
    title: "Your Path to an Electric Vehicle",
    category: "green-finance",
    icon: "Car",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    prerequisiteIds: ["green-finance-tiers"],
    conditions: { hasAutoLoan: true },
    priority: "medium",
    highlight: "You have a {{autoLoanBalanceFormatted}} auto loan — EVs could save $1,500+/yr",
    content:
      "Since you already have an auto loan with {{autoLoanBalanceFormatted}} remaining, you're already making car payments. When it's time for your next vehicle, an EV could save $1,500-$2,500/year in fuel costs alone, plus lower maintenance (no oil changes, less brake wear). New EVs qualify for up to $7,500 in federal tax credits, and used EVs up to $4,000. At your Tier {{tier}} rate of {{estimatedRate}}%, the monthly payment difference may be smaller than you think once fuel savings are factored in.",
    actionItems: [
      {
        text: "Research EVs in your price range at fueleconomy.gov — compare total cost of ownership with your current vehicle.",
        priority: "medium",
        estimatedImpact: "$7,500 tax credit + $1,500+/yr fuel savings makes EVs competitive at most price points",
      },
    ],
    relevance: "Matched to your existing auto loan",
    relatedInvestmentId: "ev_new",
  },

  {
    id: "green-finance-rates",
    title: "Understanding Green Financing Rates",
    category: "green-finance",
    icon: "Percent",
    difficulty: "intermediate",
    estimatedMinutes: 5,
    prerequisiteIds: ["green-finance-tiers"],
    conditions: {},
    priority: "medium",
    highlight: "Your Tier {{tier}} rate: ~{{estimatedRate}}% APR on green loans",
    content:
      "Green financing products (solar loans, EV loans, home improvement loans) work like any other loan — your credit profile determines your rate. At Tier {{tier}}, you can expect around {{estimatedRate}}% APR.{{#if hasNextTier}} Moving to Tier {{nextTier}} would drop that to ~{{nextTierRate}}% — on a $25,000 solar loan over 15 years, that's a difference of {{rateSavingsFormatted}}/month.{{/if}} Many green loans offer special terms: deferred payments until installation is complete, no prepayment penalties, and some utilities offer on-bill financing at even lower rates. Always compare at least 3 lenders.",
    actionItems: [
      {
        text: "{{#if hasNextTier}}Before taking on green financing, work on reaching Tier {{nextTier}} — the rate savings compound over the life of the loan.{{/if}}{{#if isTopTier}}Compare at least 3 lenders — even at Tier A, rates can vary by 1-2% between institutions.{{/if}}",
        priority: "medium",
      },
    ],
    relevance: "Based on your Tier {{tier}} estimated financing rate",
  },

  {
    id: "green-finance-student-loans",
    title: "Balancing Student Loans & Green Goals",
    category: "green-finance",
    icon: "GraduationCap",
    difficulty: "intermediate",
    estimatedMinutes: 5,
    prerequisiteIds: ["green-finance-tiers"],
    conditions: { hasStudentLoan: true },
    priority: "medium",
    highlight: "Student debt doesn't block green investing — here's how to balance both",
    content:
      "Having student loans doesn't mean green investments are off the table. In fact, some green investments (community solar, green banking, composting) are free and save you money that can go toward student loan payments. For larger investments like solar or EVs, your debt-to-income ratio matters — but lenders look at monthly payments, not total balance. With your current monthly debt payments of {{monthlyDebtFormatted}}, you may still qualify for green financing.{{#if isHighUtilization}} Paying down revolving debt first will improve both your credit score and your debt-to-income ratio, making green financing more accessible.{{/if}}",
    actionItems: [
      {
        text: "Start with free green investments (community solar, green banking) while managing student loan payments.",
        priority: "medium",
      },
    ],
    relevance: "Tailored to your student loan situation",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GREEN ACTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "action-community-solar",
    title: "Get Started with Community Solar",
    category: "green-action",
    icon: "Sun",
    difficulty: "beginner",
    estimatedMinutes: 4,
    prerequisiteIds: ["green-finance-tiers"],
    conditions: {},
    priority: "high",
    highlight: "Free to join, saves ~$400/year, available in 40+ states",
    content:
      "Community solar is the easiest green action you can take — no installation, no equipment, no upfront cost. You subscribe to a share of a local solar farm and receive credits on your electricity bill, typically saving 10-20%. There's usually no long-term commitment, and you can cancel anytime. This works whether you rent or own. It's one of the highest-impact, lowest-effort green investments available.",
    actionItems: [
      {
        text: "Search 'community solar near me' or visit EnergySage.com to find programs in your area.",
        priority: "high",
        estimatedImpact: "~4,000 lbs CO2/year reduced + ~$400/year savings at zero cost",
      },
    ],
    relevance: "No-cost green action available at any tier",
    relatedInvestmentId: "community_solar",
  },

  {
    id: "action-green-banking",
    title: "Switch to a Green Bank Account",
    category: "green-action",
    icon: "Landmark",
    difficulty: "beginner",
    estimatedMinutes: 3,
    prerequisiteIds: [],
    conditions: {},
    priority: "medium",
    highlight: "Free — your deposits fund clean energy instead of fossil fuels",
    content:
      "Traditional banks use your deposits to fund fossil fuel projects. Green banks and credit unions (like Aspiration, Atmos Financial, or local clean energy credit unions) channel deposits toward renewable energy, sustainable agriculture, and community development instead. Switching takes 15 minutes, costs nothing, and your money works for the climate while earning the same (or better) interest rates. This is the lowest-effort, highest-principle green investment.",
    actionItems: [
      {
        text: "Open an account at a green bank (Aspiration, Atmos, or a local clean energy credit union) and redirect your direct deposit.",
        priority: "medium",
        estimatedImpact: "Diverts thousands of dollars annually from fossil fuel financing",
      },
    ],
    relevance: "Free, instant green impact — no credit check needed",
    relatedInvestmentId: "green_bank_account",
  },

  {
    id: "action-led-composting",
    title: "Quick Wins: LEDs & Composting",
    category: "green-action",
    icon: "Lightbulb",
    difficulty: "beginner",
    estimatedMinutes: 3,
    prerequisiteIds: [],
    conditions: {},
    priority: "low",
    highlight: "Under $250 total — immediate savings and impact",
    content:
      "Two of the cheapest, easiest green investments: LED bulbs ($50-$200 for a whole home) save $100+/year on electricity and last 25x longer than incandescent bulbs. Composting ($50 for a basic bin) diverts food waste from landfills where it produces methane — a greenhouse gas 80x more potent than CO2 over 20 years. Together, these cost under $250, require no financing or credit check, and start reducing your footprint immediately.",
    actionItems: [
      {
        text: "Replace your 10 most-used light bulbs with LEDs this week — payback is typically under 3 months.",
        priority: "low",
        estimatedImpact: "LEDs: ~500 lbs CO2/yr + $100/yr savings. Composting: ~200 lbs CO2/yr.",
      },
    ],
    relevance: "Low-cost, no-credit-required green actions",
    relatedInvestmentId: "led_upgrade",
  },

  {
    id: "action-transit-ebike",
    title: "Low-Cost Green Transportation",
    category: "green-action",
    icon: "Bike",
    difficulty: "beginner",
    estimatedMinutes: 4,
    prerequisiteIds: ["green-finance-tiers"],
    conditions: {},
    priority: "medium",
    highlight: "Transit pass or e-bike — save $2,000-$4,000/yr vs. driving",
    content:
      "A transit pass (~$100/month) or e-bike ($1,500-$3,000) can dramatically cut transportation costs and emissions. If you drive 12,000 miles/year, you're spending ~$2,000-$4,000 on gas plus wear and tear. An e-bike costs 2-3 cents per mile to charge. A transit pass eliminates fuel, insurance, and parking costs for commuting. Even using these for just half your trips creates massive savings and reduces thousands of pounds of CO2 annually.",
    actionItems: [
      {
        text: "Calculate your current commute cost (fuel + parking + wear) and compare it to a monthly transit pass.",
        priority: "medium",
        estimatedImpact: "Transit: ~4,000 lbs CO2/yr saved. E-bike: ~3,000 lbs CO2/yr saved.",
      },
    ],
    relevance: "Available at any tier, major impact per dollar",
    relatedInvestmentId: "transit_pass",
  },

  {
    id: "action-solar",
    title: "Going Solar: A Deep Dive",
    category: "green-action",
    icon: "Sun",
    difficulty: "advanced",
    estimatedMinutes: 8,
    prerequisiteIds: ["green-finance-tiers", "green-finance-incentives"],
    conditions: { hasMortgage: true, minTier: "B" },
    priority: "medium",
    highlight: "$25,000 → {{solarEffectiveCostFormatted}} after 30% ITC — saves ~$1,800/yr",
    content:
      "Solar panels are the single highest-impact green investment for homeowners. A typical 8kW system costs ~$25,000, but the 30% federal ITC brings that to {{solarEffectiveCostFormatted}}. At your Tier {{tier}} rate of {{estimatedRate}}%, that's approximately {{solarMonthlyFormatted}}/month over 15 years — often less than your current electricity bill. Solar panels typically pay for themselves in 7-10 years and produce clean energy for 25-30 years. Many states offer additional incentives on top of the federal credit.",
    actionItems: [
      {
        text: "Get 3+ quotes from solar installers using EnergySage.com — prices vary 30-50% between providers.",
        priority: "medium",
        estimatedImpact: "~10,000 lbs CO2/yr reduced + ~$1,800/yr electricity savings",
      },
    ],
    relevance: "Best ROI green investment for homeowners at Tier {{tier}}",
    relatedInvestmentId: "solar_panels",
  },

  {
    id: "action-ev-switch",
    title: "Making the Switch to an EV",
    category: "green-action",
    icon: "Car",
    difficulty: "advanced",
    estimatedMinutes: 7,
    prerequisiteIds: ["green-finance-tiers", "green-finance-incentives"],
    conditions: { minTier: "B" },
    priority: "medium",
    highlight: "Up to $7,500 tax credit + $1,500+/yr fuel savings",
    content:
      "Electric vehicles have reached price parity with gas cars when you factor in the $7,500 federal tax credit (new) or $4,000 (used), plus $1,500-$2,500/year in fuel savings and lower maintenance costs. At your Tier {{tier}} rate, a $35,000 new EV financed over 6 years costs about {{evMonthlyFormatted}}/month after the tax credit.{{#if hasAutoLoan}} Since you already have an auto loan with {{autoLoanBalanceFormatted}} remaining, consider timing your EV purchase when your current loan is paid down.{{/if}} Most daily driving needs are well within modern EV range (250-350 miles).",
    actionItems: [
      {
        text: "{{#if hasAutoLoan}}Time your EV purchase when your current auto loan is near payoff to minimize overlapping payments.{{/if}}{{#if noAutoLoan}}Research EVs in your budget at fueleconomy.gov and check which models qualify for the $7,500 credit.{{/if}}",
        priority: "medium",
        estimatedImpact: "~12,000 lbs CO2/yr reduced + $1,500-$2,500/yr fuel savings",
      },
    ],
    relevance: "Available at your Tier {{tier}} financing level",
    relatedInvestmentId: "ev_new",
  },

  {
    id: "action-heat-pump",
    title: "Heat Pumps: Heating & Cooling Upgrade",
    category: "green-action",
    icon: "Thermometer",
    difficulty: "advanced",
    estimatedMinutes: 6,
    prerequisiteIds: ["green-finance-tiers", "green-finance-incentives"],
    conditions: { minTier: "B" },
    priority: "medium",
    highlight: "$12,000 → $10,000 after $2,000 tax credit — saves $800/yr",
    content:
      "Heat pumps are 2-3x more efficient than traditional furnaces and air conditioners because they move heat rather than generating it. A whole-home heat pump system costs ~$12,000, with a $2,000 federal tax credit under Section 25C bringing that to $10,000. At your Tier {{tier}} rate, that's about {{heatPumpMonthlyFormatted}}/month over 10 years. They save $800-$1,200/year on heating and cooling costs and dramatically reduce your home's carbon footprint.",
    actionItems: [
      {
        text: "Get a home energy audit first to determine if a heat pump is the right fit for your climate and home insulation level.",
        priority: "medium",
        estimatedImpact: "~6,000 lbs CO2/yr reduced + $800-$1,200/yr savings",
      },
    ],
    relevance: "Available at Tier {{tier}} with $2,000 federal tax credit",
    relatedInvestmentId: "heat_pump",
  },

  {
    id: "action-weatherization",
    title: "Weatherize Your Home",
    category: "green-action",
    icon: "Shield",
    difficulty: "intermediate",
    estimatedMinutes: 5,
    prerequisiteIds: ["green-finance-tiers"],
    conditions: { hasMortgage: true },
    priority: "medium",
    highlight: "$3,000 investment — saves $600/yr with $1,600 in rebates available",
    content:
      "Weatherization (insulation, air sealing, window upgrades) is one of the best ROI home improvements. It typically costs $2,000-$4,000 and saves $400-$800/year in heating and cooling costs. The IRA provides up to $1,600 in rebates for insulation and air sealing. Weatherization also makes other green investments more effective — a well-insulated home needs a smaller (cheaper) heat pump and generates more surplus solar power. It's the foundation of a green home.",
    actionItems: [
      {
        text: "Schedule a home energy audit (often free through your utility) to identify air leaks and insulation gaps.",
        priority: "medium",
        estimatedImpact: "~2,000 lbs CO2/yr reduced + $400-$800/yr savings",
      },
    ],
    relevance: "High-ROI homeowner upgrade with federal rebates",
    relatedInvestmentId: "weatherization",
  },
];
