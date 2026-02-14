"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { TreePine, Car, Leaf } from "lucide-react";
import { co2ToTrees, co2ToMilesNotDriven, formatNumber, formatCurrency, cumulativeSavings } from "@/lib/utils";
import type { GreenInvestment } from "@/lib/green-investments";

interface ImpactChartProps {
  investments: GreenInvestment[];
}

export function ImpactChart({ investments }: ImpactChartProps) {
  // Bar chart data
  const barData = investments
    .slice(0, 8)
    .map((inv) => ({
      name: inv.name.length > 18 ? inv.name.slice(0, 18) + "…" : inv.name,
      co2: inv.annualCO2ReductionLbs,
    }))
    .sort((a, b) => b.co2 - a.co2);

  // Summary stats
  const totalCO2 = investments.reduce((sum, inv) => sum + inv.annualCO2ReductionLbs, 0);
  const totalSavings = investments.reduce((sum, inv) => sum + inv.annualSavings, 0);
  const trees = co2ToTrees(totalCO2);
  const miles = co2ToMilesNotDriven(totalCO2);

  // Line chart data — cumulative savings
  const lineData = [1, 2, 3, 5, 10, 15, 20, 25].map((yr) => ({
    year: `${yr}yr`,
    savings: cumulativeSavings(totalSavings, yr),
  }));

  return (
    <div className="space-y-6">
      <p className="text-stone text-sm -mt-1">
        If you adopt all recommended actions below, your combined annual impact would look like this. Use these metrics to see how your choices add up and to compare with everyday references.
      </p>
      {/* Summary Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-dew/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-canopy/10 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-canopy" />
            </div>
            <div>
              <div className="font-heading text-2xl text-grove">
                {formatNumber(totalCO2)}
              </div>
              <div className="text-xs font-medium text-grove">lbs CO₂ saved/year</div>
              <div className="text-xs text-stone mt-0.5">
                Total carbon avoided annually by all recommended actions — equivalent to a large share of a typical household’s direct emissions.
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-dew/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-canopy/10 flex items-center justify-center">
              <TreePine className="w-6 h-6 text-canopy" />
            </div>
            <div>
              <div className="font-heading text-2xl text-grove">
                {formatNumber(trees)}
              </div>
              <div className="text-xs font-medium text-grove">tree equivalents</div>
              <div className="text-xs text-stone mt-0.5">
                Same amount of CO₂ that this many mature trees absorb in a year — helps visualize your impact in a tangible way.
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-dew/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-canopy/10 flex items-center justify-center">
              <Car className="w-6 h-6 text-canopy" />
            </div>
            <div>
              <div className="font-heading text-2xl text-grove">
                {formatNumber(miles)}
              </div>
              <div className="text-xs font-medium text-grove">miles not driven</div>
              <div className="text-xs text-stone mt-0.5">
                Equivalent to avoiding this many miles in an average gasoline car — from tailpipe emissions you’re not adding to the atmosphere.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* CO2 Bar Chart */}
        <Card className="rounded-2xl border-dew/40">
          <CardContent className="p-6">
            <h4 className="font-semibold text-grove mb-1">CO₂ Reduction by Investment</h4>
            <p className="text-xs text-stone mb-4">
              Annual pounds of CO₂ avoided per action — prioritize longer bars for the biggest climate impact.
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8a7e72" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11, fill: "#5c4a3a" }}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${Number(value).toLocaleString()} lbs`, "CO₂/year"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2ddd6",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="co2" fill="#3d8b5e" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Savings Line Chart */}
        <Card className="rounded-2xl border-dew/40">
          <CardContent className="p-6">
            <h4 className="font-semibold text-grove mb-4">Cumulative Savings Over Time</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd6" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#8a7e72" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8a7e72" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [formatCurrency(Number(value)), "Savings"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2ddd6",
                      fontSize: "13px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    stroke="#e8a838"
                    strokeWidth={3}
                    dot={{ fill: "#e8a838", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      <p className="text-[11px] text-stone/80">
        Tree equivalents use ~48 lbs CO₂/year per mature tree; miles not driven use ~0.89 lbs CO₂/mile (EPA average passenger vehicle). Totals assume you adopt all recommended actions.
      </p>
    </div>
  );
}
