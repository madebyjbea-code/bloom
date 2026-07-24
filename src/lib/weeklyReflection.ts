// ============================================================================
// lib/weeklyReflection.ts
//
// Aggregates data from all 5 pillars for the weekly reflection modal:
//   1. Habits (mindfulness + movement category completion %)
//   2. Sleep  (consistency, quality, avg times — from sleep_logs)
//   3. Nutrition (top / sparse nutrients — from localStorage Nourish data)
//   4. Bad habits (violations + health cost for the week)
//   5. Overall (compiled summary object the modal renders)
// ============================================================================

import { supabase } from './supabase';

export type SleepEntry = {
  id: string;
  bedtime: string;       // ISO timestamp
  wake_time: string;     // ISO timestamp
  quality_score: number; // 1–10
  logged_at: string;
};

export type WeeklySleepSummary = {
  entries: SleepEntry[];
  avgQuality: number | null;
  avgBedtimeLabel: string | null;  // "11:14 pm"
  avgWakeLabel: string | null;     // "6:58 am"
  consistencyMin: number | null;   // avg deviation from mean bedtime (mins) — lower = more consistent
  trend: 'improving' | 'stable' | 'declining' | null;
  daysLogged: number;
};

export type WeeklyHabitSummary = {
  totalScheduled: number;
  totalCompleted: number;
  pct: number;
  mindfulnessPct: number;
  movementPct: number;
  sleepHabitPct: number;
  nutritionHabitPct: number;
};

export type NutrientRow = { key: string; label: string; avgPct: number };

export type WeeklyNutritionSummary = {
  topNutrients: NutrientRow[];    // highest avg % DV across the week
  sparseNutrients: NutrientRow[]; // lowest avg % DV — "opportunities"
  daysLogged: number;
  anyData: boolean;
};

export type WeeklyBadHabitSummary = {
  violations: { name: string; emoji: string; count: number; healthLost: number }[];
  totalViolations: number;
  totalHealthLost: number;
};

