"use client";

import { CreditCard, Percent, DollarSign, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { GreenReadiness } from "@/lib/green-scoring";

interface CreditSummaryProps {
  data: GreenReadiness;
}

export function CreditSummary({ data }: CreditSummaryProps) {
  const stats = [
    {
      label: "Credit Score",
      value: data.creditScore.toString(),
      sub: "VantageScore 4.0",
      icon: CreditCard,
      color: data.creditScore >= 670 ? "text-canopy" : data.creditScore >= 580 ? "text-sunbeam" : "text-red-400",
    },
    {
      label: "Credit Utilization",
      value: data.utilization >= 1 ? ">100%" : `${(data.utilization * 100).toFixed(0)}%`,
      sub: data.totalCreditLimit > 0
        ? `Revolving: ${formatCurrency(Math.round(data.utilization * data.totalCreditLimit))} of ${formatCurrency(data.totalCreditLimit)} · ${data.utilization < 0.3 ? "Healthy" : data.utilization < 0.5 ? "Moderate" : "Above recommended"}`
        : (data.utilization < 0.3 ? "Healthy range" : data.utilization < 0.5 ? "Moderate" : "Above recommended"),
      icon: Percent,
      color: data.utilization < 0.3 ? "text-canopy" : data.utilization < 0.5 ? "text-sunbeam" : "text-red-400",
    },
    {
      label: "Total Debt",
      value: formatCurrency(data.totalDebt),
      sub: "Across all account types",
      icon: DollarSign,
      color: "text-grove",
    },
    {
      label: "Open Accounts",
      value: formatNumber(data.tradelineCount),
      sub: data.tradelineCount >= 5 ? "Well-established" : "Building history",
      icon: Layers,
      color: data.tradelineCount >= 5 ? "text-canopy" : "text-sunbeam",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Card
          key={stat.label}
          className={`animate-fade-up rounded-2xl border-dew/40 overflow-hidden`}
          style={{ animationDelay: `${200 + i * 100}ms` }}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-stone">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className={`font-heading text-3xl ${stat.color} mb-1`}>
              {stat.value}
            </div>
            <p className="text-xs text-stone">{stat.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
