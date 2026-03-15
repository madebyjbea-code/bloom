// ============================================
// BLOOM — Supabase Client
// ============================================
// This file connects your app to your database.
// Every time you want to save or read data,
// it goes through this file.
// ============================================

import { createClient } from '@supabase/supabase-js'

// These values come from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// The main database client — used throughout the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// AUTH HELPERS
// ============================================

export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName }
    }
  })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ============================================
// HABIT HELPERS
// ============================================

// Get all habits for the logged-in user
export async function getUserHabits(userId: string) {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  return { data, error }
}

// Log a habit as complete (or incomplete) for today
export async function logHabit(habitId: string, userId: string, completed: boolean) {
  const today = new Date().toISOString().split('T')[0]  // "2024-03-11"

  // Check if already logged today
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .gte('logged_at', today)
    .single()

  if (existing) {
    // Update existing log
    const { data, error } = await supabase
      .from('habit_logs')
      .update({ completed })
      .eq('id', existing.id)
    return { data, error }
  } else {
    // Create new log
    const { data, error } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, user_id: userId, completed, logged_at: new Date().toISOString() })
    return { data, error }
  }
}

// Get today's habit logs for a user
export async function getTodayLogs(userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*, habits(*)')
    .eq('user_id', userId)
    .gte('logged_at', today)
  return { data, error }
}

// ============================================
// COINS & GREEN ENERGY HELPERS
// ============================================

// Add coins to user's balance (called when habit is completed)
export async function addCoins(userId: string, amount: number) {
  const { data, error } = await supabase.rpc('increment_coins', {
    user_id_input: userId,
    amount_input: amount
  })
  return { data, error }
}

// Add Green Energy to user's balance
export async function addGreenEnergy(userId: string, amount: number, source: string, habitId?: string) {
  // Log the GE transaction
  await supabase.from('green_energy_logs').insert({
    user_id: userId,
    amount,
    source,
    habit_id: habitId,
    logged_at: new Date().toISOString()
  })

  // Update user's total GE
  const { data, error } = await supabase.rpc('increment_green_energy', {
    user_id_input: userId,
    amount_input: amount
  })
  return { data, error }
}

// ============================================
// HEALTH REMINDERS HELPERS
// ============================================

// Get active reminders for a user
export async function getActiveReminders(userId: string) {
  const { data, error } = await supabase
    .from('health_reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .order('due_date', { ascending: true })
  return { data, error }
}

// Dismiss a reminder
export async function dismissReminder(reminderId: string) {
  const { data, error } = await supabase
    .from('health_reminders')
    .update({ is_dismissed: true })
    .eq('id', reminderId)
  return { data, error }
}

// ============================================
// CYCLE TRACKING HELPERS
// ============================================

export async function logPeriodStart(userId: string, startDate: string) {
  const { data, error } = await supabase
    .from('cycle_logs')
    .insert({ user_id: userId, period_start: startDate })
  return { data, error }
}

export async function getLatestCycleLog(userId: string) {
  const { data, error } = await supabase
    .from('cycle_logs')
    .select('*')
    .eq('user_id', userId)
    .order('period_start', { ascending: false })
    .limit(1)
    .single()
  return { data, error }
}

// Calculate current cycle phase based on last period start
export function getCurrentCyclePhase(lastPeriodStart: string, averageCycleLength = 28) {
  const start = new Date(lastPeriodStart)
  const today = new Date()
  const dayOfCycle = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  if (dayOfCycle <= 5) return 'menstrual'
  if (dayOfCycle <= 13) return 'follicular'
  if (dayOfCycle <= 16) return 'ovulatory'
  return 'luteal'
}

// ============================================
// SLEEP HELPERS
// ============================================

export async function logSleep(userId: string, bedtime: string, wakeTime: string, source = 'manual') {
  const durationMs = new Date(wakeTime).getTime() - new Date(bedtime).getTime()
  const durationMinutes = Math.round(durationMs / 60000)

  const { data, error } = await supabase
    .from('sleep_logs')
    .insert({ user_id: userId, bedtime, wake_time: wakeTime, duration_minutes: durationMinutes, source })
  return { data, error }
}

export async function getRecentSleep(userId: string, days = 7) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false })
  return { data, error }
}

// ============================================
// COMMUNITY HELPERS
// ============================================

export async function getCommunityFeed(limit = 20) {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

export async function createPost(userId: string, content: string, postType: string) {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({ user_id: userId, content, post_type: postType, created_at: new Date().toISOString() })
  return { data, error }
}
