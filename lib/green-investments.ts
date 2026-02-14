export interface GreenInvestment {
  id: string;
  name: string;
  category: "energy" | "transportation" | "home" | "lifestyle" | "education";
  minTier: "A" | "B" | "C" | "D";
  estimatedCost: number;
  estimatedMonthlyPayment: number;
  annualSavings: number;
  annualCO2ReductionLbs: number;
  financingTermYears: number;
  description: string;
  longDescription: string;
  icon: string;
  roiYears: number;
  difficulty: "easy" | "moderate" | "significant";
}

export const greenInvestments: GreenInvestment[] = [
  {
    id: "solar_panels",
    name: "Rooftop Solar Panels",
    category: "energy",
    minTier: "A",
    estimatedCost: 25000,
    estimatedMonthlyPayment: 150,
    annualSavings: 2400,
    annualCO2ReductionLbs: 10000,
    financingTermYears: 25,
    description: "Generate clean energy from your rooftop and slash electricity bills.",
    longDescription:
      "A residential solar panel system typically ranges from 6-10 kW, covering most of a household's electricity needs. With the federal ITC (Investment Tax Credit) offering a 30% tax credit through the Inflation Reduction Act, and many state incentives available, the effective cost is significantly lower. Solar panels last 25-30 years and often pay for themselves within 7-10 years. Financing options include solar loans, leases, and PPAs (Power Purchase Agreements).",
    icon: "Sun",
    roiYears: 10,
    difficulty: "significant",
  },
  {
    id: "ev_new",
    name: "New Electric Vehicle",
    category: "transportation",
    minTier: "A",
    estimatedCost: 35000,
    estimatedMonthlyPayment: 550,
    annualSavings: 2000,
    annualCO2ReductionLbs: 12000,
    financingTermYears: 6,
    description: "Switch to electric and eliminate gas costs while reducing emissions.",
    longDescription:
      "New EVs qualify for up to $7,500 in federal tax credits under the IRA. Average fuel savings of $1,500-$2,500/year compared to gas vehicles, plus lower maintenance costs (no oil changes, less brake wear). Charging at home costs roughly equivalent to $1/gallon of gas. With your credit tier, you may qualify for competitive auto loan rates of 4-6% APR.",
    icon: "Car",
    roiYears: 8,
    difficulty: "significant",
  },
  {
    id: "home_battery",
    name: "Home Battery Storage",
    category: "energy",
    minTier: "A",
    estimatedCost: 15000,
    estimatedMonthlyPayment: 200,
    annualSavings: 800,
    annualCO2ReductionLbs: 3000,
    financingTermYears: 10,
    description: "Store solar energy for use at night and during outages.",
    longDescription:
      "Home battery systems like Tesla Powerwall or Enphase IQ store excess solar energy for evening use or grid outages. They qualify for the 30% federal tax credit when paired with solar. Batteries enable time-of-use arbitrage — charging when rates are low and discharging when rates peak. This maximizes the value of your solar installation and provides energy independence.",
    icon: "Battery",
    roiYears: 12,
    difficulty: "significant",
  },
  {
    id: "green_mortgage_refi",
    name: "Green Mortgage Refinance",
    category: "home",
    minTier: "A",
    estimatedCost: 5000,
    estimatedMonthlyPayment: 0,
    annualSavings: 3000,
    annualCO2ReductionLbs: 5000,
    financingTermYears: 0,
    description: "Refinance to a green mortgage with better rates for energy-efficient homes.",
    longDescription:
      "Green mortgages (Energy Efficient Mortgages) offer favorable rates for homes meeting energy efficiency standards. Fannie Mae's Green Financing programs and FHA Energy Efficient Mortgages allow you to finance energy improvements into your mortgage. With excellent credit, you may access rates 0.25-0.5% below conventional mortgages, saving thousands over the loan term.",
    icon: "Home",
    roiYears: 2,
    difficulty: "significant",
  },
  {
    id: "ev_used",
    name: "Used Electric Vehicle",
    category: "transportation",
    minTier: "B",
    estimatedCost: 18000,
    estimatedMonthlyPayment: 350,
    annualSavings: 1800,
    annualCO2ReductionLbs: 11000,
    financingTermYears: 5,
    description: "Get an affordable EV and enjoy low fuel and maintenance costs.",
    longDescription:
      "Used EVs now qualify for up to $4,000 in federal tax credits under the IRA (for vehicles under $25,000 from dealers). Models like the Chevrolet Bolt, Nissan Leaf, and Tesla Model 3 offer great value on the used market. Battery degradation is typically only 10-20% after 5 years. Combined with fuel savings and reduced maintenance, a used EV can be cheaper than a comparable gas car.",
    icon: "CarFront",
    roiYears: 6,
    difficulty: "moderate",
  },
  {
    id: "heat_pump",
    name: "Heat Pump HVAC System",
    category: "home",
    minTier: "B",
    estimatedCost: 12000,
    estimatedMonthlyPayment: 180,
    annualSavings: 1200,
    annualCO2ReductionLbs: 5000,
    financingTermYears: 7,
    description: "Replace your furnace with an ultra-efficient heat pump.",
    longDescription:
      "Modern heat pumps are 2-3x more efficient than traditional furnaces, working in climates as cold as -15°F. The IRA provides up to $8,000 in rebates for heat pump installation (income-dependent), plus a $2,000 annual tax credit. Heat pumps provide both heating and cooling, potentially replacing two systems with one. Ductless mini-splits are an option for homes without ductwork.",
    icon: "Thermometer",
    roiYears: 7,
    difficulty: "moderate",
  },
  {
    id: "energy_appliances",
    name: "Energy Star Appliances",
    category: "home",
    minTier: "B",
    estimatedCost: 4000,
    estimatedMonthlyPayment: 70,
    annualSavings: 500,
    annualCO2ReductionLbs: 2500,
    financingTermYears: 5,
    description: "Upgrade to Energy Star refrigerator, washer, dryer, and dishwasher.",
    longDescription:
      "Energy Star certified appliances use 10-50% less energy than standard models. A full upgrade (refrigerator, washer, dryer, dishwasher) typically saves $300-$500/year on utility bills. The IRA offers rebates of up to $840 for electric stoves, cooktops, and heat pump dryers. Many utility companies offer additional rebates for Energy Star purchases.",
    icon: "Refrigerator",
    roiYears: 8,
    difficulty: "moderate",
  },
  {
    id: "smart_thermostat",
    name: "Smart Thermostat",
    category: "home",
    minTier: "B",
    estimatedCost: 250,
    estimatedMonthlyPayment: 0,
    annualSavings: 180,
    annualCO2ReductionLbs: 1500,
    financingTermYears: 0,
    description: "Save energy automatically with smart scheduling and learning.",
    longDescription:
      "Smart thermostats like Nest, Ecobee, or Honeywell learn your schedule and automatically adjust temperatures for maximum comfort and minimum waste. They typically save 10-15% on heating and cooling costs. Many utility companies offer $50-$100 rebates. Remote control via smartphone lets you adjust settings when away from home. Some models include occupancy sensors for room-by-room optimization.",
    icon: "Gauge",
    roiYears: 1.5,
    difficulty: "easy",
  },
  {
    id: "ebike",
    name: "Electric Bike / Scooter",
    category: "transportation",
    minTier: "C",
    estimatedCost: 2000,
    estimatedMonthlyPayment: 45,
    annualSavings: 1500,
    annualCO2ReductionLbs: 3000,
    financingTermYears: 4,
    description: "Replace short car trips with an e-bike for massive savings.",
    longDescription:
      "E-bikes can replace car trips for commutes under 10 miles, errands, and recreation. They cost about $0.01/mile to operate vs. $0.60/mile for a car. Some states offer tax credits or rebates (e.g., Colorado offers up to $1,400). E-bikes provide exercise benefits while still making hills and headwinds manageable. Many companies now offer e-bike financing with 0% APR.",
    icon: "Bike",
    roiYears: 1.5,
    difficulty: "easy",
  },
  {
    id: "weatherization",
    name: "Home Weatherization",
    category: "home",
    minTier: "C",
    estimatedCost: 3000,
    estimatedMonthlyPayment: 55,
    annualSavings: 600,
    annualCO2ReductionLbs: 2500,
    financingTermYears: 5,
    description: "Seal air leaks and add insulation to reduce energy waste.",
    longDescription:
      "Weatherization includes air sealing, insulation upgrades, and duct sealing. The average home loses 25-40% of heating/cooling energy through air leaks. The IRA provides up to $1,600 in rebates for insulation and air sealing. The DOE's Weatherization Assistance Program (WAP) provides free weatherization for income-qualifying households. Professional energy audits can identify the biggest opportunities.",
    icon: "Wind",
    roiYears: 5,
    difficulty: "moderate",
  },
  {
    id: "community_solar",
    name: "Community Solar Subscription",
    category: "energy",
    minTier: "C",
    estimatedCost: 0,
    estimatedMonthlyPayment: 0,
    annualSavings: 400,
    annualCO2ReductionLbs: 4000,
    financingTermYears: 0,
    description: "Get solar savings without panels — subscribe to a local solar farm.",
    longDescription:
      "Community solar lets renters and homeowners without suitable roofs access solar energy. You subscribe to a share of a local solar farm and receive credits on your electricity bill — typically saving 10-20%. No installation, no upfront cost, and you can usually cancel anytime. Available in 40+ states and growing rapidly. This is one of the easiest ways to go green with zero financial risk.",
    icon: "Users",
    roiYears: 0,
    difficulty: "easy",
  },
  {
    id: "led_upgrade",
    name: "Whole-Home LED Upgrade",
    category: "home",
    minTier: "C",
    estimatedCost: 200,
    estimatedMonthlyPayment: 0,
    annualSavings: 150,
    annualCO2ReductionLbs: 800,
    financingTermYears: 0,
    description: "Replace all bulbs with LEDs for instant energy savings.",
    longDescription:
      "LED bulbs use 75% less energy than incandescents and last 25x longer. Replacing 30 bulbs in an average home costs about $150-$200 and saves $100-$200/year. Many utility companies provide free or discounted LED bulbs. Smart LED bulbs add dimming, scheduling, and color temperature control for additional savings and comfort.",
    icon: "Lightbulb",
    roiYears: 1.5,
    difficulty: "easy",
  },
  {
    id: "transit_pass",
    name: "Annual Transit Pass",
    category: "transportation",
    minTier: "D",
    estimatedCost: 1200,
    estimatedMonthlyPayment: 100,
    annualSavings: 4000,
    annualCO2ReductionLbs: 4500,
    financingTermYears: 0,
    description: "Ditch the car commute and save thousands on gas and parking.",
    longDescription:
      "Public transit produces 80% less CO2 per passenger mile than single-occupancy vehicles. Annual passes in major cities cost $1,000-$1,500 compared to $8,000-$12,000/year for car ownership (gas, insurance, parking, maintenance). Many employers offer pre-tax transit benefits saving an additional 30%. This is one of the highest-impact, lowest-cost green actions available.",
    icon: "Bus",
    roiYears: 0.3,
    difficulty: "easy",
  },
  {
    id: "energy_audit",
    name: "Free Home Energy Audit",
    category: "education",
    minTier: "D",
    estimatedCost: 0,
    estimatedMonthlyPayment: 0,
    annualSavings: 300,
    annualCO2ReductionLbs: 1500,
    financingTermYears: 0,
    description: "Discover where your home wastes energy — many utilities offer free audits.",
    longDescription:
      "A professional energy audit identifies where your home loses energy and prioritizes improvements by ROI. Many utility companies offer free or subsidized audits. Auditors use blower door tests, thermal cameras, and duct leakage tests to find hidden waste. Even without major renovations, audit recommendations (like adjusting water heater temperature or sealing obvious leaks) can save $200-$500/year.",
    icon: "ClipboardCheck",
    roiYears: 0,
    difficulty: "easy",
  },
  {
    id: "composting",
    name: "Home Composting Setup",
    category: "lifestyle",
    minTier: "D",
    estimatedCost: 50,
    estimatedMonthlyPayment: 0,
    annualSavings: 100,
    annualCO2ReductionLbs: 500,
    financingTermYears: 0,
    description: "Turn food waste into garden gold and reduce methane emissions.",
    longDescription:
      "Food waste in landfills produces methane, a greenhouse gas 80x more potent than CO2 over 20 years. Home composting diverts 200-400 lbs of food waste annually, producing rich soil amendment. Basic setups (bin + browns/greens) cost under $50. Indoor worm composting (vermicomposting) works for apartments. Many cities offer free composting workshops and discounted bins.",
    icon: "Sprout",
    roiYears: 0.5,
    difficulty: "easy",
  },
  {
    id: "green_bank_account",
    name: "Green Banking / Divestment",
    category: "lifestyle",
    minTier: "D",
    estimatedCost: 0,
    estimatedMonthlyPayment: 0,
    annualSavings: 0,
    annualCO2ReductionLbs: 2000,
    financingTermYears: 0,
    description: "Move your money to banks that don't fund fossil fuels.",
    longDescription:
      "The average bank account indirectly finances ~2 tons of CO2 annually through fossil fuel lending. Banks like Aspiration, Atmos Financial, and credit unions committed to fossil-fuel-free lending redirect your deposits toward clean energy and community development. Some offer cash-back rewards for sustainable purchases. Switching takes about 30 minutes and has zero financial downside — many green banks offer competitive or better rates.",
    icon: "Landmark",
    roiYears: 0,
    difficulty: "easy",
  },
];

