// ============================================================================
// lib/goalsTasks.ts   →   src/lib/goalsTasks.ts   (REWRITE — new state model)
//
// Goal and Habit are no longer two separate things where one graduates into
// the other permanently. They're ONE thing — a `goals` row — moving between
// two states over its life:
//
//   state = 'goal'      → being proven. Weekly progress counted from
//                          goal_logs against weekly_target. Enough
//                          consecutive weeks (graduation_threshold) flips it.
//   state = 'is_habit'  → established. Weekly progress now reads from the
//                          REAL habit_completions/habit_streaks tables via
//                          linked_habit_key — the actual daily habit toggle
//                          elsewhere in the app IS how you interact with it
//                          now, not a separate log button here.
//
// Falling off: if the linked habit's current_streak hits 0, state reverts to
// 'goal' — same weekly_target as before, re-proving from scratch. Pushing
// for a HIGHER target while already is_habit also flips back to 'goal'
// (a new, unproven target needs its own proving period).
//
// Tasks are unchanged from the original design — still a due-dated,
// distinct-count experiment, no state machine needed there.
// ============================================================================

import { supabase } from './supabase';

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  category: string | null;
  weekly_target: number;
  due_date: string | null;
  is_custom: boolean;
  status: 'active' | 'archived';
  state: 'goal' | 'is_habit';
  linked_habit_key: string | null;
  consecutive_weeks_hit: number;
  graduation_threshold: number;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  category: string | null;
  target_count: number;
  due_date: string;
  is_custom: boolean;
  status: 'active' | 'completed' | 'expired' | 'archived';
  created_at: string;
};

export type GoalWeekResult = {
  id: string;
  goal_id: string;
  week_start: string;
  achieved_count: number;
  target: number;
  outcome: 'full' | 'partial_pass' | 'reset';
  reflection_prompted: boolean;
  reflection_response: string | null;
};

export type GraduationEvent = {
  goal: Goal;
  habitToCreate: {
    key: string; name: string; emoji: string; category: string;
    coins: number; ge: number; time: string; isQuit: boolean; isCustom: boolean;
  } | null; // null when linking to an ALREADY-EXISTING habit — nothing new to create
};

export type FallOffEvent = { goal: Goal };

export type WeekProcessResult = {
  goal: Goal;
  weeksEvaluated: GoalWeekResult[];
  graduation: GraduationEvent | null;
  fellOff: FallOffEvent | null;
};

// ── Suggested habits to build toward — shared by Home and the Goals & Tasks
// tab, so there's one source of truth instead of two content lists drifting
// apart. Names are written as the DESTINATION ("Daily movement"), not the
// weekly mechanics ("Workout 3x this week") — the weekly_target is the
// starting point once adopted, shown separately, not part of the headline.
// Starter draft, not final copy — archetype taxonomy has shifted before, so
// there's a 'default' fallback for anything not explicitly covered here.
export const SUGGESTED_HABITS_TO_BUILD: Record<string, {
  name: string; emoji: string; category: string; weekly_target: number; why: string;
}[]> = {
  burnout: [
    { name: 'Rest before 10pm', emoji: '😴', category: 'wellness', weekly_target: 4, why: 'Consistent early rest is the highest-leverage recovery lever for burnout.' },
    { name: 'A no-obligation evening', emoji: '🕊️', category: 'mindfulness', weekly_target: 1, why: 'Unstructured recovery time prevents chronic stress accumulation.' },
  ],
  nightowl: [
    { name: 'Morning light exposure', emoji: '🌅', category: 'wellness', weekly_target: 5, why: 'Early light exposure gradually shifts a late circadian rhythm earlier.' },
    { name: 'Screens off before bed', emoji: '📵', category: 'mindfulness', weekly_target: 4, why: 'Reduces the blue-light delay to an already-late sleep onset.' },
  ],
  optimizer: [
    { name: 'Regular workout habit', emoji: '💪', category: 'movement', weekly_target: 3, why: 'Three structured sessions/week builds compounding fitness gains without overtraining risk.' },
    { name: 'Zone 2 cardio', emoji: '🚴', category: 'movement', weekly_target: 2, why: 'Zone 2 training is the most efficient aerobic base builder.' },
  ],
  scattered: [
    { name: 'Daily focus block', emoji: '⏱', category: 'mindfulness', weekly_target: 4, why: 'Regular time-boxed focus is the highest-ROI intervention for scattered attention.' },
  ],
  nurturer: [
    { name: 'Time just for you', emoji: '🌷', category: 'wellness', weekly_target: 2, why: 'Deliberate self-directed time protects against caregiver burnout.' },
  ],
  steadybuilder: [
    { name: 'Regular workout habit', emoji: '💪', category: 'movement', weekly_target: 3, why: 'A steady 3x/week cadence compounds reliably over months.' },
  ],
  default: [
    { name: 'Daily movement', emoji: '💪', category: 'movement', weekly_target: 3, why: 'Regular movement is one of the most consistently evidence-backed wellness levers.' },
    { name: 'Evening wind-down ritual', emoji: '🌙', category: 'wellness', weekly_target: 4, why: 'A consistent pre-sleep routine improves sleep quality over time.' },
  ],
};


