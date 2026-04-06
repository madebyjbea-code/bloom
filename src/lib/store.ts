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
  isCustom?: boolean; // user-created habits
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

  // Habits — program habits loaded from springProgram
  habits: Habit[];

  // Custom habits — user-created, persisted locally
  customHabits: Habit[];

  // Completions — reset daily
  completedToday: string[];
  lastCompletionDate: string | null; // YYYY-MM-DD — for daily reset

  // Actions
  setUser: (userData: Partial<StoreState>) => void;
  setStats: (stats: Partial<Pick<StoreState, 'health' | 'coins' | 'greenEnergy' | 'level'>>) => void;
  setHabits: (habits: Habit[]) => void;
  addCustomHabit: (habit: Habit) => void;
  removeCustomHabit: (key: string) => void;
  toggleHabit: (habitKey: string) => void;
  checkDailyReset: () => void;
  reset: () => void;
};

const defaults: Partial<StoreState> = {
  userId: null,
  accessCode: null,
  name: null,
  avatarType: 'pet',
  avatarName: null,
  avatarEmoji: '🦔',
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
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...(defaults as StoreState),

      setUser: (userData) => set(userData),

      setStats: (stats) => set(stats),

      setHabits: (habits) => set({ habits }),

      addCustomHabit: (habit) => {
        const { customHabits } = get();
        // Prevent duplicates
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
            ? completedToday.filter((k) => k !== habitKey)
            : [...completedToday, habitKey],
        });
      },

      // Call this on app load — resets completedToday if it's a new day
      checkDailyReset: () => {
        const { lastCompletionDate } = get();
        const today = new Date().toISOString().split('T')[0];
        if (lastCompletionDate !== today) {
          set({
            completedToday: [],
            lastCompletionDate: today,
          });
        }
      },

      reset: () => set(defaults as StoreState),
    }),
    {
      name: 'bloom-storage',
      // Persist everything needed for a seamless return visit
      partialize: (state) => ({
        // Auth
        userId: state.userId,
        accessCode: state.accessCode,
        // Profile
        name: state.name,
        avatarType: state.avatarType,
        avatarName: state.avatarName,
        avatarEmoji: state.avatarEmoji,
        // Archetype
        archetypeKey: state.archetypeKey,
        archetypeName: state.archetypeName,
        archetypeIcon: state.archetypeIcon,
        // Program
        chronotype: state.chronotype,
        lifestyleLevel: state.lifestyleLevel,
        // Stats — persisted locally so they feel instant on load
        health: state.health,
        coins: state.coins,
        greenEnergy: state.greenEnergy,
        level: state.level,
        // Habits — persist so they load instantly before DB fetch
        habits: state.habits,
        // Custom habits — fully local, no DB needed
        customHabits: state.customHabits,
        // Daily completions
        completedToday: state.completedToday,
        lastCompletionDate: state.lastCompletionDate,
      }),
    }
  )
);
