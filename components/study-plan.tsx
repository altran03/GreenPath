"use client";

import { useState, useMemo, useCallback } from "react";
import {
  BarChart3,
  CreditCard,
  AlertTriangle,
  FileStack,
  Target,
  Leaf,
  BadgeDollarSign,
  Home,
  Car,
  Percent,
  GraduationCap,
  Sun,
  Landmark,
  Lightbulb,
  Bike,
  Thermometer,
  Shield,
  BookOpen,
  CheckCircle2,
  Clock,
  BrainCircuit,
  Loader2,
  XCircle,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { generateStudyPlan, type StudyPlanModule } from "@/lib/study-plan-engine";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import type { TradelineProfile, PersonalizedInvestment } from "@/lib/tradeline-intelligence";
import type { GeminiAnalysis, QuizQuestion } from "@/lib/gemini";

// ── Icon mapping ──

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3, CreditCard, AlertTriangle, FileStack, Target, Leaf,
  BadgeDollarSign, Home, Car, Percent, GraduationCap, Sun,
  Landmark, Lightbulb, Bike, Thermometer, Shield,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || BookOpen;
}

function getDifficultyStyle(d: string): string {
  switch (d) {
    case "beginner": return "bg-emerald-100 text-emerald-700";
    case "intermediate": return "bg-amber-100 text-amber-700";
    case "advanced": return "bg-rose-100 text-rose-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

function getCategoryLabel(c: string): string {
  switch (c) {
    case "credit-fundamentals": return "Credit Basics";
    case "credit-repair": return "Credit Repair";
    case "green-finance": return "Green Finance";
    case "green-action": return "Green Action";
    default: return c;
  }
}

// ── Quiz state ──

interface QuizState {
  questions: QuizQuestion[];
  answers: (number | null)[];
  revealed: boolean;
  loading: boolean;
  error: string | null;
}

// ── Props ──

interface StudyPlanProps {
  greenReadiness: GreenReadiness;
  geminiAnalysis: GeminiAnalysis | null;
  bureauScores: Record<string, number | null>;
  investments: GreenInvestment[];
  tradelineProfile?: TradelineProfile;
  personalizedInvestments?: PersonalizedInvestment[];
}

// ── Component ──

export function StudyPlan({
  greenReadiness,
  geminiAnalysis,
  bureauScores,
  investments,
  tradelineProfile,
}: StudyPlanProps) {
  const plan = useMemo(
    () =>
      generateStudyPlan({
        greenReadiness,
        tradelineProfile,
        bureauScores,
        investments,
        geminiAnalysis,
      }),
    [greenReadiness, tradelineProfile, bureauScores, investments, geminiAnalysis]
  );

  const [completed, setCompleted] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("greenpath-study-completed");
        if (saved) return new Set(JSON.parse(saved) as string[]);
      } catch { /* ignore */ }
    }
    return new Set();
  });

  // Selected module — default to first
  const [selectedId, setSelectedId] = useState<string>(
    () => plan.modules[0]?.module.id ?? ""
  );

  const selectedModule = plan.modules.find((m) => m.module.id === selectedId) ?? plan.modules[0];

  // Quiz state
  const [quizzes, setQuizzes] = useState<Record<string, QuizState>>({});

  const userProfile = useMemo(() => ({
    creditScore: greenReadiness.creditScore,
    tier: greenReadiness.tier,
    score: greenReadiness.score,
    utilization: `${Math.round(greenReadiness.utilization * 100)}%`,
    totalDebt: greenReadiness.totalDebt,
    totalCreditLimit: greenReadiness.totalCreditLimit,
    derogatoryCount: greenReadiness.derogatoryCount,
    tradelineCount: greenReadiness.tradelineCount,
    factors: greenReadiness.factors,
    bureauScores,
    ...(tradelineProfile ? {
      isRenter: tradelineProfile.isRenter,
      hasAutoLoan: tradelineProfile.hasAutoLoan,
      hasStudentLoan: tradelineProfile.hasStudentLoan,
      highUtilizationCards: tradelineProfile.highUtilizationCards,
      autoLoanBalance: tradelineProfile.autoLoanBalance,
      monthlyDebtPayments: tradelineProfile.monthlyDebtPayments,
    } : {}),
  }), [greenReadiness, bureauScores, tradelineProfile]);

  const fetchQuiz = useCallback(async (moduleId: string, title: string, content: string) => {
    setQuizzes((prev) => ({
      ...prev,
      [moduleId]: { questions: [], answers: [], revealed: false, loading: true, error: null },
    }));
    try {
      const res = await fetch("/api/study-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleTitle: title, moduleContent: content, userProfile }),
      });
      if (!res.ok) throw new Error("Failed to generate quiz");
      const data = await res.json() as { questions?: QuizQuestion[]; error?: string };
      if (data.error) throw new Error(data.error);
      const questions = data.questions || [];
      setQuizzes((prev) => ({
        ...prev,
        [moduleId]: {
          questions, answers: new Array(questions.length).fill(null),
          revealed: false, loading: false,
          error: questions.length === 0 ? "No quiz available right now" : null,
        },
      }));
    } catch (err) {
      setQuizzes((prev) => ({
        ...prev,
        [moduleId]: { questions: [], answers: [], revealed: false, loading: false, error: err instanceof Error ? err.message : "Quiz generation failed" },
      }));
    }
  }, [userProfile]);

  function selectAnswer(moduleId: string, qIdx: number, oIdx: number) {
    setQuizzes((prev) => {
      const quiz = prev[moduleId];
      if (!quiz || quiz.revealed) return prev;
      const answers = [...quiz.answers];
      answers[qIdx] = oIdx;
      return { ...prev, [moduleId]: { ...quiz, answers } };
    });
  }

  function revealQuiz(moduleId: string) {
    setQuizzes((prev) => {
      const quiz = prev[moduleId];
      if (!quiz) return prev;
      return { ...prev, [moduleId]: { ...quiz, revealed: true } };
    });
  }

  function toggleComplete(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem("greenpath-study-completed", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const completedCount = plan.modules.filter((m) => completed.has(m.module.id)).length;
  const progressValue = plan.moduleCount > 0 ? Math.round((completedCount / plan.moduleCount) * 100) : 0;

  // Group by week
  const weeks: { week: number; modules: StudyPlanModule[] }[] = [];
  for (let w = 1; w <= plan.totalWeeks; w++) {
    const wm = plan.modules.filter((m) => m.weekNumber === w);
    if (wm.length > 0) weeks.push({ week: w, modules: wm });
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header + progress */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-canopy/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-canopy" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-2xl text-grove">Your Study Plan</h2>
          <p className="text-stone text-sm">
            {plan.moduleCount} modules · {plan.totalWeeks} weeks · ~{plan.totalMinutes} min
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-medium text-grove">{completedCount}/{plan.moduleCount}</span>
          <p className="text-xs text-stone">completed</p>
        </div>
      </div>
      <Progress
        value={progressValue}
        className="h-2 bg-dew/40 [&>[data-slot=progress-indicator]]:bg-canopy"
      />

      {/* Sidebar + Content layout */}
      <div className="flex gap-5 min-h-[500px]">
        {/* ── Sidebar ── */}
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 scrollbar-thin">
          {weeks.map(({ week, modules: wm }) => {
            const weekDone = wm.every((m) => completed.has(m.module.id));
            return (
              <div key={week}>
                {/* Week label */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                    weekDone ? "bg-canopy text-white" : "bg-grove/10 text-grove"
                  }`}>
                    {weekDone ? <CheckCircle2 className="w-3 h-3" /> : week}
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${weekDone ? "text-canopy" : "text-stone"}`}>
                    Week {week}
                  </span>
                  <span className="text-[10px] text-stone/60">
                    {getCategoryLabel(wm[0]?.module.category || "")}
                  </span>
                </div>

                {/* Module items */}
                <div className="space-y-1">
                  {wm.map((spm) => {
                    const Icon = getIcon(spm.module.icon);
                    const isDone = completed.has(spm.module.id);
                    const isActive = selectedId === spm.module.id;

                    return (
                      <button
                        key={spm.module.id}
                        onClick={() => setSelectedId(spm.module.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          isActive
                            ? "bg-grove/10 border border-grove/20 shadow-sm"
                            : "hover:bg-dawn/50 border border-transparent"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isDone ? "bg-canopy/15" : isActive ? "bg-grove/10" : "bg-gray-100"
                        }`}>
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-canopy" />
                          ) : (
                            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-grove" : "text-stone/50"}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium leading-tight truncate ${
                            isDone ? "text-canopy" : isActive ? "text-grove" : "text-soil/70"
                          }`}>
                            {spm.personalizedTitle}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-medium px-1 py-px rounded ${getDifficultyStyle(spm.module.difficulty)}`}>
                              {spm.module.difficulty}
                            </span>
                            <span className="text-[9px] text-stone/50">{spm.module.estimatedMinutes}m</span>
                          </div>
                        </div>
                        {isActive && <ChevronRight className="w-3 h-3 text-grove/40 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Content Panel ── */}
        {selectedModule && (
          <div className="flex-1 min-w-0">
            <ContentPanel
              spm={selectedModule}
              isDone={completed.has(selectedModule.module.id)}
              quiz={quizzes[selectedModule.module.id]}
              onToggleComplete={() => toggleComplete(selectedModule.module.id)}
              onFetchQuiz={() => fetchQuiz(selectedModule.module.id, selectedModule.personalizedTitle, selectedModule.personalizedContent)}
              onSelectAnswer={(qIdx, oIdx) => selectAnswer(selectedModule.module.id, qIdx, oIdx)}
              onRevealQuiz={() => revealQuiz(selectedModule.module.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Content Panel (right side) ──

function ContentPanel({
  spm,
  isDone,
  quiz,
  onToggleComplete,
  onFetchQuiz,
  onSelectAnswer,
  onRevealQuiz,
}: {
  spm: StudyPlanModule;
  isDone: boolean;
  quiz: QuizState | undefined;
  onToggleComplete: () => void;
  onFetchQuiz: () => void;
  onSelectAnswer: (qIdx: number, oIdx: number) => void;
  onRevealQuiz: () => void;
}) {
  const Icon = getIcon(spm.module.icon);

  return (
    <Card className="rounded-2xl border-dew/40 h-full overflow-y-auto max-h-[calc(100vh-280px)]">
      <CardContent className="p-6 space-y-6">
        {/* Title bar */}
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isDone ? "bg-canopy/15" : "bg-grove/5"}`}>
            {isDone ? <CheckCircle2 className="w-6 h-6 text-canopy" /> : <Icon className="w-6 h-6 text-grove/60" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold ${isDone ? "text-canopy" : "text-grove"}`}>
              {spm.personalizedTitle}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getDifficultyStyle(spm.module.difficulty)}`}>
                {spm.module.difficulty}
              </span>
              <span className="text-xs text-stone flex items-center gap-1">
                <Clock className="w-3 h-3" />{spm.module.estimatedMinutes} min
              </span>
              <span className="text-xs text-stone">{spm.personalizedRelevance}</span>
            </div>
          </div>
          <button
            onClick={onToggleComplete}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              isDone
                ? "bg-canopy/10 text-canopy hover:bg-canopy/20"
                : "bg-grove/5 text-stone hover:bg-grove/10 hover:text-grove"
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${isDone ? "text-canopy" : "text-stone/40"}`} />
            {isDone ? "Done" : "Mark done"}
          </button>
        </div>

        {/* Highlight stat */}
        <div className="px-5 py-4 rounded-xl bg-grove/5 border border-dew/40">
          <p className="text-sm font-medium text-grove">{spm.personalizedHighlight}</p>
        </div>

        {/* Content */}
        <p className="text-sm text-soil/80 leading-relaxed">{spm.personalizedContent}</p>

        {/* Action items — laid out as a grid if multiple */}
        {spm.personalizedActionItems.filter((ai) => ai.text).length > 0 && (
          <div className={`grid gap-3 ${spm.personalizedActionItems.filter((ai) => ai.text).length > 1 ? "sm:grid-cols-2" : ""}`}>
            {spm.personalizedActionItems.map((ai, aiIdx) =>
              ai.text && (
                <div key={aiIdx} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-sunbeam/8 border border-sunbeam/20">
                  <Target className="w-4 h-4 text-sunbeam mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-sunbeam uppercase tracking-wider mb-1">Action Item</p>
                    <p className="text-sm text-soil/80 leading-relaxed">{ai.text}</p>
                    {ai.estimatedImpact && <p className="text-xs text-stone mt-1">{ai.estimatedImpact}</p>}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ── Quiz Section ── */}
        <QuizSection
          moduleId={spm.module.id}
          quiz={quiz}
          onFetch={onFetchQuiz}
          onSelect={onSelectAnswer}
          onReveal={onRevealQuiz}
        />
      </CardContent>
    </Card>
  );
}

// ── Quiz Section ──

function QuizSection({
  moduleId,
  quiz,
  onFetch,
  onSelect,
  onReveal,
}: {
  moduleId: string;
  quiz: QuizState | undefined;
  onFetch: () => void;
  onSelect: (qIdx: number, oIdx: number) => void;
  onReveal: () => void;
}) {
  if (!quiz) {
    return (
      <button
        onClick={onFetch}
        className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-grove/5 border border-grove/15 text-sm font-medium text-grove hover:bg-grove/10 transition-colors w-full justify-center"
      >
        <BrainCircuit className="w-4 h-4" />
        Take Quiz — Test Your Knowledge
      </button>
    );
  }

  if (quiz.loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-5 py-8 rounded-xl bg-grove/5 border border-grove/15">
        <Loader2 className="w-4 h-4 text-grove animate-spin" />
        <span className="text-sm text-grove">Generating personalized quiz...</span>
      </div>
    );
  }

  if (quiz.error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
        <XCircle className="w-4 h-4 shrink-0" />
        {quiz.error}
      </div>
    );
  }

  if (quiz.questions.length === 0) return null;

  return (
    <div className="rounded-xl border border-grove/15 overflow-hidden">
      {/* Quiz header */}
      <div className="flex items-center gap-2 px-5 py-3 bg-grove/5 border-b border-grove/15">
        <BrainCircuit className="w-4 h-4 text-grove" />
        <span className="text-sm font-semibold text-grove">Knowledge Check</span>
        {quiz.revealed && (
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-canopy/10 text-canopy">
            {quiz.answers.filter((a, i) => a === quiz.questions[i].correctIndex).length}/{quiz.questions.length} correct
          </span>
        )}
      </div>

      {/* Questions — horizontal grid layout for spread */}
      <div className="p-5 grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
        {quiz.questions.map((q, qIdx) => {
          const selected = quiz.answers[qIdx];
          const isCorrect = selected === q.correctIndex;
          const isRevealed = quiz.revealed;

          return (
            <div key={qIdx} className="space-y-2.5">
              <p className="text-sm font-medium text-grove leading-snug">
                {qIdx + 1}. {q.question}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, oIdx) => {
                  const isSelected = selected === oIdx;
                  const isAnswer = q.correctIndex === oIdx;

                  let style = "bg-white border-dew/40 text-soil hover:border-grove/30 hover:bg-dawn/30 cursor-pointer";
                  if (isSelected && !isRevealed) style = "bg-grove/10 border-grove/30 text-grove ring-1 ring-grove/20 cursor-pointer";
                  if (isRevealed) {
                    if (isAnswer) style = "bg-emerald-50 border-emerald-300 text-emerald-800";
                    else if (isSelected && !isCorrect) style = "bg-red-50 border-red-300 text-red-700";
                    else style = "bg-gray-50 border-gray-200 text-gray-400";
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => !isRevealed && onSelect(qIdx, oIdx)}
                      disabled={isRevealed}
                      className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-all w-full ${style}`}
                    >
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 mt-px ${
                        isRevealed && isAnswer ? "bg-emerald-500 border-emerald-500 text-white" :
                        isRevealed && isSelected && !isCorrect ? "bg-red-400 border-red-400 text-white" :
                        isSelected && !isRevealed ? "bg-grove border-grove text-white" :
                        "border-gray-300 text-gray-400"
                      }`}>
                        {isRevealed && isAnswer ? "✓" :
                         isRevealed && isSelected && !isCorrect ? "✗" :
                         String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {isRevealed && q.explanation && (
                <p className={`text-[11px] px-2.5 py-1.5 rounded-lg ${isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {isCorrect ? "Correct! " : ""}{q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="px-5 pb-4">
        {!quiz.revealed ? (
          <button
            onClick={onReveal}
            disabled={quiz.answers.some((a) => a === null)}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
              quiz.answers.some((a) => a === null)
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-grove text-white hover:bg-grove-light"
            }`}
          >
            Check Answers
          </button>
        ) : (
          <p className="text-center text-sm text-stone py-1">
            {quiz.answers.filter((a, i) => a === quiz.questions[i].correctIndex).length === quiz.questions.length
              ? "Perfect score! You've mastered this module."
              : "Review the explanations above to strengthen your understanding."}
          </p>
        )}
      </div>
    </div>
  );
}