// Filter investments by tier (returns all investments at or below the user's tier)
const tierOrder: Record<string, number> = { D: 0, C: 1, B: 2, A: 3 };

export function getRecommendedInvestments(
  userTier: "A" | "B" | "C" | "D"
): GreenInvestment[] {
  const userTierLevel = tierOrder[userTier];
  return greenInvestments
    .filter((inv) => tierOrder[inv.minTier] <= userTierLevel)
    .sort(
      (a, b) =>
        b.annualCO2ReductionLbs - a.annualCO2ReductionLbs ||
        a.roiYears - b.roiYears
    );
}

export function getCategoryLabel(category: GreenInvestment["category"]): string {
  const labels: Record<string, string> = {
    energy: "Energy",
    transportation: "Transportation",
    home: "Home",
    lifestyle: "Lifestyle",
    education: "Education",
  };
  return labels[category];
}

export function getCategoryColor(category: GreenInvestment["category"]): string {
  const colors: Record<string, string> = {
    energy: "bg-amber-100 text-amber-800",
    transportation: "bg-sky-100 text-sky-800",
    home: "bg-emerald-100 text-emerald-800",
    lifestyle: "bg-violet-100 text-violet-800",
    education: "bg-rose-100 text-rose-800",
  };
  return colors[category];
}
