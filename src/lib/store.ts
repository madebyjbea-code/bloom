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
  userId: string | null;
  accessCode: string | null;
  name: string | null;
  avatarType: 'pet' | 'mini-me' | 'simple';
  avatarName: string | null;
  avatarEmoji: string | null;
  chronotype: 'lion' | 'bear' | 'wolf' | 'dolphin' | null;
  lifestyleLevel: 'foundation' | 'building' | 'optimization' | 'advanced' | null;
  health: number;
  coins: number;
  greenEnergy: number;
  level: number;
  habits: Habit[];
  completedToday: string[];
  setUser: (userData: Partial<StoreState>) => void;
  setStats: (stats: Partial<Pick<StoreState, 'health' | 'coins' | 'greenEnergy' | 'level'>>) => void;
  setHabits: (habits: Habit[]) => void;
  toggleHabit: (habitKey: string) => void;
  clearCompletedToday: () => void;
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      userId: null,
      accessCode: null,
      name: null,
      avatarType: 'pet',
      avatarName: null,
      avatarEmoji: '🦔',
      chronotype: null,
      lifestyleLevel: null,
      health: 78,
      coins: 0,
      greenEnergy: 0,
      level: 1,
      habits: [],
      completedToday: [],
      setUser: (userData) => set(userData),
      setStats: (stats) => set(stats),
      setHabits: (habits) => set({ habits }),
      toggleHabit: (habitKey) => {
        const { completedToday } = get();
        const isCompleted = completedToday.includes(habitKey);
        set({
          completedToday: isCompleted
            ? completedToday.filter((k) => k !== habitKey)
            : [...completedToday, habitKey]
        });
      },
      clearCompletedToday: () => set({ completedToday: [] }),
    }),
    { name: 'bloom-storage' }
  )
);