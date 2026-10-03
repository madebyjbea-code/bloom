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
  avatarScene: string | null; // purchased scenery key

  // Region — drives seasonal produce (In Season Now), independent of Notion.
  // Auto-detected from browser timezone on first load; user can override.
  region: string | null;

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
  badHabitLogsToday: Record<string, BadHabitLog>;
  lastBadHabitLogDate: string | null;

  // Rest days
  isRestDayToday: boolean;
  restDayReason: string | null;
  restDaysThisWeek: number;
  restWeekStart: string | null;

  // Health decay
  lastDecayDate: string | null;
  lastDecayAmount: number | null;   // how much the last overnight dip took (0 = none)
  lastDecayDetail: string | null;   // plain-language reason, shown in the health breakdown

  // Energy mode
  energyMode: 'low' | 'normal' | 'high' | null;
  energyModeDate: string | null;
  energyModeSetupDone: boolean;
  habitsByMode: { low: string[]; normal: string[]; high: string[] };
  todayHighSuggestion: string | null;

  // Actions — energy mode
  setEnergyMode: (mode: 'low' | 'normal' | 'high') => void;
  setEnergyModeDate: (date: string) => void;
  setEnergyModeSetupDone: (done: boolean) => void;
  setHabitsByMode: (stacks: { low: string[]; normal: string[]; high: string[] }) => void;
  addHabitToMode: (mode: 'low' | 'normal' | 'high', habitKey: string) => void;
  removeHabitFromMode: (mode: 'low' | 'normal' | 'high', habitKey: string) => void;
  setTodayHighSuggestion: (key: string | null) => void;

  // Actions — profile
  setUser: (userData: Partial<StoreState>) => void;
  setStats: (stats: Partial<Pick<StoreState, 'health' | 'coins' | 'greenEnergy' | 'level'>>) => void;
  setAvatarScene: (scene: string | null) => void;
  setRegion: (region: string | null) => void;

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
  applyDailyDecay: (userId?: string) => Promise<{ decayed: boolean; newHealth: number; totalDecay?: number }>;

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
  avatarSkin: 'eeb4a4',
  avatarHair: 'shortCombover',
  avatarHairColor: '6c4545',
  avatarEyes: 'open',
  avatarMouth: 'smile',
  avatarAccessory: 'rounded',
  avatarBg: 'b6e3f4',
  avatarScene: null,
  region: null,

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
  lastDecayAmount: null,
  lastDecayDetail: null,
  energyMode: null,
  energyModeDate: null,
  energyModeSetupDone: false,
  habitsByMode: { low: [], normal: [], high: [] },
  todayHighSuggestion: null,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...(defaults as StoreState),

      // ── Profile ──────────────────────────────────────────
      setUser: (userData) => set(userData),
      setStats: (stats) => set(stats),
      setAvatarScene: (scene) => set({ avatarScene: scene }),
      setRegion: (region) => set({ region }),

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

        const { restWeekStart } = get();
        const todayDate = new Date();
        const dayOfWeek = todayDate.getDay();
        const monday = new Date(todayDate);
        monday.setDate(todayDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const mondayStr = monday.toISOString().split('T')[0];

        if (restWeekStart !== mondayStr) {
          set({ restDaysThisWeek: 0, restWeekStart: mondayStr });
        }

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
      // Runs once per day on app load and looks at YESTERDAY:
      //   all 4 pillars (2.5 L water, 10 min mindfulness, 15 min movement,
      //   6 h sleep) + a meal logged  →  no dip
      //   some of it                  →  −1 per thing missed (max −5)
      //   nothing logged at all       →  −5
      //   rest day today              →  no dip
      // Bad-habit slips are NOT added here — they already cost health
      // the moment they're logged. Health never drops below 10.
      // Caller (Dashboard) persists newHealth to Supabase.
      applyDailyDecay: async (userId?: string) => {
        const { lastDecayDate, isRestDayToday, health } = get();
        const today = new Date().toISOString().split('T')[0];

        if (lastDecayDate === today) {
          return { decayed: false, newHealth: health };
        }
        if (isRestDayToday) {
          set({ lastDecayDate: today, lastDecayAmount: 0, lastDecayDetail: 'Rest day — no overnight dip' });
          return { decayed: false, newHealth: health, totalDecay: 0 };
        }

        const MAX_DECAY = 5;
        const FLOOR = 10;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const read = (k: string, fb: any) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };

        // Yesterday's pillars: the daily log, or today's-stats if it's still yesterday's
        const log = read('bloom-daily-stats-log', {})[yesterday] || {};
        const daily = read('bloom-daily-stats', {});
        const stats = { ...(daily.date === yesterday ? daily : {}), ...log };
        const pillars = [
          { label: 'water',       met: Number(stats.water || 0) >= 2.5,     any: Number(stats.water || 0) > 0 },
          { label: 'mindfulness', met: Number(stats.mindfulness || 0) >= 10, any: Number(stats.mindfulness || 0) > 0 },
          { label: 'movement',    met: Number(stats.movement || 0) >= 15,   any: Number(stats.movement || 0) > 0 },
          { label: 'sleep',       met: Number(stats.sleep || 0) >= 6,       any: Number(stats.sleep || 0) > 0 },
        ];
        const foods = read('bloom-nourish-foods', {})[yesterday] || [];
        const nourish = read('bloom-nourish', {})[yesterday] || {};
        const mealLogged = foods.length > 0 || (nourish.categories || []).length > 0 || Object.keys(nourish.meals || {}).length > 0;

        const missed = pillars.filter(p => !p.met).map(p => p.label);
        if (!mealLogged) missed.push('a meal');
        const nothingLogged = !mealLogged && !pillars.some(p => p.any);

        const totalDecay = nothingLogged ? MAX_DECAY : Math.min(MAX_DECAY, missed.length);
        const detail = totalDecay === 0
          ? 'Yesterday was complete — no overnight dip'
          : nothingLogged
            ? 'Nothing was logged yesterday'
            : `Yesterday missed: ${missed.join(', ')}`;

        const newHealth = totalDecay ? Math.max(FLOOR, health - totalDecay) : health;
        set({ health: newHealth, lastDecayDate: today, lastDecayAmount: totalDecay, lastDecayDetail: detail });
        return { decayed: totalDecay > 0, newHealth, totalDecay };
      },

      // ── Energy mode ──────────────────────────────────────
      setEnergyMode: (mode) => set({ energyMode: mode }),
      setEnergyModeDate: (date) => set({ energyModeDate: date }),
      setEnergyModeSetupDone: (done) => set({ energyModeSetupDone: done }),
      setHabitsByMode: (stacks) => set({ habitsByMode: stacks }),

      addHabitToMode: (mode, habitKey) => {
        const { habitsByMode } = get();
        const list = habitsByMode[mode];
        if (list.includes(habitKey)) return;
        set({ habitsByMode: { ...habitsByMode, [mode]: [...list, habitKey] } });
      },

      removeHabitFromMode: (mode, habitKey) => {
        const { habitsByMode } = get();
        set({ habitsByMode: { ...habitsByMode, [mode]: habitsByMode[mode].filter(k => k !== habitKey) } });
      },

      setTodayHighSuggestion: (key) => set({ todayHighSuggestion: key }),

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
        avatarScene: state.avatarScene,
        region: state.region,
        // Archetype
        archetypeKey: state.archetypeKey,
        archetypeName: state.archetypeName,
        archetypeIcon: state.archetypeIcon,
        // Program
        chronotype: state.chronotype,
        lifestyleLevel: state.lifestyleLevel,
        // Quiz responses — persists across sessions if user closes before finishing
        nutBarrier: state.nutBarrier,
        movTime: state.movTime,
        activity: state.activity,
        stress: state.stress,
        stressMgmt: state.stressMgmt,
        morning: state.morning,
        goals: state.goals,
        drain: state.drain,
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
        lastDecayAmount: state.lastDecayAmount,
        lastDecayDetail: state.lastDecayDetail,
        // Energy mode
        energyMode: state.energyMode,
        energyModeDate: state.energyModeDate,
        energyModeSetupDone: state.energyModeSetupDone,
        habitsByMode: state.habitsByMode,
        todayHighSuggestion: state.todayHighSuggestion,
      }),
    }
  )
);