export type WeeklyReflectionData = {
  weekStart: string;
  sleep: WeeklySleepSummary;
  habits: WeeklyHabitSummary;
  nutrition: WeeklyNutritionSummary;
  badHabits: WeeklyBadHabitSummary;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getWeekStartStr(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}

function minutesSinceMidnight(isoStr: string): number {
  const d = new Date(isoStr);
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToLabel(mins: number): string {
  // Normalise to 0–1440 range
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
}

/** Circular mean for bedtimes (handles midnight crossover correctly) */
function circularMeanMinutes(values: number[]): number {
  if (!values.length) return 0;
  const radians = values.map((v) => (v / 1440) * 2 * Math.PI);
  const sinMean = radians.reduce((s, r) => s + Math.sin(r), 0) / values.length;
  const cosMean = radians.reduce((s, r) => s + Math.cos(r), 0) / values.length;
  let angle = Math.atan2(sinMean, cosMean);
  if (angle < 0) angle += 2 * Math.PI;
  return Math.round((angle / (2 * Math.PI)) * 1440);
}

function circularDeviation(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const devs = values.map((v) => {
    let diff = Math.abs(v - mean);
    if (diff > 720) diff = 1440 - diff; // wrap
    return diff;
  });
  return Math.round(devs.reduce((s, d) => s + d, 0) / devs.length);
}

// ── 1. Sleep ─────────────────────────────────────────────────────────────────

export async function getWeeklySleepSummary(
  userId: string,
  weekStart: string
): Promise<WeeklySleepSummary> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  try {
    const { data } = await supabase
      .from('sleep_logs')
      .select('id, bedtime, wake_time, quality_score, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', weekStart)
      .lt('logged_at', weekEnd.toISOString().split('T')[0])
      .order('bedtime', { ascending: true });

    const entries = (data as SleepEntry[]) || [];

    if (!entries.length) {
      return { entries: [], avgQuality: null, avgBedtimeLabel: null, avgWakeLabel: null, consistencyMin: null, trend: null, daysLogged: 0 };
    }

    const avgQuality = Math.round(
      (entries.reduce((s, e) => s + (e.quality_score || 0), 0) / entries.length) * 10
    ) / 10;

    const bedMins  = entries.map((e) => minutesSinceMidnight(e.bedtime));
    const wakeMins = entries.map((e) => minutesSinceMidnight(e.wake_time));
    const meanBed  = circularMeanMinutes(bedMins);
    const meanWake = circularMeanMinutes(wakeMins);
    const consistencyMin = circularDeviation(bedMins, meanBed);

    // Trend: compare quality of first half vs second half of the week
    let trend: WeeklySleepSummary['trend'] = 'stable';
    if (entries.length >= 4) {
      const half = Math.floor(entries.length / 2);
      const firstHalf  = entries.slice(0, half).reduce((s, e) => s + e.quality_score, 0) / half;
      const secondHalf = entries.slice(half).reduce((s, e) => s + e.quality_score, 0) / (entries.length - half);
      if (secondHalf - firstHalf >= 1) trend = 'improving';
      else if (firstHalf - secondHalf >= 1) trend = 'declining';
    }

    return {
      entries,
      avgQuality,
      avgBedtimeLabel: minutesToLabel(meanBed),
      avgWakeLabel: minutesToLabel(meanWake),
      consistencyMin,
      trend,
      daysLogged: entries.length,
    };
  } catch {
    return { entries: [], avgQuality: null, avgBedtimeLabel: null, avgWakeLabel: null, consistencyMin: null, trend: null, daysLogged: 0 };
  }
}

// ── 2. Habits ────────────────────────────────────────────────────────────────

export type HabitLogEntry = {
  habit_key: string;
  category: string;
  completed: boolean;
};

export function getWeeklyHabitSummary(
  weekLogs: HabitLogEntry[]
): WeeklyHabitSummary {
  const total = weekLogs.length;
  const completed = weekLogs.filter((l) => l.completed).length;

  function catPct(cat: string): number {
    const catLogs = weekLogs.filter((l) => l.category === cat);
    if (!catLogs.length) return 0;
    return Math.round((catLogs.filter((l) => l.completed).length / catLogs.length) * 100);
  }

  return {
    totalScheduled: total,
    totalCompleted: completed,
    pct: total ? Math.round((completed / total) * 100) : 0,
    mindfulnessPct: catPct('mindfulness'),
    movementPct: catPct('movement'),
    sleepHabitPct: catPct('sleep'),
    nutritionHabitPct: catPct('nutrition'),
  };
}

// ── 3. Nutrition ─────────────────────────────────────────────────────────────
// Reads the week's Nourish localStorage entries (same format TabNourish writes).

export function getWeeklyNutritionSummary(weekStart: string): WeeklyNutritionSummary {
  try {
    const raw = localStorage.getItem('bloom-nourish');
    if (!raw) return { topNutrients: [], sparseNutrients: [], daysLogged: 0, anyData: false };

    const allData: Record<string, { entries: { nutrients?: { key: string; label: string; percent_dv: number }[] }[] }> = JSON.parse(raw);

    // Collect the 7 days of this week
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }

    const daysLogged = days.filter((d) => allData[d]?.entries?.length > 0).length;
    if (!daysLogged) return { topNutrients: [], sparseNutrients: [], daysLogged: 0, anyData: false };

    // Aggregate nutrient totals across all days
    const totals: Record<string, { label: string; sum: number; count: number }> = {};

    for (const day of days) {
      const dayData = allData[day];
      if (!dayData?.entries?.length) continue;
      for (const entry of dayData.entries) {
        for (const n of entry.nutrients || []) {
          if (!totals[n.key]) totals[n.key] = { label: n.label, sum: 0, count: 0 };
          totals[n.key].sum += n.percent_dv;
          totals[n.key].count += 1;
        }
      }
    }

    const rows: NutrientRow[] = Object.entries(totals).map(([key, { label, sum, count }]) => ({
      key,
      label,
      avgPct: Math.round(sum / count),
    }));

    rows.sort((a, b) => b.avgPct - a.avgPct);

    return {
      topNutrients: rows.slice(0, 3),
      sparseNutrients: rows.filter((r) => r.avgPct < 40).slice(-3).reverse(),
      daysLogged,
      anyData: true,
    };
  } catch {
    return { topNutrients: [], sparseNutrients: [], daysLogged: 0, anyData: false };
  }
}

