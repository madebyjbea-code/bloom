// ============================================
// BLOOM — Data Types
// ============================================
// These define the "shape" of all your data.
// Think of these as blueprints — every habit,
// user, and avatar follows these exact structures.
// ============================================

// --- USER ---
export interface User {
  id: string
  email: string
  display_name: string
  avatar_mode: 'pet' | 'mini-me' | 'simple'
  avatar_name: string
  avatar_emoji: string
  avatar_level: number
  coins: number
  green_energy: number
  health_points: number      // 0–100
  mood_points: number        // 0–100
  created_at: string
  // Health profile (drives personalized reminders)
  birth_year?: number
  biological_sex?: 'male' | 'female' | 'intersex' | 'prefer_not_to_say'
  ethnicity?: string[]       // Used for demographic health reminders
  location_country?: string
  tracks_cycle?: boolean
}

// --- HABIT ---
export interface Habit {
  id: string
  user_id: string
  name: string
  emoji: string
  type: 'build'    // A habit you want to build (workout, meditate)
       | 'quit'    // A habit you want to quit (smoking, drinking)
       | 'sustainable' // Eco-friendly habits that generate Green Energy
  category: 'fitness' | 'nutrition' | 'mindfulness' | 'sleep'
           | 'social' | 'substance' | 'sustainability' | 'learning' | 'health'
  coin_reward: number        // Coins earned on completion
  green_energy_reward: number // GE earned (sustainable habits only)
  health_impact: number      // Health points gained (+) or lost (-)
  scheduled_time?: string    // e.g. "15:00" — flexible, not rigid
  scheduled_days: number[]   // 0=Sun, 1=Mon, ... 6=Sat. [] = every day
  is_active: boolean
  created_at: string
}

// --- HABIT LOG (one entry per completion) ---
export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  completed: boolean
  logged_at: string          // ISO date string
  note?: string              // Optional journal note
}

// --- STREAK ---
export interface HabitStreak {
  habit_id: string
  current_streak: number     // Days in a row
  longest_streak: number
  last_completed: string     // ISO date
}

// --- MENSTRUAL CYCLE ---
export interface CycleLog {
  id: string
  user_id: string
  period_start: string       // ISO date
  period_end?: string
  cycle_length?: number      // Days
  symptoms?: string[]
  flow_intensity?: 'light' | 'medium' | 'heavy'
  notes?: string
}

// Cycle phases — used to adapt habit suggestions
export type CyclePhase =
  | 'menstrual'    // Days 1–5:   rest, iron-rich foods, gentle movement
  | 'follicular'   // Days 6–13:  energy rising, good for new habits
  | 'ovulatory'    // Days 14–16: peak energy, high-intensity ok
  | 'luteal'       // Days 17–28: fatigue, cravings, ease up intensity

// --- HEALTH REMINDER ---
export interface HealthReminder {
  id: string
  user_id: string
  type: 'appointment'        // Dentist, doctor, etc.
      | 'screening'          // Mammogram, colonoscopy, blood pressure check
      | 'medication'         // Daily meds or supplements
      | 'habit_nudge'        // "You haven't logged water today"
      | 'insight'            // "Your sleep has been low 3 nights"
  title: string
  body: string
  due_date?: string
  repeat_interval_days?: number  // e.g. 180 = every 6 months
  is_dismissed: boolean
  source_study?: string          // Citation for health content
  created_at: string
}

// --- NUTRITION LOG ---
export interface NutritionLog {
  id: string
  user_id: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string
  is_whole_food: boolean
  is_plant_based: boolean
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  logged_at: string
}

// --- SLEEP LOG ---
export interface SleepLog {
  id: string
  user_id: string
  bedtime: string            // ISO datetime
  wake_time: string
  duration_minutes: number
  quality_score?: number     // 1–10, from Fitbit or manual
  source: 'manual' | 'fitbit' | 'apple_health'
  logged_at: string
}

// --- FOCUS SESSION (Pomodoro) ---
export interface FocusSession {
  id: string
  user_id: string
  duration_minutes: number
  type: 'focus' | 'break' | 'mindfulness'
  completed: boolean
  coins_earned: number
  started_at: string
  ended_at?: string
}

// --- GREEN ENERGY ---
export interface GreenEnergyLog {
  id: string
  user_id: string
  amount: number
  source: string             // e.g. "Plant-based day — 9 day streak"
  habit_id?: string
  logged_at: string
}

export interface GreenDonation {
  id: string
  user_id: string
  amount_ge: number
  organization: string       // e.g. "Ocean Conservancy"
  donated_at: string
}

// --- COMMUNITY ---
export interface CommunityPost {
  id: string
  user_id: string
  user_name: string
  user_avatar: string
  content: string
  post_type: 'milestone' | 'check_in' | 'question' | 'celebration'
  likes: number
  created_at: string
}

// --- AVATAR SHOP ---
export interface ShopItem {
  id: string
  name: string
  emoji: string
  description: string
  cost_coins?: number
  cost_ge?: number           // Some items purchased with Green Energy
  category: 'accessory' | 'background' | 'effect' | 'evolution'
  requires_level?: number
  requires_streak?: number
}

// --- APP STATE (used in global store) ---
export interface AppState {
  user: User | null
  todayHabits: Habit[]
  todayLogs: HabitLog[]
  currentCyclePhase: CyclePhase | null
  activeReminders: HealthReminder[]
}
