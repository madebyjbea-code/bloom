// lib/habitScheduling.ts
// Supabase operations for habit scheduling

import { supabase } from './supabase';

export type HabitSchedule = {
  id: string;
  user_id: string;
  habit_key: string;
  habit_name: string;
  scheduled_date: string;  // YYYY-MM-DD
  scheduled_time: string;  // HH:MM
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'missed' | 'rescheduled';
  calendar_event_id: string | null;
  reschedule_count: number;
  completed_at: string | null;
  coins_earned: number | null;
  ge_earned: number | null;
  created_at: string;
};

// Get all schedules for a user on a specific date
export async function getSchedulesForDate(userId: string, date: string): Promise<HabitSchedule[]> {
  try {
    const { data } = await supabase
      .from('habit_schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('scheduled_date', date)
      .order('scheduled_time', { ascending: true });
    return (data as HabitSchedule[]) || [];
  } catch {
    return [];
  }
}

// Get next upcoming scheduled habit
export async function getNextScheduledHabit(userId: string): Promise<HabitSchedule | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString().slice(11, 16);  // HH:MM

    const { data } = await supabase
      .from('habit_schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .limit(1)
      .single();

    return (data as HabitSchedule) || null;
  } catch {
    return null;
  }
}

// Create a scheduled habit slot
export async function createHabitSchedule(userId: string, input: {
  habit_key: string;
  habit_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes?: number;
  calendar_event_id?: string;
}): Promise<HabitSchedule | null> {
  try {
    const { data } = await supabase
      .from('habit_schedules')
      .insert({
        user_id: userId,
        habit_key: input.habit_key,
        habit_name: input.habit_name,
        scheduled_date: input.scheduled_date,
        scheduled_time: input.scheduled_time,
        duration_minutes: input.duration_minutes || 30,
        calendar_event_id: input.calendar_event_id || null,
        status: 'scheduled',
      })
      .select()
      .single();
    return (data as HabitSchedule) || null;
  } catch {
    return null;
  }
}

// Mark a scheduled habit as completed
export async function completeHabitSchedule(
  scheduleId: string,
  coinsEarned: number = 0,
  geEarned: number = 0
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('habit_schedules')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        coins_earned: coinsEarned,
        ge_earned: geEarned,
      })
      .eq('id', scheduleId);
    return !error;
  } catch {
    return false;
  }
}

// Mark a scheduled habit as missed
export async function markHabitScheduleMissed(scheduleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('habit_schedules')
      .update({ status: 'missed' })
      .eq('id', scheduleId);
    return !error;
  } catch {
    return false;
  }
}

// Offer reschedule (increment count, suggest new time)
export async function suggestReschedule(
  scheduleId: string,
  newDate: string,
  newTime: string
): Promise<boolean> {
  try {
    const { data: schedule } = await supabase
      .from('habit_schedules')
      .select('reschedule_count')
      .eq('id', scheduleId)
      .single();

    if (!schedule) return false;

    const { error } = await supabase
      .from('habit_schedules')
      .update({
        reschedule_count: (schedule.reschedule_count || 0) + 1,
        reschedule_suggested_date: newDate,
        reschedule_suggested_time: newTime,
      })
      .eq('id', scheduleId);

    return !error;
  } catch {
    return false;
  }
}

// Accept reschedule suggestion
export async function acceptReschedule(scheduleId: string): Promise<boolean> {
  try {
    const { data: schedule } = await supabase
      .from('habit_schedules')
      .select('reschedule_suggested_date, reschedule_suggested_time')
      .eq('id', scheduleId)
      .single();

    if (!schedule) return false;

    const { error } = await supabase
      .from('habit_schedules')
      .update({
        status: 'rescheduled',
        scheduled_date: schedule.reschedule_suggested_date,
        scheduled_time: schedule.reschedule_suggested_time,
        reschedule_suggested_date: null,
        reschedule_suggested_time: null,
      })
      .eq('id', scheduleId);

    return !error;
  } catch {
    return false;
  }
}

// Get schedules for a date range
export async function getSchedulesForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, HabitSchedule[]>> {
  try {
    const { data } = await supabase
      .from('habit_schedules')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true });

    const grouped: Record<string, HabitSchedule[]> = {};
    (data as HabitSchedule[]).forEach((s) => {
      if (!grouped[s.scheduled_date]) grouped[s.scheduled_date] = [];
      grouped[s.scheduled_date].push(s);
    });
    return grouped;
  } catch {
    return {};
  }
}
