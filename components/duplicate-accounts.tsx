"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Copy } from "lucide-react";
import type { DuplicateGroup } from "@/lib/duplicate-tradelines";

interface DuplicateAccountsProps {
  groups: DuplicateGroup[];
}

const BUREAU_LABELS: Record<string, string> = {
  experian: "Experian",
  transunion: "TransUnion",
  equifax: "Equifax",
};

export function DuplicateAccounts({ groups }: DuplicateAccountsProps) {
  if (groups.length === 0) return null;

  return (
    <Card className="rounded-2xl border-amber-200 bg-amber-50/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Copy className="w-5 h-5 text-amber-600" />
          <h3 className="font-heading text-lg text-grove">Duplicate account detection</h3>
        </div>
        <p className="text-sm text-stone mb-4">
          The same account may be reported more than once or under different names. Review below to avoid double-counting.
        </p>
        <ul className="space-y-4">
          {groups.map((group, gi) => (
            <li key={group.fingerprint} className="border border-dew/40 rounded-xl p-4 bg-white/80">
              <div className="font-medium text-grove text-sm mb-2">{group.suggestedLabel}</div>
              <ul className="text-xs text-stone space-y-1">
                {group.refs.map((ref, ri) => (
                  <li key={`${gi}-${ri}`}>
                    {BUREAU_LABELS[ref.bureau] ?? ref.bureau} (tradeline {ref.index + 1})
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
