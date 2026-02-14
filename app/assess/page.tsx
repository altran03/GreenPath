"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  ArrowLeft,
  Shield,
  Loader2,
  CheckCircle2,
  ChevronDown,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateGreenReadiness, extractCreditData } from "@/lib/green-scoring";
import { getRecommendedInvestments } from "@/lib/green-investments";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const TEST_PERSONAS = [
  {
    label: "Diane Barabas (CA)",
    firstName: "DIANE",
    lastName: "BARABAS",
    middleName: "",
    ssn: "666283370",
    birthDate: "",
    addressLine1: "19955 N MADERA AVE",
    city: "KERMAN",
    state: "CA",
    postalCode: "93630",
  },
  {
    label: "Natalie A Black (KY)",
    firstName: "NATALIE",
    middleName: "A",
    lastName: "BLACK",
    ssn: "666207378",
    birthDate: "",
    addressLine1: "46 E 41ST ST # 2",
    city: "COVINGTON",
    state: "KY",
    postalCode: "410151711",
  },
  {
    label: "Brose Bambiko (WA)",
    firstName: "BROSE",
    middleName: "",
    lastName: "BAMBIKO",
    ssn: "666328649",
    birthDate: "",
    addressLine1: "4711 247TH STREET CT E",
    city: "GRAHAM",
    state: "WA",
    postalCode: "983388337",
  },
  {
    label: "Eileen M Brady (NJ)",
    firstName: "EILEEN",
    middleName: "M",
    lastName: "BRADY",
    ssn: "666883007",
    birthDate: "1972-11-22",
    addressLine1: "31 LONDON CT",
    city: "PLEASANTVILLE",
    state: "NJ",
    postalCode: "082344434",
  },
  {
    label: "Eugene F Beaupre (CA)",
    firstName: "EUGENE",
    middleName: "F",
    lastName: "BEAUPRE",
    ssn: "666582109",
    birthDate: "1955-06-23",
    addressLine1: "5151 N CEDAR AVE APT 102",
    city: "FRESNO",
    state: "CA",
    postalCode: "937107453",
  },
];

interface FormData {
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string;
  ssn: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
}

const LOADING_STEPS = [
  "Authenticating with CRS...",
  "Pulling credit report (soft pull)...",
  "Calculating green readiness...",
  "Generating AI insights with Gemini...",
];

