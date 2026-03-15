// ============================================
// BLOOM — Global App State
// ============================================
// Zustand is a simple way to share data between
// different parts of your app without passing
// it through every component manually.
//
// Think of this as the "brain" of the app —
// coins, habits, avatar state all live here.
// ============================================

import { create } from 'zustand'
import type { User, Habit, HabitLog, HealthReminder, CyclePhase } from '../types'
import { logHabit, addCoins, addGreenEnergy } from '../lib/supabase'

interface BloomStore {
  // --- State ---
  user: User | null
  habits: Habit[]
  todayLogs: Record<string, boolean>  // habitId → completed
  activeReminders: HealthReminder[]
  currentCyclePhase: CyclePhase | null
  isLoading: boolean

  // --- Actions ---
  setUser: (user: User | null) => void
  setHabits: (habits: Habit[]) => void
  setReminders: (reminders: HealthReminder[]) => void
  setCyclePhase: (phase: CyclePhase | null) => void
  toggleHabit: (habit: Habit) => Promise<void>
  spendCoins: (amount: number) => void
  donateGreenEnergy: (amount: number, org: string) => void
}

export const useBloomStore = create<BloomStore>((set, get) => ({
  // --- Initial State ---
  user: null,
  habits: [],
  todayLogs: {},
  activeReminders: [],
  currentCyclePhase: null,
  isLoading: false,

  // --- Setters ---
  setUser: (user) => set({ user }),
  setHabits: (habits) => set({ habits }),
  setReminders: (reminders) => set({ activeReminders: reminders }),
  setCyclePhase: (phase) => set({ currentCyclePhase: phase }),

  // --- Toggle a Habit ---
  toggleHabit: async (habit) => {
    const { user, todayLogs } = get()
    if (!user) return

    const wasCompleted = todayLogs[habit.id] || false
    const nowCompleted = !wasCompleted

    // Optimistic update — update UI immediately, save to DB in background
    set(state => ({
      todayLogs: { ...state.todayLogs, [habit.id]: nowCompleted },
      user: state.user ? {
        ...state.user,
        coins: state.user.coins + (nowCompleted ? habit.coin_reward : -habit.coin_reward),
        green_energy: state.user.green_energy + (nowCompleted ? habit.green_energy_reward : -habit.green_energy_reward),
        health_points: Math.max(0, Math.min(100,
          state.user.health_points + (nowCompleted ? habit.health_impact : -habit.health_impact)
        ))
      } : null
    }))

    // Save to database
    await logHabit(habit.id, user.id, nowCompleted)
    if (nowCompleted) {
      if (habit.coin_reward > 0) await addCoins(user.id, habit.coin_reward)
      if (habit.green_energy_reward > 0) {
        await addGreenEnergy(user.id, habit.green_energy_reward, `${habit.name} — habit completed`, habit.id)
      }
    }
  },

  // --- Spend Coins (shop purchases) ---
  spendCoins: (amount) => {
    set(state => ({
      user: state.user ? { ...state.user, coins: state.user.coins - amount } : null
    }))
  },

  // --- Donate Green Energy ---
  donateGreenEnergy: (amount, org) => {
    set(state => ({
      user: state.user ? { ...state.user, green_energy: state.user.green_energy - amount } : null
    }))
  },
}))

// Convenience selectors — use these in components
// instead of selecting the whole store

export const useUser = () => useBloomStore(s => s.user)
export const useHabits = () => useBloomStore(s => s.habits)
export const useTodayLogs = () => useBloomStore(s => s.todayLogs)
export const useCoins = () => useBloomStore(s => s.user?.coins ?? 0)
export const useGreenEnergy = () => useBloomStore(s => s.user?.green_energy ?? 0)
export const useHealthPoints = () => useBloomStore(s => s.user?.health_points ?? 50)
export const useCyclePhase = () => useBloomStore(s => s.currentCyclePhase)
