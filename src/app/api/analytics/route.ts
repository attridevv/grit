import { requireCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ok, serverError, unauthorized } from "@/lib/api";
import { calcRacePredictions, calcTrainingLoad } from "@/lib/engines";

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function GET() {
  try {
    const user = await requireCurrentDbUser();
    const now = new Date();
    const since28 = new Date(now.getTime() - 28 * 86400000);
    const since7 = new Date(now.getTime() - 7 * 86400000);

    const [profile, readiness, checkIns, activities, loads, bodyWeights, nutritionLogs, targets, plan] =
      await Promise.all([
        prisma.profile.findUnique({ where: { userId: user.id } }),
        prisma.readinessScore.findMany({
          where: { userId: user.id },
          orderBy: { date: "asc" },
          take: 30,
        }),
        prisma.checkIn.findMany({
          where: { userId: user.id, date: { gte: since28 } },
          orderBy: { date: "asc" },
        }),
        prisma.activity.findMany({
          where: { userId: user.id, date: { gte: since28 } },
          orderBy: { date: "desc" },
        }),
        prisma.trainingLoad.findMany({
          where: { userId: user.id, date: { gte: since28 } },
          orderBy: { date: "asc" },
        }),
        prisma.bodyWeightLog.findMany({
          where: { userId: user.id },
          orderBy: { date: "desc" },
          take: 30,
        }),
        prisma.nutritionLog.findMany({
          where: { userId: user.id, date: { gte: since7 } },
          orderBy: { date: "asc" },
        }),
        prisma.nutritionTarget.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.trainingPlan.findFirst({
          where: { userId: user.id, status: "active" },
          orderBy: { createdAt: "desc" },
          include: { days: { orderBy: { date: "asc" } } },
        }),
      ]);

    // Readiness
    const latestReadiness = readiness[readiness.length - 1] ?? null;
    const prevReadiness = readiness[readiness.length - 2] ?? null;
    const checkedInToday = latestReadiness ? latestReadiness.date.toDateString() === now.toDateString() : false;
    const readinessTrend = readiness.slice(-14).map((r) => ({
      day: r.date.toISOString().slice(5, 10),
      score: r.overall,
    }));

    // Weekly distance
    const weeklyDistance =
      Math.round(
        activities.filter((a) => a.type === "run" && a.date >= since7).reduce((s, a) => s + (a.distance ?? 0), 0) * 10
      ) / 10;
    const prevWeekDistance =
      Math.round(
        activities
          .filter((a) => a.type === "run" && a.date >= new Date(now.getTime() - 14 * 86400000) && a.date < since7)
          .reduce((s, a) => s + (a.distance ?? 0), 0) * 10
      ) / 10;
    const weeklyDistanceTrend =
      prevWeekDistance > 0
        ? `${weeklyDistance >= prevWeekDistance ? "+" : ""}${Math.round(((weeklyDistance - prevWeekDistance) / prevWeekDistance) * 100)}%`
        : "—";

    // ACWR
    const loadResult = calcTrainingLoad(loads.map((l) => ({ date: l.date, load: l.load ?? 0 })));

    // Sleep
    const recentCheckIns = checkIns.filter((c) => c.sleepHours);
    const sleepAvg =
      recentCheckIns.length > 0
        ? Math.round((recentCheckIns.reduce((s, c) => s + (c.sleepHours ?? 0), 0) / recentCheckIns.length) * 10) / 10
        : 0;

    // Nutrition today
    const todayStr = now.toDateString();
    const todayLog = nutritionLogs.find((l) => l.date.toDateString() === todayStr);
    const caloriesToday = todayLog?.calories ?? 0;
    const proteinToday = Math.round(todayLog?.protein ?? 0);

    // Weight trend
    const weights = [...bodyWeights].sort((a, b) => a.date.getTime() - b.date.getTime());
    let weightTrend = "—";
    if (weights.length >= 2) {
      const first = weights[0].weight;
      const last = weights[weights.length - 1].weight;
      const weeks = Math.max(1, (weights[weights.length - 1].date.getTime() - weights[0].date.getTime()) / (7 * 86400000));
      const perWeek = (last - first) / weeks;
      weightTrend = `${perWeek >= 0 ? "+" : ""}${perWeek.toFixed(1)} kg/wk`;
    }

    // Streak (consecutive days with an activity)
    const activityDays = new Set(activities.map((a) => a.date.toDateString()));
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(now.getTime() - i * 86400000).toDateString();
      if (activityDays.has(d)) streak++;
      else if (i > 0) break;
    }

    // Plan compliance
    const dueDays = plan?.days.filter((d) => d.date <= now) ?? [];
    const planCompliance =
      dueDays.length > 0
        ? Math.round((dueDays.filter((d) => d.completed).length / dueDays.length) * 100)
        : 0;

    // Weekly mileage (last 6 weeks planned vs actual)
    const weekMap: Record<string, { week: string; planned: number; actual: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const ws = startOfWeek(new Date(now.getTime() - i * 7 * 86400000));
      const key = ws.toISOString().slice(0, 10);
      weekMap[key] = { week: `W${6 - i}`, planned: 0, actual: 0 };
    }
    for (const d of plan?.days ?? []) {
      const key = startOfWeek(d.date).toISOString().slice(0, 10);
      if (weekMap[key] && d.targetDistance) weekMap[key].planned += d.targetDistance;
    }
    for (const a of activities) {
      if (a.type !== "run") continue;
      const key = startOfWeek(a.date).toISOString().slice(0, 10);
      if (weekMap[key] && a.distance) weekMap[key].actual += a.distance;
    }
    const weeklyMileage = Object.values(weekMap).map((w) => ({
      week: w.week,
      planned: Math.round(w.planned * 10) / 10,
      actual: Math.round(w.actual * 10) / 10,
    }));

    // Nutrition trend (7d)
    const nutritionTrend = nutritionLogs.map((l) => ({
      day: l.date.toLocaleDateString("en-US", { weekday: "short" }),
      calories: l.calories,
      protein: Math.round(l.protein),
      target: l.calorieTarget,
    }));

    // Recent activities
    const recentActivities = activities.slice(0, 5).map((a) => ({
      id: a.id,
      type: a.type,
      name: a.name,
      date: a.date,
      distance: a.distance,
      duration: a.duration,
      pace: a.pace,
      rpe: a.rpe,
      avgHr: a.avgHr,
    }));

    const latestInsight = await prisma.aIInsight.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Series for the analytics page
    const loadSeries = loads.map((l) => ({
      date: l.date.toISOString().slice(5, 10),
      load: Math.round(l.load ?? 0),
    }));

    const sleepSeries = checkIns
      .filter((c) => c.sleepHours)
      .map((c) => ({
        day: c.date.toISOString().slice(5, 10),
        hours: c.sleepHours ?? 0,
        quality: c.sleepQuality ?? 0,
      }));

    // Rolling ACWR per day (last 21 days)
    const acwrSeries: { date: string; ratio: number }[] = [];
    const allLoadRows = await prisma.trainingLoad.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      take: 90,
    });
    for (let i = 20; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000);
      const dayEnd = new Date(day.getTime() + 86400000);
      const acuteRows = allLoadRows.filter((l) => l.date >= new Date(day.getTime() - 7 * 86400000) && l.date < dayEnd);
      const chronicRows = allLoadRows.filter((l) => l.date >= new Date(day.getTime() - 28 * 86400000) && l.date < dayEnd);
      const acute = acuteRows.reduce((s, l) => s + (l.load ?? 0), 0) / 7;
      const chronic = chronicRows.reduce((s, l) => s + (l.load ?? 0), 0) / 28;
      acwrSeries.push({
        date: day.toISOString().slice(5, 10),
        ratio: chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 0,
      });
    }

    // Race predictions from all runs
    const allRuns = await prisma.activity.findMany({
      where: { userId: user.id, type: "run", distance: { not: null } },
      select: { distance: true, duration: true },
    });
    const raceResult = calcRacePredictions(
      allRuns.map((r) => ({ distance: r.distance ?? 0, duration: r.duration })).filter((r) => r.distance > 0)
    );

    // Athlete radar (composite scores)
    const enduranceScore = Math.min(100, Math.round((weeklyDistance / 40) * 100));
    const strengthSessions = activities.filter((a) => a.type === "strength").length;
    const strengthScore = Math.min(100, strengthSessions * 20);
    const mobilityScore = checkIns.length > 0 ? Math.round((checkIns.filter((c) => c.mobilityCompleted).length / checkIns.length) * 100) : 0;
    const recoveryScore = latestReadiness?.overall ?? 0;
    const consistencyScore = Math.min(100, streak * 10 + 20);
    const nutritionScore = Math.min(100, Math.round((caloriesToday / (targets?.calories ?? 2600)) * 100));
    const athleteRadar = [
      { metric: "Endurance", value: enduranceScore },
      { metric: "Strength", value: strengthScore },
      { metric: "Mobility", value: mobilityScore },
      { metric: "Recovery", value: recoveryScore },
      { metric: "Consistency", value: consistencyScore },
      { metric: "Nutrition", value: nutritionScore },
    ];

    return ok({
      loadSeries,
      sleepSeries,
      acwrSeries,
      racePredictions: raceResult.predictions,
      vo2Max: raceResult.vo2Max,
      predictionConfidence: raceResult.confidence,
      athleteRadar,
      user: { name: user.name, image: user.image },
      checkedInToday,
      profile,
      readiness: {
        overall: latestReadiness?.overall ?? 0,
        zone: latestReadiness?.zone ?? "yellow",
        trend: latestReadiness && prevReadiness ? `${latestReadiness.overall - prevReadiness.overall >= 0 ? "+" : ""}${latestReadiness.overall - prevReadiness.overall}` : "0",
        sleepScore: latestReadiness?.sleepScore ?? 0,
        hrRecoveryScore: latestReadiness?.hrRecoveryScore ?? 0,
        energyScore: latestReadiness?.energyScore ?? 0,
        sorenessScore: latestReadiness?.sorenessScore ?? 0,
        painPenalty: latestReadiness?.painPenalty ?? 0,
        insights: (latestReadiness?.insights as string[]) ?? [],
      },
      weeklyDistance,
      weeklyDistanceTrend,
      acwr: { value: loadResult.acwr, status: loadResult.status },
      sleepAvg,
      caloriesToday,
      caloriesTarget: targets?.calories ?? todayLog?.calorieTarget ?? 2600,
      proteinToday,
      proteinTarget: Math.round(targets?.protein ?? todayLog?.proteinTarget ?? 180),
      weightTrend,
      streak,
      planCompliance,
      readinessTrend,
      weeklyMileage,
      nutritionTrend,
      recentActivities,
      insight: latestInsight
        ? { content: latestInsight.content, recommendations: (latestInsight.recommendations as string[]) ?? [] }
        : null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return unauthorized();
    console.error("GET /api/analytics", err);
    return serverError();
  }
}
