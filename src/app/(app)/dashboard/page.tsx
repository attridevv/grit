"use client";

import { useState, useEffect, useCallback } from "react";
import { StatCard, Card, CardTitle, CardContent, SectionLabel } from "@/components/ui/card";
import { Badge, Progress } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Dumbbell,
  Check,
  Loader2,
  Moon,
  Zap,
  Flame,
  ArrowRight,
  Sparkles,
  BedDouble,
  BatteryMedium,
  Waves,
} from "lucide-react";

type Analytics = {
  user: { name: string | null };
  readiness: {
    overall: number;
    zone: string;
    trend: string;
    sleepScore: number;
    hrRecoveryScore: number;
    energyScore: number;
    sorenessScore: number;
    painPenalty: number;
    insights: string[];
  };
  checkedInToday: boolean;
  weeklyDistance: number;
  weeklyDistanceTrend: string;
  acwr: { value: number; status: string };
  streak: number;
  planCompliance: number;
  readinessTrend: { day: string; score: number }[];
  recentActivities: { id: string; type: string; name: string; date: string; distance: number | null; duration: number; rpe: number | null }[];
  insight: { content: string; recommendations: string[] } | null;
};

type PlanDay = {
  id: string;
  date: string;
  dayOfWeek: number;
  workoutType: string | null;
  name: string | null;
  targetDistance: number | null;
  targetPace: number | null;
  targetRPE: number | null;
  paceWindow: { min: string; max: string } | null;
  completed: boolean;
  cue: string | null;
};