export function getWeekStart(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ── Goals CRUD ───────────────────────────────────────────────────────────────
export async function getGoals(userId: string): Promise<Goal[]> {
  if (!userId) return [];
  try {
    const { data } = await supabase.from('goals').select('*').eq('user_id', userId).eq('status', 'active');
    return (data as Goal[]) || [];
  } catch { return []; }
}

export async function createGoal(userId: string, input: {
  name: string; emoji?: string; category?: string; weekly_target: number;
  due_date?: string | null; is_custom?: boolean; graduation_threshold?: number;
  linked_habit_key?: string; // set when this goal is re-proving a SPECIFIC existing
  // habit (e.g. a demoted habit getting a starting frequency) — ties it to that
  // habit from creation, not just at graduation like a brand-new goal would.
}): Promise<Goal | null> {
  try {
    const { data } = await supabase.from('goals').insert({
      user_id: userId, name: input.name, emoji: input.emoji || '🎯',
      category: input.category || null, weekly_target: input.weekly_target,
      due_date: input.due_date || null, is_custom: input.is_custom ?? true,
      graduation_threshold: input.graduation_threshold ?? 6, state: 'goal',
      linked_habit_key: input.linked_habit_key || null,
    }).select().single();
    return (data as Goal) || null;
  } catch { return null; }
}

export async function logGoalInstance(goalId: string, userId: string, date?: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('goal_logs').insert({ goal_id: goalId, user_id: userId, date: date || new Date().toISOString().split('T')[0] });
    return !error;
  } catch { return false; }
}

export async function getGoalWeekCount(goalId: string, weekStart: string): Promise<number> {
  try {
    const weekEnd = addDays(weekStart, 6);
    const { data } = await supabase.from('goal_logs').select('id').eq('goal_id', goalId).gte('date', weekStart).lte('date', weekEnd);
    return data?.length || 0;
  } catch { return 0; }
}

// Weekly progress for an is_habit-state goal reads from the REAL habit
// completions, not goal_logs — this goal is just a lens on the actual habit.
export async function getHabitWeekCount(habitKey: string, userId: string, weekStart: string): Promise<number> {
  try {
    const weekEnd = addDays(weekStart, 6);
    const { data } = await supabase.from('habit_completions').select('id').eq('user_id', userId).eq('habit_key', habitKey).gte('date', weekStart).lte('date', weekEnd);
    return data?.length || 0;
  } catch { return 0; }
}

async function getHabitCurrentStreak(habitKey: string, userId: string): Promise<number> {
  try {
    const { data } = await supabase.from('habit_streaks').select('current_streak').eq('user_id', userId).eq('habit_key', habitKey).maybeSingle();
    return data?.current_streak || 0;
  } catch { return 0; }
}

// Push for a higher frequency on an already-established habit — this is a
// deliberate step DOWN into 'goal' state for the new, unproven target.
export async function increaseGoalTarget(goalId: string, newTarget: number): Promise<boolean> {
  try {
    const { error } = await supabase.from('goals').update({
      weekly_target: newTarget, state: 'goal', consecutive_weeks_hit: 0,
    }).eq('id', goalId);
    return !error;
  } catch { return false; }
}

