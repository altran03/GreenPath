"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  ArrowLeft,
  Shield,
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
import { isDemoPersona } from "@/lib/demo-persona";

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
  {
    label: "Fabrice G Bernabe (IN)",
    firstName: "FABRICE",
    middleName: "G",
    lastName: "BERNABE",
    ssn: "666364064",
    birthDate: "",
    addressLine1: "1299 W MAIN ST",
    addressLine2: " ",
    city: "DANVILLE",
    state: "IN",
    postalCode: "461227953",
  },
  {
    label: "Nancy A Bateson (WV)",
    firstName: "NANCY",
    middleName: "A",
    lastName: "BATESON",
    ssn: "666741865",
    birthDate: "1968-02-26",
    addressLine1: "2016 ROXALANA RD",
    addressLine2: " ",
    city: "DUNBAR",
    state: "WV",
    postalCode: "250641829",
  },
  {
    label: "Sergio Bernal (TX)",
    firstName: "SERGIO",
    middleName: "",
    lastName: "BERNAL",
    ssn: "666362447",
    birthDate: "1953-08-05",
    addressLine1: "5110 SUE AVE",
    addressLine2: " ",
    city: "GROVES",
    state: "TX",
    postalCode: "776193125",
  },
  {
    label: "Theresa A Bloom Jr (NY)",
    firstName: "THERESA",
    middleName: "A",
    lastName: "BLOOM",
    suffix: "JR",
    ssn: "666583205",
    birthDate: "",
    addressLine1: "1401 JEFFERSON ST",
    addressLine2: " ",
    city: "FLORAL PARK",
    state: "NY",
    postalCode: "110013724",
  },
  {
    label: "Demo: Anomaly → Corrected (Sponsor)",
    firstName: "ALEX",
    middleName: "",
    lastName: "DEMO",
    ssn: "111111111",
    birthDate: "1985-06-15",
    addressLine1: "456 OLD AVE",
    city: "OAKLAND",
    state: "CA",
    postalCode: "94601",
  },
  {
    label: "John Cope (CA) — FlexID",
    firstName: "JOHN",
    middleName: "",
    lastName: "COPE",
    ssn: "574709961",
    birthDate: "1973-08-01",
    addressLine1: "511 SYCAMORE AVE",
    city: "HAYWARD",
    state: "CA",
    postalCode: "94544",
    phone: "5105811251",
  },
  {
    label: "Natalie Korzec (WA) — FlexID",
    firstName: "NATALIE",
    middleName: "",
    lastName: "KORZEC",
    ssn: "7537",
    birthDate: "1940-12-23",
    addressLine1: "801 E OGDEN 1011",
    city: "VAUGHN",
    state: "WA",
    postalCode: "98394",
    phone: "5031234567",
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
  phone: string;
  email: string;
  availableSavings: string;
}

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
    phone: "",
    email: "",
    availableSavings: "",
  });
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
      addressLine2: "addressLine2" in persona ? persona.addressLine2 ?? "" : "",
      city: persona.city,
      state: persona.state,
      postalCode: persona.postalCode,
      phone: "phone" in persona && (persona as Record<string, unknown>).phone ? String((persona as Record<string, unknown>).phone) : "5031234567",
      email: "email" in persona && (persona as Record<string, unknown>).email ? String((persona as Record<string, unknown>).email) : "example@atdata.com",
      availableSavings: isDemoPersona({ firstName: persona.firstName, lastName: persona.lastName, ssn: persona.ssn }) ? "15000" : "",
    });
    setTestMenuOpen(false);
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.firstName || !form.lastName || !form.ssn || !form.addressLine1 || !form.city || !form.state || !form.postalCode) {
      setError("Please fill in all required fields.");
      return;
    }

    // Store form data and redirect to loading screen
    sessionStorage.setItem("greenpath-pending", JSON.stringify(form));
    router.push("/loading");
  }

  return (
    <div className="min-h-screen organic-bg grid-pattern">
      {/* Header */}
      <nav className="glass-card border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-grove hover:text-grove-light hover:bg-white/10 transition-colors"
              aria-label="Back to landing"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-grove hover:text-grove-light transition-colors"
              aria-label="GreenPath home"
            >
              <div className="w-7 h-7 rounded-lg bg-grove flex items-center justify-center">
                <Leaf className="w-4 h-4 text-meadow" />
              </div>
              <span className="font-heading text-xl text-grove">GreenPath</span>
            </Link>
          </div>
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
            We pull your tri-bureau credit profile (soft pull — no score impact), verify your identity and run fraud checks, then use your real credit picture to show which sustainable financing you qualify for.
          </p>
        </div>

        {/* Test Data Button */}
        <div className="animate-fade-up delay-100 mb-8 relative z-40">
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
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-dew/60 overflow-hidden z-50 animate-scale-in">
              {TEST_PERSONAS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => fillTestData(p)}
                  className="w-full text-left px-5 py-3 hover:bg-dawn transition-colors text-sm border-b border-dew/30 last:border-0"
                >
                  <span className="font-medium text-grove">{p.label}</span>
                  <span className="text-stone ml-2">{p.ssn ? `SSN: ${p.ssn}` : "DOB only"}</span>
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

              {/* Phone + Email (for FlexID + Fraud Finder) */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-grove font-medium text-sm mb-1.5 block">
                    Phone (for verification)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                    placeholder="5031234567"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-grove font-medium text-sm mb-1.5 block">
                    Email (for fraud check)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20"
                    placeholder="example@atdata.com"
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

              {/* Available Savings */}
              <div className="pt-2 border-t border-dew/30">
                <Label htmlFor="availableSavings" className="text-grove font-medium text-sm mb-1.5 block">
                  Available Savings (optional)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone text-sm">$</span>
                  <Input
                    id="availableSavings"
                    type="number"
                    min="0"
                    value={form.availableSavings}
                    onChange={(e) => updateField("availableSavings", e.target.value)}
                    className="rounded-xl border-dew/60 focus:border-canopy focus:ring-canopy/20 pl-7"
                    placeholder="e.g. 10000"
                  />
                </div>
                <p className="text-xs text-stone mt-1.5">
                  Self-reported — helps us show which green investments you can pay upfront vs. finance. Not sent to any credit bureau.
                </p>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-dawn/50 border border-dew/40">
                <Shield className="w-5 h-5 text-canopy mt-0.5 shrink-0" />
                <p className="text-sm text-grove-light leading-relaxed">
                  This is a <strong>soft pull</strong> and will{" "}
                  <strong>NOT affect your credit score</strong>. We pull from
                  all 3 bureaus (Experian, TransUnion, Equifax) for a complete
                  picture. Identity is verified via LexisNexis FlexID and fraud
                  signals are checked via CRS Fraud Finder.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-xl bg-grove hover:bg-grove-light text-white py-6 text-lg font-medium shadow-md shadow-grove/15 hover:shadow-lg transition-all duration-300"
              >
                Analyze My Green Readiness
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
