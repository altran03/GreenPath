"use client";

import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Fingerprint,
  ScanSearch,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FlexIDResult {
  verified: boolean;
  notRegistered?: boolean;
  riskScore?: number;
  summary: string;
}

interface FraudResult {
  riskLevel: "low" | "medium" | "high" | "unknown";
  signals: string[];
  summary: string;
}

interface VerificationBadgesProps {
  flexIdResult: FlexIDResult | null;
  fraudResult: FraudResult | null;
}

export function VerificationBadges({ flexIdResult, fraudResult }: VerificationBadgesProps) {
  const flexNotRegistered = flexIdResult?.notRegistered === true;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* FlexID Identity Verification */}
      <Card className={`rounded-2xl border overflow-hidden ${
        flexNotRegistered
          ? "border-slate-200 bg-slate-50/50"
          : flexIdResult?.verified
          ? "border-emerald-200 bg-emerald-50/50"
          : flexIdResult
          ? "border-amber-200 bg-amber-50/50"
          : "border-dew/40 bg-white/50"
      }`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${
              flexNotRegistered
                ? "bg-slate-100"
                : flexIdResult?.verified
                ? "bg-emerald-100"
                : flexIdResult
                ? "bg-amber-100"
                : "bg-stone/10"
            }`}>
              <Fingerprint className={`w-5 h-5 ${
                flexNotRegistered
                  ? "text-slate-400"
                  : flexIdResult?.verified
                  ? "text-emerald-600"
                  : flexIdResult
                  ? "text-amber-600"
                  : "text-stone"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading text-sm text-grove">Identity Verification</h3>
                {flexNotRegistered ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium">Not registered</span>
                ) : flexIdResult?.verified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : flexIdResult ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : (
                  <ShieldQuestion className="w-4 h-4 text-stone" />
                )}
              </div>
              <p className="text-xs text-stone leading-relaxed">
                {flexNotRegistered
                  ? "Identity not found in LexisNexis records — this is normal for some individuals"
                  : flexIdResult?.summary || "FlexID verification was not performed"}
              </p>
              <p className="text-[10px] text-stone/60 mt-1.5 uppercase tracking-wider">
                Powered by LexisNexis FlexID
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fraud Finder */}
      <Card className={`rounded-2xl border overflow-hidden ${
        fraudResult?.riskLevel === "low"
          ? "border-emerald-200 bg-emerald-50/50"
          : fraudResult?.riskLevel === "medium"
          ? "border-amber-200 bg-amber-50/50"
          : fraudResult?.riskLevel === "high"
          ? "border-red-200 bg-red-50/50"
          : "border-dew/40 bg-white/50"
      }`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${
              fraudResult?.riskLevel === "low"
                ? "bg-emerald-100"
                : fraudResult?.riskLevel === "medium"
                ? "bg-amber-100"
                : fraudResult?.riskLevel === "high"
                ? "bg-red-100"
                : "bg-stone/10"
            }`}>
              <ScanSearch className={`w-5 h-5 ${
                fraudResult?.riskLevel === "low"
                  ? "text-emerald-600"
                  : fraudResult?.riskLevel === "medium"
                  ? "text-amber-600"
                  : fraudResult?.riskLevel === "high"
                  ? "text-red-600"
                  : "text-stone"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading text-sm text-grove">Fraud Analysis</h3>
                {fraudResult?.riskLevel === "low" ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : fraudResult?.riskLevel === "medium" ? (
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                ) : fraudResult?.riskLevel === "high" ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <ShieldQuestion className="w-4 h-4 text-stone" />
                )}
              </div>
              <p className="text-xs text-stone leading-relaxed">
                {fraudResult?.summary || "Fraud analysis was not performed"}
              </p>
              {fraudResult?.signals && fraudResult.signals.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {fraudResult.signals.map((signal, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-grove border border-dew/40">
                      {signal}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-stone/60 mt-1.5 uppercase tracking-wider">
                Powered by CRS Fraud Finder
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