// ── Grandfathering — one-time, idempotent ───────────────────────────────────
// For every habit the person already has a real streak on, create a goals
// row already in is_habit state, linked to it. No history moves or gets
// copied — the habit stays exactly as it is; this just gives it a Goals-tab
// presence saying "this one's already proven." Safe to call more than once —
// skips any habit that already has a linked goals row.
export async function grandfatherExistingHabits(
  userId: string,
  allHabits: { key: string; name: string; emoji: string; category: string }[],
): Promise<number> {
  if (!userId) return 0;
  try {
    const [{ data: existingGoals }, { data: streaks }] = await Promise.all([
      supabase.from('goals').select('linked_habit_key').eq('user_id', userId).not('linked_habit_key', 'is', null),
      supabase.from('habit_streaks').select('habit_key, current_streak').eq('user_id', userId),
    ]);
    const alreadyLinked = new Set((existingGoals || []).map((g: any) => g.linked_habit_key));
    const provenHabits = (streaks || []).filter((s: any) => (s.current_streak || 0) > 0 && !alreadyLinked.has(s.habit_key));

    let created = 0;
    for (const s of provenHabits) {
      const meta = allHabits.find(h => h.key === s.habit_key);
      if (!meta) continue; // habit definition not found in current catalog — skip rather than guess
      const { error } = await supabase.from('goals').insert({
        user_id: userId, name: meta.name, emoji: meta.emoji, category: meta.category,
        weekly_target: 7, // existing habits are daily-toggle — 7x/week is their real cadence
        is_custom: false, state: 'is_habit', linked_habit_key: meta.key,
        consecutive_weeks_hit: 6, graduation_threshold: 6, // already proven — not re-earning history
      });
      if (!error) created++;
    }
    return created;
  } catch { return 0; }
}

// ── Weekly evaluation (goal-state only) ─────────────────────────────────────
function classifyWeek(achieved: number, target: number): 'full' | 'partial_pass' | 'reset' {
  if (achieved >= target) return 'full';
  if (achieved > target / 2) return 'partial_pass';
  return 'reset';
}

async function evaluateGoalWeek(goal: Goal, weekStart: string): Promise<{ result: GoalWeekResult; graduation: GraduationEvent | null } | null> {
  const { data: existing } = await supabase.from('goal_week_results').select('id').eq('goal_id', goal.id).eq('week_start', weekStart).maybeSingle();
  if (existing) return null;

  const achieved = await getGoalWeekCount(goal.id, weekStart);
  const outcome = classifyWeek(achieved, goal.weekly_target);
  const shouldPrompt = outcome === 'partial_pass';

  const { data: resultRow, error: insertError } = await supabase.from('goal_week_results').insert({
    goal_id: goal.id, user_id: goal.user_id, week_start: weekStart,
    achieved_count: achieved, target: goal.weekly_target, outcome,
    reflection_prompted: shouldPrompt,
  }).select().single();

  // Insert can fail here if two calls race (e.g. React StrictMode double-firing
  // effects in dev) and both try to insert the same goal_id+week_start —
  // the unique constraint catches the second one. Skip rather than crash.
  if (insertError || !resultRow) return null;

  const newStreak = outcome === 'reset' ? 0 : goal.consecutive_weeks_hit + 1;
  let graduation: GraduationEvent | null = null;

  if (outcome === 'reset') {
    await supabase.from('goals').update({ consecutive_weeks_hit: 0 }).eq('id', goal.id);
  } else if (newStreak >= goal.graduation_threshold) {
    // Graduation — flips to is_habit state. If this goal was created fresh
    // (no linked habit yet), a new custom habit gets created now.
    const habitKey = goal.linked_habit_key || `graduated_${goal.id.slice(0, 8)}`;
    const habitToCreate = goal.linked_habit_key ? null : {
      key: habitKey, name: goal.name, emoji: goal.emoji || '🎯',
      category: goal.category || 'wellness', coins: 20, ge: 0, time: '',
      isQuit: false, isCustom: true,
    };
    await supabase.from('goals').update({
      state: 'is_habit', consecutive_weeks_hit: newStreak, linked_habit_key: habitKey,
    }).eq('id', goal.id);
    graduation = { goal: { ...goal, state: 'is_habit', linked_habit_key: habitKey }, habitToCreate };
  } else {
    await supabase.from('goals').update({ consecutive_weeks_hit: newStreak }).eq('id', goal.id);
  }

  return { result: resultRow as GoalWeekResult, graduation };
}