// ── 4. Bad habits ─────────────────────────────────────────────────────────────
// Reads localStorage bad habit week log (bloom-bad-habit-week-{weekStart}).

export type BadHabitWeekLog = Record<string, { name: string; emoji: string; daily: { failed: boolean; healthPenalty: number }[] }>;

export function getWeeklyBadHabitSummary(
  badHabits: { key: string; name: string; emoji: string; healthPenalty: number }[],
  weekStart: string
): WeeklyBadHabitSummary {
  try {
    const storageKey = `bloom-bad-habit-week-${weekStart}`;
    const raw = localStorage.getItem(storageKey);
    const weekLog: Record<string, { failed: boolean; healthPenalty: number }[]> = raw ? JSON.parse(raw) : {};

    const violations = badHabits.map((h) => {
      const daily = weekLog[h.key] || [];
      const failedDays = daily.filter((d) => d.failed);
      return {
        name: h.name,
        emoji: h.emoji,
        count: failedDays.length,
        healthLost: failedDays.reduce((s, d) => s + (d.healthPenalty || h.healthPenalty), 0),
      };
    }).filter((v) => v.count > 0);

    return {
      violations,
      totalViolations: violations.reduce((s, v) => s + v.count, 0),
      totalHealthLost: violations.reduce((s, v) => s + v.healthLost, 0),
    };
  } catch {
    return { violations: [], totalViolations: 0, totalHealthLost: 0 };
  }
}

// ── 5. Save reflection to Supabase ───────────────────────────────────────────

export async function saveWeeklyReflection(
  userId: string,
  weekStart: string,
  data: WeeklyReflectionData,
  reflection: {
    whatWorked: string;
    whatChallenging: string;
    intention: string;
    energyRating: number;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase.from('weekly_reflections').upsert({
      user_id: userId,
      week_start: weekStart,

      habit_pct: data.habits.pct,
      mindfulness_pct: data.habits.mindfulnessPct,
      movement_pct: data.habits.movementPct,

      avg_quality: data.sleep.avgQuality,
      sleep_consistency_min: data.sleep.consistencyMin,
      avg_bedtime: data.sleep.avgBedtimeLabel,
      avg_wake: data.sleep.avgWakeLabel,

      top_nutrients: data.nutrition.topNutrients.map((n) => n.key),
      sparse_nutrients: data.nutrition.sparseNutrients.map((n) => n.key),
      nourish_days: data.nutrition.daysLogged,

      bad_habit_violations: data.badHabits.totalViolations,
      bad_habit_health_lost: data.badHabits.totalHealthLost,

      reflection_what_worked: reflection.whatWorked,
      reflection_what_challenging: reflection.whatChallenging,
      reflection_intention: reflection.intention,
      energy_rating: reflection.energyRating,
    }, { onConflict: 'user_id,week_start' });

    return !error;
  } catch {
    return false;
  }
}

// ── Reflection schedule helpers ──────────────────────────────────────────────

export function shouldTriggerReflection(
  reflectionDay: number,   // 0=Sun, 1=Mon … 6=Sat
  reflectionTime: string,  // "HH:MM"
  lastReflectionWeekStart: string | null
): boolean {
  const now = new Date();
  const todayDay = now.getDay();
  if (todayDay !== reflectionDay) return false;

  const [hour, minute] = reflectionTime.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const targetMins = hour * 60 + minute;
  if (nowMins < targetMins) return false;

  // Don't re-trigger if already done this week
  const currentWeekStart = getWeekStartStr();
  if (lastReflectionWeekStart === currentWeekStart) return false;

  return true;
}

export const REFLECTION_DAY_OPTIONS = [
  { label: 'Sunday 7pm',  day: 0, time: '19:00' },
  { label: 'Monday 9am',  day: 1, time: '09:00' },
  { label: 'Friday 6pm',  day: 5, time: '18:00' },
];