export default function AssessPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    firstName: "",
    middleName: "",
    lastName: "",
    birthDate: "",
    ssn: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [testMenuOpen, setTestMenuOpen] = useState(false);

  function fillTestData(persona: (typeof TEST_PERSONAS)[0]) {
    setForm({
      firstName: persona.firstName,
      middleName: persona.middleName,
      lastName: persona.lastName,
      birthDate: persona.birthDate,
      ssn: persona.ssn,
      addressLine1: persona.addressLine1,
      addressLine2: "",
      city: persona.city,
      state: persona.state,
      postalCode: persona.postalCode,
    });
    setTestMenuOpen(false);
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setLoadingStep(0);

    try {
      // Step 1: Authenticate
      setLoadingStep(0);
      const authRes = await fetch("/api/auth", { method: "POST" });
      if (!authRes.ok) {
        const data = await authRes.json();
        throw new Error(data.error || "Authentication failed");
      }

      // Step 2: Pull credit report
      setLoadingStep(1);
      const reportRes = await fetch("/api/credit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!reportRes.ok) {
        const data = await reportRes.json();
        throw new Error(data.error || "Credit report pull failed");
      }
      const creditReport = await reportRes.json();

      // Step 3: Calculate green readiness
      setLoadingStep(2);
      const creditData = extractCreditData(creditReport);
      const greenReadiness = calculateGreenReadiness(creditData);
      const investments = getRecommendedInvestments(greenReadiness.tier);

      // Step 4: Get Gemini analysis
      setLoadingStep(3);
      let geminiAnalysis = null;
      try {
        const analysisRes = await fetch("/api/green-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            greenReadiness,
            recommendedInvestments: investments,
          }),
        });
        if (analysisRes.ok) {
          geminiAnalysis = await analysisRes.json();
        }
      } catch {
        // Gemini failure is non-fatal
        console.warn("Gemini analysis failed, continuing without AI insights");
      }

      // Store results in sessionStorage and navigate
      const results = {
        userName: `${form.firstName} ${form.lastName}`,
        creditReport,
        greenReadiness,
        investments,
        geminiAnalysis,
      };
      sessionStorage.setItem("greenpath-results", JSON.stringify(results));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen organic-bg grid-pattern">
      {/* Header */}
      <nav className="glass-card border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-grove hover:text-grove-light transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-grove flex items-center justify-center">
                <Leaf className="w-4 h-4 text-meadow" />
              </div>
              <span className="font-heading text-xl text-grove">GreenPath</span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 text-sm text-canopy">
            <Shield className="w-4 h-4" />
            <span>Soft pull only</span>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="animate-fade-up text-center mb-10">
          <h1 className="font-heading text-4xl text-grove mb-3">
            Check Your Green Readiness
          </h1>
          <p className="text-soil/70">
            We&apos;ll pull your credit profile (soft pull — no score impact) and
            generate your personalized green investment roadmap.
          </p>
        </div>

        {/* Test Data Button */}
        <div className="animate-fade-up delay-100 mb-8 relative">
          <button
            type="button"
            onClick={() => setTestMenuOpen(!testMenuOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl border-2 border-dashed border-canopy/30 bg-dawn/50 hover:bg-dawn hover:border-canopy/50 transition-all text-sm text-grove-light"
          >
            <span className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Load Test Data (Sandbox Persona)
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${testMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {testMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-dew/60 overflow-hidden z-30 animate-scale-in">
              {TEST_PERSONAS.map((p) => (
                <button
                  key={p.ssn}
                  type="button"
                  onClick={() => fillTestData(p)}
                  className="w-full text-left px-5 py-3 hover:bg-dawn transition-colors text-sm border-b border-dew/30 last:border-0"
                >
                  <span className="font-medium text-grove">{p.label}</span>
                  <span className="text-stone ml-2">SSN: {p.ssn}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        <Card className="animate-fade-up delay-200 rounded-2xl border-dew/40 shadow-sm">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Row */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-grove font-medium text-sm mb-1.5 block">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    required
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="middleName" className="text-grove font-medium text-sm mb-1.5 block">
                    Middle Name
                  </Label>
                  <Input
                    id="middleName"
                    value={form.middleName}
                    onChange={(e) => updateField("middleName", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                    placeholder="M"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-grove font-medium text-sm mb-1.5 block">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    required
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* DOB + SSN */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birthDate" className="text-grove font-medium text-sm mb-1.5 block">
                    Date of Birth
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => updateField("birthDate", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                  />
                </div>
                <div>
                  <Label htmlFor="ssn" className="text-grove font-medium text-sm mb-1.5 block">
                    SSN *
                  </Label>
                  <Input
                    id="ssn"
                    required
                    value={form.ssn}
                    onChange={(e) => updateField("ssn", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                    placeholder="Sandbox SSNs start with 666"
                    type="password"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="addressLine1" className="text-grove font-medium text-sm mb-1.5 block">
                  Address Line 1 *
                </Label>
                <Input
                  id="addressLine1"
                  required
                  value={form.addressLine1}
                  onChange={(e) => updateField("addressLine1", e.target.value)}
                  className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <Label htmlFor="addressLine2" className="text-grove font-medium text-sm mb-1.5 block">
                  Address Line 2
                </Label>
                <Input
                  id="addressLine2"
                  value={form.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                  className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                  placeholder="Apt 4B"
                />
              </div>

              {/* City, State, ZIP */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city" className="text-grove font-medium text-sm mb-1.5 block">
                    City *
                  </Label>
                  <Input
                    id="city"
                    required
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                    placeholder="San Francisco"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-grove font-medium text-sm mb-1.5 block">
                    State *
                  </Label>
                  <Select value={form.state} onValueChange={(v) => updateField("state", v)}>
                    <SelectTrigger className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="postalCode" className="text-grove font-medium text-sm mb-1.5 block">
                    ZIP Code *
                  </Label>
                  <Input
                    id="postalCode"
                    required
                    value={form.postalCode}
                    onChange={(e) => updateField("postalCode", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                    placeholder="94103"
                  />
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-dawn/50 border border-dew/40">
                <Shield className="w-5 h-5 text-canopy mt-0.5 shrink-0" />
                <p className="text-sm text-grove-light leading-relaxed">
                  This is a <strong>soft pull</strong> and will{" "}
                  <strong>NOT affect your credit score</strong>. We use the CRS
                  Experian Prequal endpoint which performs a promotional inquiry
                  only.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Submit / Loading */}
              {!loading ? (
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl bg-grove hover:bg-grove-light text-white py-6 text-lg font-medium shadow-md shadow-grove/15 hover:shadow-lg transition-all duration-300"
                >
                  Analyze My Green Readiness
                </Button>
              ) : (
                <div className="space-y-3 py-4">
                  {LOADING_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                        i < loadingStep
                          ? "text-canopy"
                          : i === loadingStep
                          ? "text-grove font-medium"
                          : "text-stone/50"
                      }`}
                    >
                      {i < loadingStep ? (
                        <CheckCircle2 className="w-5 h-5 text-canopy" />
                      ) : i === loadingStep ? (
                        <Loader2 className="w-5 h-5 animate-spin text-grove" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-dew" />
                      )}
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
