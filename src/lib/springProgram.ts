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

type WeeklyHabits = {
  week1: Habit[];
  week2: Habit[];
  week3: Habit[];
  week4: Habit[];
};

type ChronotypeProgram = {
  lion: WeeklyHabits;
  bear: WeeklyHabits;
  wolf: WeeklyHabits;
  dolphin: WeeklyHabits;
};

// SPRING ENERGY RESET - 4 Week Progressive Program
export const SPRING_PROGRAM: ChronotypeProgram = {
  // LION CHRONOTYPE (Early risers)
  lion: {
    week1: [
      { key: 'wake_630', name: 'Wake at 6:30am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '06:30', isQuit: false },
      { key: 'morning_light_5', name: 'Morning light (5 min)', emoji: '☀️', category: 'wellness', coins: 15, ge: 0, time: '06:45', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '07:30', isQuit: false }
    ],
    week2: [
      { key: 'wake_630', name: 'Wake at 6:30am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '06:30', isQuit: false },
      { key: 'morning_light_10', name: 'Morning light (10 min)', emoji: '☀️', category: 'wellness', coins: 20, ge: 0, time: '06:45', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (25g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '07:30', isQuit: false },
      { key: 'movement_20', name: 'Movement (20 min)', emoji: '🏃', category: 'movement', coins: 40, ge: 0, time: '08:00', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (9pm)', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '21:00', isQuit: false }
    ],
    week3: [
      { key: 'wake_630', name: 'Wake at 6:30am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '06:30', isQuit: false },
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '06:45', isQuit: false },
      { key: 'breathwork', name: 'Breathwork (10 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '07:30', isQuit: false },
      { key: 'movement_30', name: 'Movement (30 min)', emoji: '🏋️', category: 'movement', coins: 50, ge: 0, time: '08:00', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (9pm)', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '21:00', isQuit: false }
    ],
    week4: [
      { key: 'wake_630', name: 'Wake at 6:30am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '06:30', isQuit: false },
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '06:45', isQuit: false },
      { key: 'breathwork', name: 'Breathwork (10 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '07:30', isQuit: false },
      { key: 'movement_45', name: 'Movement (45 min)', emoji: '🏋️', category: 'movement', coins: 60, ge: 0, time: '08:00', isQuit: false },
      { key: 'whole_foods', name: 'Whole foods day', emoji: '🥦', category: 'nutrition', coins: 30, ge: 12, time: '', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (9pm)', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '21:00', isQuit: false }
    ]
  },

  // BEAR CHRONOTYPE (Most common)
  bear: {
    week1: [
      { key: 'wake_7', name: 'Wake at 7:00am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:00', isQuit: false },
      { key: 'morning_light_5', name: 'Morning light (5 min)', emoji: '☀️', category: 'wellness', coins: 15, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:00', isQuit: false }
    ],
    week2: [
      { key: 'wake_7', name: 'Wake at 7:00am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:00', isQuit: false },
      { key: 'morning_light_10', name: 'Morning light (10 min)', emoji: '☀️', category: 'wellness', coins: 20, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (25g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:00', isQuit: false },
      { key: 'post_lunch_walk', name: 'Post-lunch walk (15 min)', emoji: '🚶', category: 'movement', coins: 25, ge: 5, time: '13:00', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (10pm)', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '22:00', isQuit: false }
    ],
    week3: [
      { key: 'wake_7', name: 'Wake at 7:00am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:00', isQuit: false },
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:00', isQuit: false },
      { key: 'post_lunch_walk', name: 'Post-lunch walk (20 min)', emoji: '🚶', category: 'movement', coins: 30, ge: 10, time: '13:00', isQuit: false },
      { key: 'afternoon_nsdr', name: 'NSDR (15 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '15:00', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (10pm)', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '22:00', isQuit: false }
    ],
    week4: [
      { key: 'wake_7', name: 'Wake at 7:00am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:00', isQuit: false },
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:00', isQuit: false },
      { key: 'post_lunch_walk', name: 'Post-lunch walk (20 min)', emoji: '🚶', category: 'movement', coins: 30, ge: 10, time: '13:00', isQuit: false },
      { key: 'afternoon_nsdr', name: 'NSDR (15 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '15:00', isQuit: false },
      { key: 'evening_movement', name: 'Evening workout (30 min)', emoji: '🏋️', category: 'movement', coins: 50, ge: 0, time: '18:00', isQuit: false },
      { key: 'plant_based', name: 'Plant-based day', emoji: '🌱', category: 'nutrition', coins: 25, ge: 25, time: '', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (10pm)', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '22:00', isQuit: false }
    ]
  },

  // WOLF CHRONOTYPE (Night owls)
  wolf: {
    week1: [
      { key: 'wake_8', name: 'Wake at 8:00am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '08:00', isQuit: false },
      { key: 'morning_light_10', name: 'Morning light (10 min)', emoji: '☀️', category: 'wellness', coins: 20, ge: 0, time: '08:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '09:00', isQuit: false }
    ],
    week2: [
      { key: 'wake_8', name: 'Wake at 8:00am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '08:00', isQuit: false },
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '08:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (25g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '09:00', isQuit: false },
      { key: 'evening_movement', name: 'Evening movement (20 min)', emoji: '🏃', category: 'movement', coins: 40, ge: 0, time: '18:00', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (11pm)', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '23:00', isQuit: false }
    ],
    week3: [
      { key: 'wake_8', name: 'Wake at 8:00am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '08:00', isQuit: false },
      { key: 'morning_light_20', name: 'Morning light (20 min)', emoji: '☀️', category: 'wellness', coins: 30, ge: 0, time: '08:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '09:00', isQuit: false },
      { key: 'afternoon_walk', name: 'Afternoon walk (15 min)', emoji: '🚶', category: 'movement', coins: 25, ge: 5, time: '15:00', isQuit: false },
      { key: 'evening_movement', name: 'Evening workout (30 min)', emoji: '🏋️', category: 'movement', coins: 50, ge: 0, time: '18:00', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (11pm)', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '23:00', isQuit: false }
    ],
    week4: [
      { key: 'wake_8', name: 'Wake at 8:00am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '08:00', isQuit: false },
      { key: 'morning_light_20', name: 'Morning light (20 min)', emoji: '☀️', category: 'wellness', coins: 30, ge: 0, time: '08:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '09:00', isQuit: false },
      { key: 'afternoon_walk', name: 'Afternoon walk (20 min)', emoji: '🚶', category: 'movement', coins: 30, ge: 10, time: '15:00', isQuit: false },
      { key: 'evening_movement', name: 'Evening workout (45 min)', emoji: '🏋️', category: 'movement', coins: 60, ge: 0, time: '18:00', isQuit: false },
      { key: 'evening_meditation', name: 'Evening meditation (15 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '21:00', isQuit: false },
      { key: 'plant_based', name: 'Plant-based day', emoji: '🌱', category: 'nutrition', coins: 25, ge: 25, time: '', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (11pm)', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '23:00', isQuit: false }
    ]
  },

  // DOLPHIN CHRONOTYPE (Light sleepers)
  dolphin: {
    week1: [
      { key: 'wake_730', name: 'Wake at 7:30am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:30', isQuit: false },
      { key: 'morning_light_10', name: 'Morning light (10 min)', emoji: '☀️', category: 'wellness', coins: 20, ge: 0, time: '08:00', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:30', isQuit: false }
    ],
    week2: [
      { key: 'wake_730', name: 'Wake at 7:30am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:30', isQuit: false },
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '08:00', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (25g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:30', isQuit: false },
      { key: 'afternoon_nsdr', name: 'NSDR (10 min)', emoji: '🧘', category: 'mindfulness', coins: 25, ge: 0, time: '15:00', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (10:30pm)', emoji: '🌙', category: 'sleep', coins: 30, ge: 0, time: '22:30', isQuit: false }
    ],
    week3: [
      { key: 'wake_730', name: 'Wake at 7:30am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:30', isQuit: false },
      { key: 'morning_light_20', name: 'Morning light (20 min)', emoji: '☀️', category: 'wellness', coins: 30, ge: 0, time: '08:00', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:30', isQuit: false },
      { key: 'morning_breathwork', name: 'Breathwork (10 min)', emoji: '🧘', category: 'mindfulness', coins: 25, ge: 0, time: '09:00', isQuit: false },
      { key: 'afternoon_movement', name: 'Afternoon workout (25 min)', emoji: '🏃', category: 'movement', coins: 40, ge: 0, time: '15:00', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (10:30pm)', emoji: '🌙', category: 'sleep', coins: 30, ge: 0, time: '22:30', isQuit: false }
    ],
    week4: [
      { key: 'wake_730', name: 'Wake at 7:30am', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:30', isQuit: false },
      { key: 'morning_light_20', name: 'Morning light (20 min)', emoji: '☀️', category: 'wellness', coins: 30, ge: 0, time: '08:00', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:30', isQuit: false },
      { key: 'morning_breathwork', name: 'Breathwork (10 min)', emoji: '🧘', category: 'mindfulness', coins: 25, ge: 0, time: '09:00', isQuit: false },
      { key: 'afternoon_movement', name: 'Afternoon workout (30 min)', emoji: '🏃', category: 'movement', coins: 50, ge: 0, time: '15:00', isQuit: false },
      { key: 'afternoon_nsdr', name: 'NSDR (15 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '16:00', isQuit: false },
      { key: 'whole_foods', name: 'Whole foods day', emoji: '🥦', category: 'nutrition', coins: 30, ge: 12, time: '', isQuit: false },
      { key: 'evening_winddown', name: 'Wind-down (10:30pm)', emoji: '🌙', category: 'sleep', coins: 30, ge: 0, time: '22:30', isQuit: false }
    ]
  }
};

// Helper function to get habits for user based on week
export function getHabitsForUser(
  chronotype: 'lion' | 'bear' | 'wolf' | 'dolphin',
  week: number
): Habit[] {
  const weekKey = `week${Math.min(week, 4)}` as keyof WeeklyHabits;
  return SPRING_PROGRAM[chronotype]?.[weekKey] || SPRING_PROGRAM.bear.week1;
}

// Calculate current week based on program start date
export function getCurrentWeek(programStartDate: string): number {
  const start = new Date(programStartDate);
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.floor(daysSinceStart / 7) + 1;
  return Math.min(Math.max(week, 1), 4); // Clamp between 1 and 4
}

// Calculate day within current week
export function getDayOfWeek(programStartDate: string): number {
  const start = new Date(programStartDate);
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return (daysSinceStart % 7) + 1; // 1-7
}