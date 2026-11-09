"use client";

import { useState, useEffect, useCallback } from "react";
import { StatCard, SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import {
  Check,
  Loader2,
  Target,
  Flag,
  ChevronDown,
  CalendarDays,
  Moon,
  Zap,
  Flame,
  Activity,
  Dumbbell,
  Waves,
  BedDouble,
} from "lucide-react";

type PlanDay = {
  id: string;
  date: string;
  weekNumber: number;
  dayOfWeek: number;
  workoutType: string | null;
  name: string | null;
  targetDistance: number | null;
  targetDuration: number | null;
  targetRPE: number | null;
  paceWindow: { min: string; max: string } | null;
  completed: boolean;
  cue: string | null;
};

type Plan = {
  id: string;
  name: string;
  type: string;
  phase: string | null;
  distance: string | null;
  startDate: string;
  endDate: string;
  raceDate: string | null;
  totalWeeks: number;
  currentWeek: number;
  status: string;
  days: PlanDay[];
};

const TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
  easy: { label: "Easy", color: "blue", icon: Waves },
  tempo: { label: "Tempo", color: "amber", icon: Zap },
  intervals: { label: "Intervals", color: "red", icon: Flame },
  longRun: { label: "Long Run", color: "accent", icon: Activity },
  strength: { label: "Strength", color: "amber", icon: Dumbbell },
  recovery: { label: "Recovery", color: "green", icon: Moon },
  rest: { label: "Rest", color: "default", icon: BedDouble },
  run: { label: "Run", color: "blue", icon: Activity },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-subtle text-blue",
  amber: "bg-amber-subtle text-amber",
  red: "bg-red-subtle text-red",
  accent: "bg-accent-subtle text-accent",
  green: "bg-green-subtle text-green",
  default: "bg-white/[0.06] text-ink-faint",
};

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/plan");
      if (res.ok) {
        const json = await res.json();
        setPlan(json.plan);
        setExpanded(json.plan?.currentWeek ?? null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (day: PlanDay) => {
    setToggling(day.id);
    try {
      await fetch("/api/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDayId: day.id, completed: !day.completed }),
      });
      setPlan((p) => (p ? { ...p, days: p.days.map((d) => (d.id === day.id ? { ...d, completed: !d.completed } : d)) } : p));
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface rounded-lg animate-pulse" />
        <div className="h-24 panel animate-pulse" />
        <div className="h-64 panel animate-pulse" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <h1 className="display-xl text-[30px]">Training Plan</h1>
        <div className="panel p-12 text-center">
          <Target className="w-9 h-9 text-ink-faint mx-auto mb-3" />
          <p className="text-ink font-medium">No active plan yet</p>
          <p className="text-sm text-ink-muted mt-1">A structured plan is the backbone of GRIT.</p>
          <p className="text-sm text-ink-muted">Plan creation is coming next — for now your Today view runs off logged training.</p>
        </div>
      </div>
    );
  }

  const weeks: Record<number, PlanDay[]> = {};
  for (const d of plan.days) {
    (weeks[d.weekNumber] ??= []).push(d);
  }
  const weekEntries = Object.entries(weeks).sort((a, b) => Number(a[0]) - Number(b[0]));

  const today = new Date();
  const due = plan.days.filter((d) => new Date(d.date) <= today);
  const compliance = due.length ? Math.round((due.filter((d) => d.completed).length / due.length) * 100) : 0;
  const doneCount = plan.days.filter((d) => d.completed).length;
  const progress = plan.days.length ? Math.round((doneCount / plan.days.length) * 100) : 0;
  const totalKm = Math.round(plan.days.reduce((s, d) => s + (d.targetDistance ?? 0), 0));

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="label">Training plan</span>
          <Badge variant={plan.status === "active" ? "green" : "amber"}>{plan.status}</Badge>
        </div>
        <h1 className="display-xl text-[30px]">{plan.name}</h1>
        <p className="text-sm text-ink-muted mt-1.5">
          Week {plan.currentWeek} of {plan.totalWeeks} · {plan.phase ? `${plan.phase} phase` : plan.type}
        </p>
      </div>

      {/* Progress bar */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">Overall progress</span>
          <span className="text-sm font-mono text-ink">{progress}%</span>
        </div>
        <div className="h-2.5 bg-black/40 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <MiniStat icon={CalendarDays} label="Sessions done" value={`${doneCount}/${plan.days.length}`} />
          <MiniStat icon={Activity} label="Planned volume" value={`${totalKm} km`} />
          <MiniStat icon={Flag} label="Race day" value={plan.raceDate ? new Date(plan.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Current week" value={`${plan.currentWeek}`} sub={`of ${plan.totalWeeks}`} accent />
        <StatCard label="Phase" value={plan.phase ?? "—"} />
        <StatCard label="Compliance" value={`${compliance}%`} />
        <StatCard label="Completed" value={`${doneCount}`} sub="sessions" />
      </div>

      {/* Week timeline */}
      <div>
        <SectionLabel>Block timeline</SectionLabel>
        <div className="space-y-3">
          {weekEntries.map(([weekNum, days]) => {
            const n = Number(weekNum);
            const isCurrent = n === plan.currentWeek;
            const isOpen = expanded === n;
            const sorted = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
            const weekKm = Math.round(sorted.reduce((s, d) => s + (d.targetDistance ?? 0), 0));
            const done = sorted.filter((d) => d.completed).length;
            const start = new Date(Math.min(...sorted.map((d) => +new Date(d.date))));
            const end = new Date(Math.max(...sorted.map((d) => +new Date(d.date))));

            return (
              <div key={n} className={`panel overflow-hidden ${isCurrent ? "border-accent/50" : ""}`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : n)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                      isCurrent ? "bg-accent-subtle border border-accent/40 text-accent" : "bg-white/[0.04] border border-white/[0.06] text-ink-muted"
                    }`}
                  >
                    <span className="text-[9px] font-mono uppercase leading-none">Week</span>
                    <span className="text-lg font-display font-bold leading-tight">{n}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink">
                        {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                        {end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      {isCurrent && <Badge variant="default">Now</Badge>}
                    </div>
                    <p className="text-xs text-ink-faint mt-0.5">
                      {weekKm} km planned · {done}/{sorted.length} done
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5">
                    {sorted.map((d) => {
                      const meta = TYPE_META[d.workoutType ?? "rest"] ?? TYPE_META.rest;
                      return (
                        <span
                          key={d.id}
                          title={d.name ?? meta.label}
                          className={`w-2.5 h-2.5 rounded-full ${d.completed ? "bg-green" : d.workoutType === "rest" ? "bg-white/10" : "bg-white/25"}`}
                        />
                      );
                    })}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-1.5">
                    {sorted.map((d) => {
                      const meta = TYPE_META[d.workoutType ?? "rest"] ?? TYPE_META.rest;
                      const Icon = meta.icon;
                      return (
                        <div key={d.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.02]">
                          <span className="text-[11px] text-ink-faint w-9 font-mono">{DAYS[d.dayOfWeek]}</span>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${COLOR_CLASSES[meta.color] ?? COLOR_CLASSES.default}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-ink truncate">{d.name ?? meta.label}</p>
                            {d.cue && <p className="text-[11px] text-ink-faint truncate italic">{d.cue}</p>}
                          </div>
                          <div className="text-right text-[11px] font-mono text-ink-muted hidden sm:block">
                            {d.targetDistance ? `${d.targetDistance} km` : ""}
                            {d.paceWindow ? ` · ${d.paceWindow.min}` : ""}
                          </div>
                          <button
                            onClick={() => toggle(d)}
                            disabled={toggling === d.id}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              d.completed ? "bg-green-subtle text-green" : "bg-white/[0.04] text-ink-faint hover:text-ink"
                            }`}
                          >
                            {toggling === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/25 border border-white/[0.06] px-3 py-2.5 flex items-center gap-2.5">
      <Icon className="w-4 h-4 text-ink-faint flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-wider text-ink-faint">{label}</p>
        <p className="text-sm font-display font-bold text-ink truncate">{value}</p>
      </div>
    </div>
  );
}
