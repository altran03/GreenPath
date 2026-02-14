"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { DataQualityReport as DataQualityReportType } from "@/lib/data-quality";

interface DataQualityReportProps {
  report: DataQualityReportType;
}

export function DataQualityReport({ report }: DataQualityReportProps) {
  const { score, findings, summary } = report;
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const infos = findings.filter((f) => f.severity === "info");

  return (
    <Card className="rounded-2xl border-dew/40">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="font-heading text-lg text-grove">Data quality</h3>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-heading ${
                score >= 80 ? "text-canopy" : score >= 60 ? "text-sunbeam" : "text-red-500"
              }`}
            >
              {score}
            </span>
            <span className="text-stone text-sm">/ 100</span>
          </div>
        </div>
        <p className="text-sm text-stone mb-4">{summary}</p>
        {findings.length > 0 && (
          <ul className="space-y-2">
            {errors.map((f, i) => (
              <li key={`e-${i}`} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-grove">{f.source}</span>
                  {f.bureau && <span className="text-stone"> ({f.bureau})</span>}
                  {f.field && <span className="text-stone"> · {f.field}</span>}: {f.message}
                </span>
              </li>
            ))}
            {warnings.map((f, i) => (
              <li key={`w-${i}`} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-grove">{f.source}</span>
                  {f.bureau && <span className="text-stone"> ({f.bureau})</span>}: {f.message}
                </span>
              </li>
            ))}
            {infos.map((f, i) => (
              <li key={`i-${i}`} className="flex items-start gap-2 text-sm text-stone">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{f.source}: {f.message}</span>
              </li>
            ))}
          </ul>
        )}
        {findings.length === 0 && (
          <div className="flex items-center gap-2 text-canopy text-sm">
            <CheckCircle2 className="w-4 h-4" />
            No issues found — data structure and formats look good.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