// ── Entry point — call once whenever the Goals screen loads ────────────────
// Handles both directions: proving goal-state goals toward graduation, AND
// checking is_habit-state goals for a broken streak (falling back to goal).
export async function checkAndProcessGoals(userId: string): Promise<WeekProcessResult[]> {
  const goals = await getGoals(userId);
  const currentWeekStart = getWeekStart();
  const results: WeekProcessResult[] = [];

  for (const goal of goals) {
    // ── is_habit state: just check whether the streak broke ──
    if (goal.state === 'is_habit') {
      if (!goal.linked_habit_key) continue;
      const streak = await getHabitCurrentStreak(goal.linked_habit_key, userId);
      if (streak === 0) {
        await supabase.from('goals').update({ state: 'goal', consecutive_weeks_hit: 0 }).eq('id', goal.id);
        results.push({ goal: { ...goal, state: 'goal', consecutive_weeks_hit: 0 }, weeksEvaluated: [], graduation: null, fellOff: { goal } });
      }
      continue;
    }

    // ── goal state: walk forward through completed weeks ──
    const weeksEvaluated: GoalWeekResult[] = [];
    let graduation: GraduationEvent | null = null;
    let cursor = getWeekStart(new Date(goal.created_at));

    while (cursor < currentWeekStart && !graduation) {
      const outcome = await evaluateGoalWeek(goal, cursor);
      if (outcome) {
        weeksEvaluated.push(outcome.result);
        if (outcome.graduation) graduation = outcome.graduation;
      }
      cursor = addDays(cursor, 7);
    }

    if (weeksEvaluated.length > 0 || graduation) {
      results.push({ goal, weeksEvaluated, graduation, fellOff: null });
    }
  }

  return results;
}

export async function submitGoalReflection(goalWeekResultId: string, responseText: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('goal_week_results').update({ reflection_response: responseText }).eq('id', goalWeekResultId);
    return !error;
  } catch { return false; }
}

// ── Tasks (unchanged from original design) ──────────────────────────────────
export async function getTasks(userId: string): Promise<Task[]> {
  if (!userId) return [];
  try {
    await expireOldTasks(userId);
    const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).eq('status', 'active');
    return (data as Task[]) || [];
  } catch { return []; }
}

export async function createTask(userId: string, input: {
  name: string; emoji?: string; category?: string; target_count?: number;
  due_date: string; is_custom?: boolean;
}): Promise<Task | null> {
  try {
    const { data } = await supabase.from('tasks').insert({
      user_id: userId, name: input.name, emoji: input.emoji || '📌',
      category: input.category || null, target_count: input.target_count ?? 1,
      due_date: input.due_date, is_custom: input.is_custom ?? true,
    }).select().single();
    return (data as Task) || null;
  } catch { return null; }
}

export async function logTaskInstance(taskId: string, userId: string, entryLabel: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('task_logs').insert({ task_id: taskId, user_id: userId, entry_label: entryLabel });
    if (error) return false;
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
    if (task) {
      const { data: logs } = await supabase.from('task_logs').select('entry_label').eq('task_id', taskId);
      const distinctCount = new Set((logs || []).map((l: any) => l.entry_label.toLowerCase())).size;
      if (distinctCount >= (task as Task).target_count) {
        await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId);
      }
    }
    return true;
  } catch { return false; }
}

export async function getTaskDistinctCount(taskId: string): Promise<number> {
  try {
    const { data } = await supabase.from('task_logs').select('entry_label').eq('task_id', taskId);
    return new Set((data || []).map((l: any) => l.entry_label.toLowerCase())).size;
  } catch { return 0; }
}

async function expireOldTasks(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  try {
    await supabase.from('tasks').update({ status: 'expired' }).eq('user_id', userId).eq('status', 'active').lt('due_date', today);
  } catch { /* best-effort */ }
}
