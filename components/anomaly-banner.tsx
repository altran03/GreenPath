"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Pencil,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Anomaly, AnomalyReport } from "@/lib/anomaly-detection";

interface AnomalyBannerProps {
  anomalyReport: AnomalyReport;
  originalForm: Record<string, string>;
  onResubmit: (correctedForm: Record<string, string>) => void;
  resubmitting: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  middleName: "Middle Name",
  ssn: "SSN",
  birthDate: "Date of Birth",
  addressLine1: "Address Line 1",
  addressLine2: "Address Line 2",
  city: "City",
  state: "State",
  postalCode: "ZIP Code",
  phone: "Phone Number",
  email: "Email Address",
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  firstName: "JOHN",
  lastName: "DOE",
  ssn: "666XXXXXX",
  birthDate: "1990-01-01",
  addressLine1: "123 Main St",
  city: "San Francisco",
  state: "CA",
  postalCode: "94103",
  phone: "5031234567",
  email: "user@example.com",
};

export function AnomalyBanner({ anomalyReport, originalForm, onResubmit, resubmitting }: AnomalyBannerProps) {
  const [expanded, setExpanded] = useState(true);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());

  if (!anomalyReport.hasAnomalies) return null;

  const { anomalies, hasCritical } = anomalyReport;

  function toggleEdit(field: string) {
    const next = new Set(editingFields);
    if (next.has(field)) {
      next.delete(field);
      // Remove correction if reverting
      const nextCorr = { ...corrections };
      delete nextCorr[field];
      setCorrections(nextCorr);
    } else {
      next.add(field);
      // Pre-fill with suggested value or original
      if (!corrections[field]) {
        const anomaly = anomalies.find((a) => a.field === field);
        setCorrections({
          ...corrections,
          [field]: anomaly?.suggestedValue || originalForm[field] || "",
        });
      }
    }
    setEditingFields(next);
  }

  function updateCorrection(field: string, value: string) {
    setCorrections({ ...corrections, [field]: value });
  }

  function handleResubmit() {
    const correctedForm = { ...originalForm, ...corrections };
    onResubmit(correctedForm);
  }

  const correctionCount = Object.keys(corrections).filter(
    (k) => corrections[k] !== originalForm[k]
  ).length;

  return (
    <Card className={`rounded-2xl border-2 overflow-hidden animate-fade-up ${
      hasCritical
        ? "border-red-300 bg-red-50/60"
        : "border-amber-300 bg-amber-50/60"
    }`}>
      <CardContent className="p-0">
        {/* Header bar */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${
            hasCritical
              ? "hover:bg-red-100/60"
              : "hover:bg-amber-100/60"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${hasCritical ? "bg-red-100" : "bg-amber-100"}`}>
              {hasCritical ? (
                <ShieldAlert className="w-5 h-5 text-red-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="text-left">
              <h3 className={`font-heading text-base ${hasCritical ? "text-red-800" : "text-amber-800"}`}>
                {anomalies.length} Anomal{anomalies.length === 1 ? "y" : "ies"} Detected
              </h3>
              <p className={`text-xs ${hasCritical ? "text-red-600" : "text-amber-600"}`}>
                {hasCritical
                  ? "Critical issues found — please review and correct the flagged information"
                  : "Minor inconsistencies detected — review recommended"}
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className={`w-5 h-5 ${hasCritical ? "text-red-400" : "text-amber-400"}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${hasCritical ? "text-red-400" : "text-amber-400"}`} />
          )}
        </button>

        {/* Expanded anomaly list */}
        {expanded && (
          <div className="px-6 pb-6 space-y-4">
            {anomalies.map((anomaly) => (
              <AnomalyItem
                key={anomaly.id}
                anomaly={anomaly}
                isEditing={editingFields.has(anomaly.field)}
                correctedValue={corrections[anomaly.field]}
                onToggleEdit={() => toggleEdit(anomaly.field)}
                onUpdateValue={(val) => updateCorrection(anomaly.field, val)}
              />
            ))}

            {/* Resubmit section */}
            <div className="pt-4 border-t border-dew/30 flex items-center justify-between gap-4">
              <p className="text-xs text-stone">
                {correctionCount > 0
                  ? `${correctionCount} field${correctionCount > 1 ? "s" : ""} corrected — resubmit to re-run verification`
                  : "Edit flagged fields above, then resubmit"}
              </p>
              <Button
                onClick={handleResubmit}
                disabled={correctionCount === 0 || resubmitting}
                className={`rounded-xl gap-2 text-sm px-5 ${
                  hasCritical
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
              >
                {resubmitting ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Re-verifying...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Re-verify with Corrections
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnomalyItem({
  anomaly,
  isEditing,
  correctedValue,
  onToggleEdit,
  onUpdateValue,
}: {
  anomaly: Anomaly;
  isEditing: boolean;
  correctedValue?: string;
  onToggleEdit: () => void;
  onUpdateValue: (val: string) => void;
}) {
  const isCritical = anomaly.severity === "critical";

  return (
    <div className={`p-4 rounded-xl border ${
      isCritical
        ? "border-red-200 bg-white/80"
        : "border-amber-200 bg-white/80"
    }`}>
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <div className="mt-0.5">
          {isCritical ? (
            <XCircle className="w-4 h-4 text-red-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Anomaly header */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${isCritical ? "text-red-800" : "text-amber-800"}`}>
              Anomaly detected in{" "}
              <span className="font-heading">{anomaly.fieldLabel}</span>
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium ${
              isCritical
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {anomaly.severity}
            </span>
          </div>

          {/* Message */}
          <p className="text-xs text-stone leading-relaxed mb-2">
            {anomaly.message}
          </p>

          {/* Source tag */}
          <span className="text-[10px] text-stone/60 uppercase tracking-wider">
            Source: {anomaly.source}
          </span>

          {/* Current value + edit */}
          <div className="mt-3">
            {!isEditing ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone">
                  You entered:{" "}
                  <span className={`font-mono ${isCritical ? "text-red-700" : "text-amber-700"}`}>
                    {anomaly.field === "ssn"
                      ? anomaly.userValue
                      : anomaly.userValue || "(empty)"}
                  </span>
                </span>
                {anomaly.field !== "ssn" && (
                  <button
                    onClick={onToggleEdit}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                      isCritical
                        ? "text-red-700 bg-red-100 hover:bg-red-200"
                        : "text-amber-700 bg-amber-100 hover:bg-amber-200"
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    Correct
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs text-grove font-medium">
                  Corrected {anomaly.fieldLabel}:
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={correctedValue || ""}
                    onChange={(e) => onUpdateValue(e.target.value)}
                    placeholder={FIELD_PLACEHOLDERS[anomaly.field] || "Enter corrected value"}
                    className="rounded-lg border-dew/60 focus:border-canopy focus:ring-canopy/20 text-sm h-9"
                    type={anomaly.field === "email" ? "email" : anomaly.field === "phone" ? "tel" : "text"}
                  />
                  <button
                    onClick={onToggleEdit}
                    className="text-xs text-stone hover:text-grove transition-colors whitespace-nowrap px-2"
                  >
                    Cancel
                  </button>
                </div>
                {anomaly.suggestedValue && (
                  <button
                    onClick={() => onUpdateValue(anomaly.suggestedValue!)}
                    className="text-xs text-canopy hover:text-canopy/80 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Use suggested: <span className="font-mono">{anomaly.suggestedValue}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
