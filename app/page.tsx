import Link from "next/link";
import { Leaf, Brain, BarChart3, ArrowRight, Shield, TreePine, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen organic-bg">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-grove flex items-center justify-center">
              <Leaf className="w-5 h-5 text-meadow" />
            </div>
            <span className="font-heading text-2xl text-grove tracking-tight">
              GreenPath
            </span>
          </div>
          <Link href="/assess">
            <Button
              variant="outline"
              className="rounded-full border-grove/20 text-grove hover:bg-grove hover:text-white transition-all duration-300"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-[10%] w-72 h-72 rounded-full bg-canopy/5 blur-3xl animate-float" />
        <div className="absolute bottom-10 left-[5%] w-96 h-96 rounded-full bg-sunbeam/5 blur-3xl animate-float delay-500" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dawn border border-dew/60 text-grove-light text-sm font-medium mb-8">
              <TreePine className="w-4 h-4" />
              Built for SF Hacks 2026 — &quot;Tech for a Greener Tomorrow&quot;
            </div>
          </div>

          <h1 className="animate-fade-up delay-100 font-heading text-5xl sm:text-6xl md:text-7xl leading-[1.05] text-grove mb-6">
            Your Personalized Path to a{" "}
            <span className="gradient-text">Greener Tomorrow</span>
          </h1>

          <p className="animate-fade-up delay-200 text-lg sm:text-xl text-soil/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Wrong credit data leads to wrong decisions. We verify your credit across all three bureaus, catch errors and fraud, then show you sustainable financing you actually qualify for.
          </p>

          <div className="animate-fade-up delay-300 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/assess">
              <Button
                size="lg"
                className="rounded-full bg-grove hover:bg-grove-light text-white px-8 py-6 text-lg font-medium shadow-lg shadow-grove/20 hover:shadow-xl hover:shadow-grove/30 transition-all duration-300 group"
              >
                Check My Green Readiness
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <span className="text-sm text-stone flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Soft pull only — no impact to your credit score
            </span>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="animate-fade-up delay-400 group relative rounded-2xl bg-white/80 backdrop-blur-sm border border-dew/40 p-8 hover:shadow-lg hover:shadow-canopy/10 transition-all duration-500 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-dawn flex items-center justify-center mb-6 group-hover:bg-canopy/10 transition-colors duration-300">
                <Shield className="w-7 h-7 text-canopy" />
              </div>
              <h3 className="font-heading text-2xl text-grove mb-3">
                Verify First
              </h3>
              <p className="text-soil/70 leading-relaxed">
                We pull from all three bureaus, verify identity, and run fraud checks so your credit picture is accurate before we show you what you qualify for.
              </p>
            </div>

            {/* Card 2 */}
            <div className="animate-fade-up delay-500 group relative rounded-2xl bg-white/80 backdrop-blur-sm border border-dew/40 p-8 hover:shadow-lg hover:shadow-canopy/10 transition-all duration-500 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-dawn flex items-center justify-center mb-6 group-hover:bg-canopy/10 transition-colors duration-300">
                <Brain className="w-7 h-7 text-canopy" />
              </div>
              <h3 className="font-heading text-2xl text-grove mb-3">
                AI-Personalized
              </h3>
              <p className="text-soil/70 leading-relaxed">
                Google Gemini generates tailored green investment advice
                matched to your unique financial situation.
              </p>
            </div>

            {/* Card 3 */}
            <div className="animate-fade-up delay-600 group relative rounded-2xl bg-white/80 backdrop-blur-sm border border-dew/40 p-8 hover:shadow-lg hover:shadow-canopy/10 transition-all duration-500 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-dawn flex items-center justify-center mb-6 group-hover:bg-canopy/10 transition-colors duration-300">
                <BarChart3 className="w-7 h-7 text-canopy" />
              </div>
              <h3 className="font-heading text-2xl text-grove mb-3">
                Real Impact
              </h3>
              <p className="text-soil/70 leading-relaxed">
                See exactly how much CO&#8322; and money you&apos;ll save with each
                green action — in pounds, trees, and dollars.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl text-grove mb-16">
            How it works
          </h2>

          <div className="grid sm:grid-cols-3 gap-12 relative">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-dew via-canopy/30 to-dew" />

            {[
              { step: "01", title: "Pull your report", desc: "We pull from all three bureaus (soft pull), verify your identity, and check for fraud and discrepancies." },
              { step: "02", title: "Clean credit picture", desc: "If we find mismatches, you review and correct them. Then you see your verified credit profile." },
              { step: "03", title: "What you qualify for", desc: "Based on that profile, we show sustainable financing options you’re eligible for and a roadmap to unlock more." },
            ].map((item, i) => (
              <div key={item.step} className={`animate-fade-up delay-${(i + 4) * 100} relative`}>
                <div className="w-16 h-16 rounded-full bg-grove text-white font-heading text-2xl flex items-center justify-center mx-auto mb-5 relative z-10">
                  {item.step}
                </div>
                <h3 className="font-semibold text-grove text-lg mb-2">{item.title}</h3>
                <p className="text-soil/70 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl bg-grove p-12 sm:p-16 relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-meadow blur-2xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-sunbeam blur-3xl" />
            </div>

            <div className="relative z-10">
              <Zap className="w-10 h-10 text-honey mx-auto mb-6" />
              <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4">
                Ready to find your green path?
              </h2>
              <p className="text-meadow/80 mb-8 max-w-lg mx-auto">
                Join the movement toward sustainable living — starting with what
                you can afford today.
              </p>
              <Link href="/assess">
                <Button
                  size="lg"
                  className="rounded-full bg-sunbeam hover:bg-honey text-grove px-8 py-6 text-lg font-semibold shadow-lg transition-all duration-300"
                >
                  Get Started — It&apos;s Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-dew/40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-canopy" />
            <span>Built for SF Hacks 2026</span>
          </div>
          <p>Powered by CRS Credit API &amp; Gemini via OpenRouter</p>
        </div>
      </footer>
    </div>
  );
}