type Plan = { id: string; name: string; currentWeek: number; totalWeeks: number; days: PlanDay[] } | null;

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

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m} min`;
}

export default function TodayPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [plan, setPlan] = useState<Plan>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        fetch("/api/analytics").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/plan").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (a) setData(a);
      if (p) setPlan(p.plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <TodaySkeleton />;
  if (!data) return <p className="text-ink-muted">Could not load your data.</p>;

  const today = new Date();
  const todayStr = today.toDateString();
  const todaySession = plan?.days.find((d) => new Date(d.date).toDateString() === todayStr) ?? null;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 86400000);
    const day = plan?.days.find((pd) => new Date(pd.date).toDateString() === d.toDateString()) ?? null;
    return { date: d, planDay: day, isToday: d.toDateString() === todayStr };
  });

  const greeting =
    today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";
  const firstName = data.user.name?.split(" ")[0] ?? "athlete";

  const markDone = async () => {
    if (!todaySession) return;
    setMarking(true);
    try {
      await fetch("/api/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDayId: todaySession.id, completed: !todaySession.completed }),
      });
      await load();
    } finally {
      setMarking(false);
    }
  };

  const zoneVariant = data.readiness.zone === "green" ? "green" : data.readiness.zone === "yellow" ? "amber" : "red";
  const zoneColor =
    data.readiness.zone === "green" ? "var(--color-green)" : data.readiness.zone === "yellow" ? "var(--color-amber)" : "var(--color-red)";

  const sessionMeta = todaySession ? TYPE_META[todaySession.workoutType ?? "rest"] ?? TYPE_META.rest : null;
  const SessionIcon = sessionMeta?.icon ?? BedDouble;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="label">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="display-xl text-[30px] mt-1.5">
            {greeting}, {firstName}.
          </h1>
        </div>
        <Badge variant={zoneVariant}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: zoneColor }} />
          {data.readiness.overall} readiness
        </Badge>
      </div>

      {/* HERO — session + check-in merged */}
      <div className="panel-hero p-6 sm:p-7">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-7 relative z-10">
          {/* Today's session */}
          <div className="flex flex-col">
            <p className="label mb-3">Today&apos;s session</p>
            {todaySession && todaySession.workoutType !== "rest" ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-accent">
                    <SessionIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-ink leading-tight">
                      {todaySession.name ?? sessionMeta?.label}
                    </h2>
                    <p className="text-xs text-ink-muted">
                      {sessionMeta?.label}
                      {plan ? ` · Week ${plan.currentWeek}/${plan.totalWeeks}` : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 my-4">
                  <HeroStat label="Distance" value={todaySession.targetDistance ? `${todaySession.targetDistance} km` : "—"} />
                  <HeroStat
                    label="Pace"
                    value={todaySession.paceWindow ? `${todaySession.paceWindow.min}` : "—"}
                    sub={todaySession.paceWindow ? `–${todaySession.paceWindow.max}/km` : undefined}
                  />
                  <HeroStat label="RPE" value={todaySession.targetRPE ? String(todaySession.targetRPE) : "—"} />
                </div>

                {todaySession.cue && (
                  <p className="text-sm text-ink-muted italic border-l-2 border-accent/40 pl-3 mb-4">
                    &ldquo;{todaySession.cue}&rdquo;
                  </p>
                )}

                <div className="mt-auto flex gap-3">
                  <Button onClick={markDone} disabled={marking} className="flex-1 sm:flex-none">
                    {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : todaySession.completed ? <Check className="w-4 h-4" /> : null}
                    {todaySession.completed ? "Completed" : "Mark complete"}
                  </Button>
                  <Button asChild variant="secondary">
                    <a href="/train?tab=log">Log details</a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center py-6">
                <div className="w-11 h-11 rounded-xl bg-green-subtle border border-green/20 flex items-center justify-center text-green mb-3">
                  <Moon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-display font-bold text-ink">Recovery day</h2>
                <p className="text-sm text-ink-muted mt-1 max-w-sm">
                  No session scheduled. Prioritize sleep, mobility, and hydration. Your next workout is queued in the Plan.
                </p>
                <Button asChild variant="secondary" className="mt-4 w-fit">
                  <a href="/plan">View plan <ArrowRight className="w-3.5 h-3.5" /></a>
                </Button>
              </div>
            )}
          </div>

          {/* Check-in / readiness */}
          <div className="lg:border-l lg:border-white/10 lg:pl-7">
            {data.checkedInToday ? (
              <ReadinessSummary
                overall={data.readiness.overall}
                zone={data.readiness.zone}
                zoneColor={zoneColor}
                zoneVariant={zoneVariant}
                sleep={data.readiness.sleepScore}
                energy={data.readiness.energyScore}
                soreness={data.readiness.sorenessScore}
                insights={data.readiness.insights}
                onRedo={load}
              />
            ) : (
              <CheckInInline onSaved={load} />
            )}
          </div>
        </div>
      </div>

      {/* Week strip */}
      <div>
        <SectionLabel action={<a href="/plan" className="text-xs text-accent hover:underline">Full plan →</a>}>
          This week
        </SectionLabel>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(({ date, planDay, isToday }) => {
            const meta = planDay ? TYPE_META[planDay.workoutType ?? "rest"] ?? TYPE_META.rest : null;
            return (
              <div
                key={date.toISOString()}
                className={`panel p-2.5 text-center ${isToday ? "border-accent/50" : ""}`}
              >
                <p className={`text-[10px] font-mono uppercase tracking-wider ${isToday ? "text-accent" : "text-ink-faint"}`}>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={`text-lg font-display font-bold mt-1 ${isToday ? "text-accent" : "text-ink"}`}>
                  {date.getDate()}
                </p>
                <div className="mt-1.5 h-1.5 w-full rounded-full" style={{ background: planDay ? (planDay.completed ? "var(--color-green)" : "rgba(255,255,255,0.14)") : "transparent" }} />
                <p className="text-[10px] text-ink-faint mt-1 truncate">{planDay?.workoutType ?? "—"}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Readiness" value={String(data.readiness.overall)} trend={{ value: data.readiness.trend, positive: !data.readiness.trend.startsWith("-") }} accent={data.readiness.zone === "green"} />
        <StatCard label="Weekly distance" value={`${data.weeklyDistance} km`} trend={{ value: data.weeklyDistanceTrend, positive: !data.weeklyDistanceTrend.startsWith("-") }} />
        <StatCard label="Day streak" value={String(data.streak)} sub="days active" />
        <StatCard label="Plan compliance" value={`${data.planCompliance}%`} />
      </div>

      {/* Trend + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionLabel>Readiness trend</SectionLabel>
          {data.readinessTrend.length > 1 ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={data.readinessTrend}>
                <defs>
                  <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-ink-faint)" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--color-ink-faint)" fontSize={10} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1d1d24", border: "1px solid #2a2a33", borderRadius: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="score" stroke="var(--color-accent)" strokeWidth={2.5} fill="url(#readinessGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Check in daily to reveal your readiness trend" />
          )}
        </Card>

        <Card>
          <SectionLabel action={<a href="/train" className="text-xs text-accent hover:underline">All →</a>}>
            Recent activity
          </SectionLabel>
          {data.recentActivities.length > 0 ? (
            <div className="space-y-2">
              {data.recentActivities.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.type === "run" ? "bg-blue-subtle text-blue" : "bg-amber-subtle text-amber"}`}>
                    {a.type === "run" ? <Activity className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{a.name}</p>
                    <p className="text-[11px] text-ink-faint">{new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  <span className="text-xs font-mono text-ink-muted">
                    {a.distance ? `${a.distance.toFixed(1)} km` : fmtDuration(a.duration)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted py-8 text-center">No activity yet — log your first session.</p>
          )}
        </Card>
      </div>

      {/* Insight */}
      {data.insight && (
        <div className="panel p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center text-accent flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="label mb-1">Coach&apos;s note</p>
            <p className="text-sm text-ink-muted line-clamp-3">{data.insight.content.split("\n")[0]}</p>
            <a href="/insights" className="text-xs text-accent hover:underline mt-1 inline-block">
              Read full report →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/[0.06] px-3 py-2.5">
      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="text-lg font-display font-bold text-ink mt-0.5">
        {value}
        {sub && <span className="text-xs text-ink-muted font-body font-normal"> {sub}</span>}
      </p>
    </div>
  );
}

function ReadinessSummary({
  overall,
  zone,
  zoneColor,
  zoneVariant,
  sleep,
  energy,
  soreness,
  insights,
  onRedo,
}: {
  overall: number;
  zone: string;
  zoneColor: string;
  zoneVariant: any;
  sleep: number;
  energy: number;
  soreness: number;
  insights: string[];
  onRedo: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <p className="label mb-3">Checked in today</p>
      <div className="flex items-center gap-5">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={zoneColor}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${(overall / 100) * 314} 314`}
              style={{ filter: `drop-shadow(0 0 8px ${zoneColor}66)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="display-xl text-[34px]">{overall}</span>
            <Badge variant={zoneVariant}>{zone}</Badge>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <MiniBar icon={BedDouble} label="Sleep" value={sleep} />
          <MiniBar icon={BatteryMedium} label="Energy" value={energy} />
          <MiniBar icon={Waves} label="Recovery" value={soreness} />
        </div>
      </div>
      {insights?.length > 0 && (
        <p className="text-xs text-ink-muted mt-4 flex items-start gap-1.5">
          <Zap className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
          {insights[0]}
        </p>
      )}
    </div>
  );
}

function MiniBar({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-ink-muted flex items-center gap-1.5">
          <Icon className="w-3 h-3" /> {label}
        </span>
        <span className="font-mono text-ink">{value}</span>
      </div>
      <Progress value={value} variant={value >= 80 ? "green" : value >= 60 ? "amber" : "red"} />
    </div>
  );
}

function CheckInInline({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ sleepHours: 7.5, sleepQuality: 7, energyLevel: 7, soreness: 3, mood: "good" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Could not save");
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <p className="label mb-3">Daily check-in</p>
      <p className="text-sm text-ink-muted mb-4">
        Three quick inputs. GRIT turns them into your readiness score and adapts today&apos;s plan.
      </p>

      <div className="space-y-3.5">
        <SliderField label="Sleep last night" unit="h" min={0} max={12} step={0.5} value={form.sleepHours} onChange={(v) => setForm({ ...form, sleepHours: v })} icon={BedDouble} />
        <SliderField label="Energy" min={1} max={10} step={1} value={form.energyLevel} onChange={(v) => setForm({ ...form, energyLevel: v })} icon={BatteryMedium} />
        <SliderField label="Soreness" min={1} max={10} step={1} value={form.soreness} onChange={(v) => setForm({ ...form, soreness: v })} icon={Waves} />
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span className="text-[11px] text-ink-faint mr-1">Mood</span>
        {[
          { k: "good", label: "Good" },
          { k: "neutral", label: "Okay" },
          { k: "bad", label: "Low" },
          { k: "anxious", label: "Tense" },
        ].map((m) => (
          <button
            key={m.k}
            onClick={() => setForm({ ...form, mood: m.k })}
            className={`px-2.5 h-8 rounded-lg text-[11px] font-medium transition-all ${
              form.mood === m.k
                ? "bg-accent-subtle border border-accent/40 text-accent"
                : "bg-white/[0.03] border border-white/[0.06] text-ink-faint hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red mt-2">{error}</p>}

      <Button onClick={save} disabled={saving} className="mt-auto pt-3 w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save check-in
      </Button>
    </div>
  );
}

function SliderField({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  icon: any;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-ink-muted flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" /> {label}
        </span>
        <span className="font-mono text-sm text-ink">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ ["--fill" as any]: `${pct}%` }}
      />
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[190px] flex items-center justify-center border border-dashed border-border rounded-xl">
      <p className="text-sm text-ink-faint px-6 text-center">{label}</p>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-surface rounded-lg animate-pulse" />
      <div className="h-72 panel animate-pulse" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 panel animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 panel animate-pulse" />
        ))}
      </div>
    </div>
  );
}
