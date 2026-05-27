import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Habit = {
  key: string;
  name: string;
  emoji: string;
  category: 'sleep' | 'nutrition' | 'movement' | 'mindfulness' | 'wellness';
  coins: number;
  ge: number;
  time?: string;
  isQuit: boolean;
  isCustom?: boolean;
};

export type BadHabit = {
  key: string;
  name: string;
  emoji: string;
  type: 'binary' | 'quantitative';
  unit?: string;
  threshold?: number;
  healthPenalty: number;
};

export type BadHabitLog = {
  did_it?: boolean;   // binary habits
  amount?: number;    // quantitative habits
  failed: boolean;    // true = penalty applied
};

type StoreState = {
  // Auth
  userId: string | null;
  accessCode: string | null;

  // Profile
  name: string | null;
  avatarType: 'pet' | 'mini-me' | 'simple';
  avatarName: string | null;
  avatarEmoji: string | null;

  // Avatar customisation (DiceBear personas fields)
  avatarSkin: string;
  avatarHair: string;
  avatarHairColor: string;
  avatarEyes: string;
  avatarMouth: string;
  avatarAccessory: string | null;
  avatarBg: string;

  // Archetype
  archetypeKey: string | null;
  archetypeName: string | null;
  archetypeIcon: string | null;

  // Chronotype + level
  chronotype: 'lion' | 'bear' | 'wolf' | 'dolphin' | null;
  lifestyleLevel: 'foundation' | 'building' | 'optimization' | 'advanced' | null;

  // Quiz answers
  nutBarrier: string | null;
  movTime: string | null;
  activity: string | null;
  stress: string | null;
  stressMgmt: string | null;
  morning: string | null;
  goals: string[];
  drain: string[];

  // Stats
  health: number;
  coins: number;
  greenEnergy: number;
  level: number;

  // Good habits
  habits: Habit[];
  customHabits: Habit[];
  completedToday: string[];
  lastCompletionDate: string | null;

  // Bad habits
  badHabits: BadHabit[];
  badHabitLogsToday: Record<string, BadHabitLog>; // { habitKey: log }
  lastBadHabitLogDate: string | null;             // YYYY-MM-DD for daily reset

  // Rest days
  isRestDayToday: boolean;
  restDayReason: string | null;
  restDaysThisWeek: number;
  restWeekStart: string | null; // YYYY-MM-DD of Monday this week

  // Health decay
  lastDecayDate: string | null; // YYYY-MM-DD — skip decay if already ran today

  // Actions — profile
  setUser: (userData: Partial<StoreState>) => void;
  setStats: (stats: Partial<Pick<StoreState, 'health' | 'coins' | 'greenEnergy' | 'level'>>) => void;

  // Actions — good habits
  setHabits: (habits: Habit[]) => void;
  addCustomHabit: (habit: Habit) => void;
  removeCustomHabit: (key: string) => void;
  toggleHabit: (habitKey: string) => void;
  checkDailyReset: () => void;

  // Actions — bad habits
  addBadHabit: (habit: BadHabit) => void;
  removeBadHabit: (key: string) => void;
  logBadHabit: (habitKey: string, log: BadHabitLog) => void;
  clearBadHabitLog: (habitKey: string) => void;
  checkBadHabitDailyReset: () => void;

  // Actions — rest days
  setRestDay: (isRest: boolean, reason: string | null) => void;
  setRestDaysThisWeek: (count: number, weekStart: string) => void;

  // Actions — health decay
  applyDailyDecay: () => { decayed: boolean; newHealth: number };

  // Reset
  reset: () => void;
};

