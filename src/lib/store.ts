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

  // Archetype (new)
  archetypeKey: string | null;
  archetypeName: string | null;
  archetypeIcon: string | null;

  // Chronotype + level (still used for habit loading)
  chronotype: 'lion' | 'bear' | 'wolf' | 'dolphin' | null;
  lifestyleLevel: 'foundation' | 'building' | 'optimization' | 'advanced' | null;

  // Quiz answers (stored for profile display)
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

  // Habits
  habits: Habit[];
  completedToday: string[];

  // Actions
  setUser: (userData: Partial<StoreState>) => void;
  setStats: (stats: Partial<Pick<StoreState, 'health' | 'coins' | 'greenEnergy' | 'level'>>) => void;
  setHabits: (habits: Habit[]) => void;
  toggleHabit: (habitKey: string) => void;
  clearCompletedToday: () => void;
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
  completedToday: [],
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...(defaults as StoreState),

      setUser: (userData) => set(userData),

      setStats: (stats) => set(stats),

      setHabits: (habits) => set({ habits }),

      toggleHabit: (habitKey) => {
        const { completedToday } = get();
        const isCompleted = completedToday.includes(habitKey);
        set({
          completedToday: isCompleted
            ? completedToday.filter((k) => k !== habitKey)
            : [...completedToday, habitKey],
        });
      },

      clearCompletedToday: () => set({ completedToday: [] }),

      reset: () => set(defaults as StoreState),
    }),
    {
      name: 'bloom-storage',
      // Only persist essential fields — don't persist habits array
      // (loaded fresh from DB each session)
      partialize: (state) => ({
        userId: state.userId,
        accessCode: state.accessCode,
        name: state.name,
        avatarType: state.avatarType,
        avatarName: state.avatarName,
        avatarEmoji: state.avatarEmoji,
        archetypeKey: state.archetypeKey,
        archetypeName: state.archetypeName,
        archetypeIcon: state.archetypeIcon,
        chronotype: state.chronotype,
        lifestyleLevel: state.lifestyleLevel,
        health: state.health,
        coins: state.coins,
        greenEnergy: state.greenEnergy,
        level: state.level,
        completedToday: state.completedToday,
      }),
    }
  )
);
