"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sprout, Cloud, TreePine, Car, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { GreenInvestment } from "@/lib/green-investments";

// --- Conversion constants ---
const LBS_CO2_PER_TREE_PER_YEAR = 48;
const LBS_CO2_PER_MILE = 0.89;
const AVG_MILES_PER_CAR_PER_YEAR = 12_000;

// --- Animated counter hook ---
function useAnimatedCounter(
  target: number,
  duration = 2000,
  delay = 300
): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  const animate = useCallback(() => {
    const start = performance.now() + delay;

    const tick = (now: number) => {
      const elapsed = now - start;

      if (elapsed < 0) {
        // still in delay period
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const t = Math.min(elapsed / duration, 1);
      // quadratic ease-out: 1 - (1 - t)^2
      const eased = 1 - (1 - t) * (1 - t);
      const current = Math.round(eased * target);

      setDisplay(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [target, duration, delay]);

  useEffect(() => {
    if (target === 0) {
      setDisplay(0);
      return;
    }

    animate();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, animate]);

  return display;
}

// --- Impact card config ---
interface ImpactMetric {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  cardBg: string;
  format: (n: number) => string;
}

interface ImpactVisualizerProps {
  investments: GreenInvestment[];
}

export function ImpactVisualizer({ investments }: ImpactVisualizerProps) {
  // Compute totals
  const totalCO2 = investments.reduce(
    (sum, inv) => sum + inv.annualCO2ReductionLbs,
    0
  );
  const totalSavings = investments.reduce(
    (sum, inv) => sum + inv.annualSavings,
    0
  );
  const treesEquivalent = Math.round(totalCO2 / LBS_CO2_PER_TREE_PER_YEAR);
  const milesNotDriven = Math.round(totalCO2 / LBS_CO2_PER_MILE);
  const carsOffRoad = Math.max(
    1,
    Math.round(milesNotDriven / AVG_MILES_PER_CAR_PER_YEAR)
  );

  // Animated values
  const animCO2 = useAnimatedCounter(totalCO2);
  const animTrees = useAnimatedCounter(treesEquivalent);
  const animMiles = useAnimatedCounter(milesNotDriven);
  const animSavings = useAnimatedCounter(totalSavings);

  const metrics: ImpactMetric[] = [
    {
      label: "lbs CO\u2082 saved / year",
      value: animCO2,
      icon: <Cloud className="w-5 h-5 text-emerald-700" />,
      iconBg: "bg-emerald-100",
      cardBg: "bg-emerald-50/60",
      format: (n) => n.toLocaleString(),
    },
    {
      label: "trees equivalent",
      value: animTrees,
      icon: <TreePine className="w-5 h-5 text-green-700" />,
      iconBg: "bg-green-100",
      cardBg: "bg-green-50/60",
      format: (n) => n.toLocaleString(),
    },
    {
      label: "miles not driven",
      value: animMiles,
      icon: <Car className="w-5 h-5 text-teal-700" />,
      iconBg: "bg-teal-100",
      cardBg: "bg-teal-50/60",
      format: (n) => n.toLocaleString(),
    },
    {
      label: "annual savings",
      value: animSavings,
      icon: <DollarSign className="w-5 h-5 text-lime-700" />,
      iconBg: "bg-lime-100",
      cardBg: "bg-lime-50/60",
      format: (n) => formatCurrency(n),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-canopy/10 flex items-center justify-center">
          <Sprout className="w-5 h-5 text-canopy" />
        </div>
        <h3 className="font-heading text-xl text-grove font-semibold">
          Your Green Impact
        </h3>
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className={`rounded-xl border-dew/40 ${metric.cardBg}`}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2.5">
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${metric.iconBg}`}
              >
                {metric.icon}
              </div>

              {/* Animated number */}
              <div className="text-2xl sm:text-3xl font-bold text-grove tabular-nums">
                {metric.format(metric.value)}
              </div>

              {/* Label */}
              <div className="text-xs text-stone font-medium leading-tight">
                {metric.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary sentence */}
      <p className="text-sm text-stone italic text-center">
        That&apos;s like planting{" "}
        <span className="font-semibold text-grove">
          {treesEquivalent.toLocaleString()}
        </span>{" "}
        trees or taking{" "}
        <span className="font-semibold text-grove">
          {carsOffRoad.toLocaleString()}
        </span>{" "}
        {carsOffRoad === 1 ? "car" : "cars"} off the road for a year.
      </p>
    </div>
  );
}
