import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert lbs of CO2 to equivalent trees planted per year
// (avg tree absorbs ~48 lbs CO2/year)
export function co2ToTrees(lbs: number): number {
  return Math.round(lbs / 48);
}

// Convert lbs of CO2 to equivalent miles not driven
// (avg car emits ~0.89 lbs CO2/mile)
export function co2ToMilesNotDriven(lbs: number): number {
  return Math.round(lbs / 0.89);
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format large numbers with commas
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

// Calculate monthly payment for a loan
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (termYears === 0 || annualRate === 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  return Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

// Get estimated interest rate based on credit tier
export function getEstimatedRate(tier: "A" | "B" | "C" | "D"): number {
  const rates: Record<string, number> = { A: 5.5, B: 8.5, C: 14, D: 22 };
  return rates[tier];
}

// Calculate cumulative savings over years
export function cumulativeSavings(annualSavings: number, years: number): number {
  return annualSavings * years;
}

// Tier color mapping
export function getTierColor(tier: "A" | "B" | "C" | "D"): string {
  const colors: Record<string, string> = {
    A: "text-emerald-500",
    B: "text-blue-500",
    C: "text-amber-500",
    D: "text-red-400",
  };
  return colors[tier];
}

export function getTierBgColor(tier: "A" | "B" | "C" | "D"): string {
  const colors: Record<string, string> = {
    A: "bg-emerald-500",
    B: "bg-blue-500",
    C: "bg-amber-500",
    D: "bg-red-400",
  };
  return colors[tier];
}

export function getTierLabel(tier: "A" | "B" | "C" | "D"): string {
  const labels: Record<string, string> = {
    A: "Excellent",
    B: "Good",
    C: "Fair",
    D: "Building",
  };
  return labels[tier];
}