const defaults: Partial<StoreState> = {
  userId: null,
  accessCode: null,
  name: null,
  avatarType: 'pet',
  avatarName: null,
  avatarEmoji: '🦔',

  // Avatar customisation defaults
  avatarSkin: 'light',
  avatarHair: 'short01',
  avatarHairColor: 'brown',
  avatarEyes: 'variant01',
  avatarMouth: 'happy01',
  avatarAccessory: null,
  avatarBg: 'b6e3f4',

  archetypeKey: null,
  archetypeName: null,
  archetypeIcon: null,
  chronotype: null,
  lifestyleLevel: null,
  nutBarrier: null,
  movTime: null,
  activity: null,
  stress: null,
  stressMgmt: null,
  morning: null,
  goals: [],
  drain: [],
  health: 78,
  coins: 0,
  greenEnergy: 0,
  level: 1,
  habits: [],
  customHabits: [],
  completedToday: [],
  lastCompletionDate: null,

  badHabits: [],
  badHabitLogsToday: {},
  lastBadHabitLogDate: null,

  isRestDayToday: false,
  restDayReason: null,
  restDaysThisWeek: 0,
  restWeekStart: null,

  lastDecayDate: null,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...(defaults as StoreState),

      // ── Profile ──────────────────────────────────────────
      setUser: (userData) => set(userData),
      setStats: (stats) => set(stats),

      // ── Good habits ──────────────────────────────────────
      setHabits: (habits) => set({ habits }),

      addCustomHabit: (habit) => {
        const { customHabits } = get();
        if (customHabits.some(h => h.key === habit.key)) return;
        set({ customHabits: [...customHabits, habit] });
      },

      removeCustomHabit: (key) => {
        const { customHabits, completedToday } = get();
        set({
          customHabits: customHabits.filter(h => h.key !== key),
          completedToday: completedToday.filter(k => k !== key),
        });
      },

      toggleHabit: (habitKey) => {
        const { completedToday } = get();
        const isCompleted = completedToday.includes(habitKey);
        set({
          completedToday: isCompleted
            ? completedToday.filter(k => k !== habitKey)
            : [...completedToday, habitKey],
        });
      },

      checkDailyReset: () => {
        const { lastCompletionDate } = get();
        const today = new Date().toISOString().split('T')[0];
        if (lastCompletionDate !== today) {
          set({ completedToday: [], lastCompletionDate: today });
        }
      },

      // ── Bad habits ───────────────────────────────────────
      addBadHabit: (habit) => {
        const { badHabits } = get();
        if (badHabits.some(h => h.key === habit.key)) return;
        set({ badHabits: [...badHabits, habit] });
      },

      removeBadHabit: (key) => {
        const { badHabits, badHabitLogsToday } = get();
        const updatedLogs = { ...badHabitLogsToday };
        delete updatedLogs[key];
        set({
          badHabits: badHabits.filter(h => h.key !== key),
          badHabitLogsToday: updatedLogs,
        });
      },

      logBadHabit: (habitKey, log) => {
        const { badHabitLogsToday } = get();
        set({ badHabitLogsToday: { ...badHabitLogsToday, [habitKey]: log } });
      },

      clearBadHabitLog: (habitKey) => {
        const { badHabitLogsToday } = get();
        const updated = { ...badHabitLogsToday };
        delete updated[habitKey];
        set({ badHabitLogsToday: updated });
      },

      checkBadHabitDailyReset: () => {
        const { lastBadHabitLogDate } = get();
        const today = new Date().toISOString().split('T')[0];
        if (lastBadHabitLogDate !== today) {
          set({ badHabitLogsToday: {}, lastBadHabitLogDate: today });
        }

        // Also reset rest day status at midnight
        // Keep restDaysThisWeek but check if we're in a new week (Monday reset)
        const { restWeekStart, restDaysThisWeek } = get();
        const todayDate = new Date();
        const dayOfWeek = todayDate.getDay(); // 0=Sun, 1=Mon
        const monday = new Date(todayDate);
        monday.setDate(todayDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const mondayStr = monday.toISOString().split('T')[0];

        if (restWeekStart !== mondayStr) {
          // New week — reset weekly rest day counter, but keep today's rest status
          set({ restDaysThisWeek: 0, restWeekStart: mondayStr });
        }

        // Reset today's rest status (only persists for the day it was set)
        const { isRestDayToday, lastBadHabitLogDate: prevDate } = get();
        if (isRestDayToday && prevDate !== today) {
          set({ isRestDayToday: false, restDayReason: null });
        }
      },

      // ── Rest days ────────────────────────────────────────
      setRestDay: (isRest, reason) => {
        set({ isRestDayToday: isRest, restDayReason: reason });
      },

      setRestDaysThisWeek: (count, weekStart) => {
        set({ restDaysThisWeek: count, restWeekStart: weekStart });
      },

      // ── Health decay ─────────────────────────────────────
      // Call this on app load. Returns whether decay was applied and the new health value.
      // The caller (Dashboard) is responsible for persisting to user_stats in Supabase.
      applyDailyDecay: () => {
        const { lastDecayDate, isRestDayToday, health } = get();
        const today = new Date().toISOString().split('T')[0];

        // Already decayed today, or it's a rest day — skip
        if (lastDecayDate === today || isRestDayToday) {
          return { decayed: false, newHealth: health };
        }

        const BASELINE_DECAY = 2;  // per day, earned back by completing habits
        const FLOOR = 10;          // health never drops below this

        const newHealth = Math.max(FLOOR, health - BASELINE_DECAY);
        set({ health: newHealth, lastDecayDate: today });
        return { decayed: true, newHealth };
      },

      // ── Reset ────────────────────────────────────────────
      reset: () => set(defaults as StoreState),
    }),
    {
      name: 'bloom-storage',
      partialize: (state) => ({
        // Auth
        userId: state.userId,
        accessCode: state.accessCode,
        // Profile
        name: state.name,
        avatarType: state.avatarType,
        avatarName: state.avatarName,
        avatarEmoji: state.avatarEmoji,
        // Avatar customisation
        avatarSkin: state.avatarSkin,
        avatarHair: state.avatarHair,
        avatarHairColor: state.avatarHairColor,
        avatarEyes: state.avatarEyes,
        avatarMouth: state.avatarMouth,
        avatarAccessory: state.avatarAccessory,
        avatarBg: state.avatarBg,
        // Archetype
        archetypeKey: state.archetypeKey,
        archetypeName: state.archetypeName,
        archetypeIcon: state.archetypeIcon,
        // Program
        chronotype: state.chronotype,
        lifestyleLevel: state.lifestyleLevel,
        // Stats
        health: state.health,
        coins: state.coins,
        greenEnergy: state.greenEnergy,
        level: state.level,
        // Good habits
        habits: state.habits,
        customHabits: state.customHabits,
        completedToday: state.completedToday,
        lastCompletionDate: state.lastCompletionDate,
        // Bad habits
        badHabits: state.badHabits,
        badHabitLogsToday: state.badHabitLogsToday,
        lastBadHabitLogDate: state.lastBadHabitLogDate,
        // Rest days
        isRestDayToday: state.isRestDayToday,
        restDayReason: state.restDayReason,
        restDaysThisWeek: state.restDaysThisWeek,
        restWeekStart: state.restWeekStart,
        // Health decay
        lastDecayDate: state.lastDecayDate,
      }),
    }
  )
);
