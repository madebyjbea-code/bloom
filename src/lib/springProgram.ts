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

// ─── ARCHETYPE PROGRAMS ───────────────────────────────────────────────────────
// Each archetype gets a tailored 4-week progressive habit stack.
// Week 1 is always minimal (3 habits) to build momentum.

const ARCHETYPE_PROGRAMS: Record<string, WeeklyHabits> = {

  // ── BURNT-OUT REBUILDER ──────────────────────────────────────────────────
  burnout: {
    week1: [
      { key: 'phone_off_930', name: 'Phone off at 9:30 PM', emoji: '📵', category: 'sleep', coins: 25, ge: 0, time: '21:30', isQuit: false },
      { key: 'water_on_wake', name: 'Full glass water on waking', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein-first breakfast', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '08:00', isQuit: false },
    ],
    week2: [
      { key: 'phone_off_930', name: 'Phone off at 9:30 PM', emoji: '📵', category: 'sleep', coins: 25, ge: 0, time: '21:30', isQuit: false },
      { key: 'water_on_wake', name: 'Full glass water on waking', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein-first breakfast', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '08:00', isQuit: false },
      { key: 'box_breathing', name: 'Box breathing (5 min)', emoji: '🫁', category: 'mindfulness', coins: 20, ge: 0, time: '13:00', isQuit: false },
      { key: 'outdoor_walk', name: 'Outdoor walk (10 min)', emoji: '🚶', category: 'movement', coins: 20, ge: 8, time: '08:30', isQuit: false },
    ],
    week3: [
      { key: 'phone_off_930', name: 'Phone off at 9:30 PM', emoji: '📵', category: 'sleep', coins: 25, ge: 0, time: '21:30', isQuit: false },
      { key: 'water_on_wake', name: 'Full glass water on waking', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein-first breakfast', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '08:00', isQuit: false },
      { key: 'box_breathing', name: 'Box breathing (5 min)', emoji: '🫁', category: 'mindfulness', coins: 20, ge: 0, time: '13:00', isQuit: false },
      { key: 'outdoor_walk', name: 'Outdoor walk (15 min)', emoji: '🚶', category: 'movement', coins: 25, ge: 10, time: '08:30', isQuit: false },
      { key: 'gratitude_log', name: 'Evening gratitude log (2 min)', emoji: '📖', category: 'mindfulness', coins: 15, ge: 0, time: '21:00', isQuit: false },
    ],
    week4: [
      { key: 'phone_off_930', name: 'Phone off at 9:30 PM', emoji: '📵', category: 'sleep', coins: 25, ge: 0, time: '21:30', isQuit: false },
      { key: 'water_on_wake', name: 'Full glass water on waking', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein-first breakfast', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '08:00', isQuit: false },
      { key: 'box_breathing', name: 'Box breathing (5 min)', emoji: '🫁', category: 'mindfulness', coins: 20, ge: 0, time: '13:00', isQuit: false },
      { key: 'outdoor_walk', name: 'Outdoor walk (20 min)', emoji: '🚶', category: 'movement', coins: 30, ge: 12, time: '08:30', isQuit: false },
      { key: 'gratitude_log', name: 'Evening gratitude log (2 min)', emoji: '📖', category: 'mindfulness', coins: 15, ge: 0, time: '21:00', isQuit: false },
      { key: 'plant_meal', name: 'One plant-based meal', emoji: '🌱', category: 'nutrition', coins: 20, ge: 20, time: '', isQuit: false },
    ],
  },

  // ── NIGHT BLOOM (Wolf) ────────────────────────────────────────────────────
  nightowl: {
    week1: [
      { key: 'morning_light_10', name: 'Morning light (10 min)', emoji: '☀️', category: 'wellness', coins: 20, ge: 0, time: '08:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (delay ok)', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '09:00', isQuit: false },
      { key: 'blue_light_off', name: 'Blue light off 90 min before sleep', emoji: '📵', category: 'sleep', coins: 25, ge: 0, time: '21:30', isQuit: false },
    ],
    week2: [
      { key: 'morning_light_10', name: 'Morning light (10 min)', emoji: '☀️', category: 'wellness', coins: 20, ge: 0, time: '08:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '09:00', isQuit: false },
      { key: 'blue_light_off', name: 'Blue light off 90 min before sleep', emoji: '📵', category: 'sleep', coins: 25, ge: 0, time: '21:30', isQuit: false },
      { key: 'afternoon_movement', name: 'Afternoon movement (20 min)', emoji: '🏃', category: 'movement', coins: 35, ge: 0, time: '16:00', isQuit: false },
      { key: 'plant_diversity', name: '5 different plants today', emoji: '🌱', category: 'nutrition', coins: 20, ge: 15, time: '', isQuit: false },
    ],
    week3: [
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '08:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '09:00', isQuit: false },
      { key: 'blue_light_off', name: 'Blue light off 90 min before sleep', emoji: '📵', category: 'sleep', coins: 25, ge: 0, time: '21:30', isQuit: false },
      { key: 'afternoon_movement', name: 'Afternoon movement (30 min)', emoji: '🏋️', category: 'movement', coins: 45, ge: 0, time: '16:00', isQuit: false },
      { key: 'plant_diversity', name: '5 different plants today', emoji: '🌱', category: 'nutrition', coins: 20, ge: 15, time: '', isQuit: false },
      { key: 'evening_planning', name: 'Evening planning ritual (10 min)', emoji: '📝', category: 'mindfulness', coins: 15, ge: 0, time: '20:00', isQuit: false },
    ],
    week4: [
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '08:30', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '09:00', isQuit: false },
      { key: 'blue_light_off', name: 'Blue light off 90 min before sleep', emoji: '📵', category: 'sleep', coins: 25, ge: 0, time: '21:30', isQuit: false },
      { key: 'afternoon_movement', name: 'Afternoon workout (40 min)', emoji: '🏋️', category: 'movement', coins: 55, ge: 0, time: '16:00', isQuit: false },
      { key: 'plant_based_day', name: 'Plant-based day', emoji: '🌱', category: 'nutrition', coins: 25, ge: 25, time: '', isQuit: false },
      { key: 'evening_planning', name: 'Evening planning ritual (10 min)', emoji: '📝', category: 'mindfulness', coins: 15, ge: 0, time: '20:00', isQuit: false },
      { key: 'nsdr', name: 'NSDR / yoga nidra (15 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '14:00', isQuit: false },
    ],
  },

  // ── ENERGISED OPTIMIZER (Lion) ────────────────────────────────────────────
  optimizer: {
    week1: [
      { key: 'sunrise_walk', name: 'Sunrise walk or outdoor movement', emoji: '🌅', category: 'wellness', coins: 25, ge: 8, time: '06:30', isQuit: false },
      { key: 'protein_30g', name: 'Protein 30g at breakfast', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '07:00', isQuit: false },
      { key: 'plant_diversity_30', name: '30-plant species goal (weekly)', emoji: '🌿', category: 'nutrition', coins: 20, ge: 20, time: '', isQuit: false },
    ],
    week2: [
      { key: 'sunrise_walk', name: 'Sunrise walk or outdoor movement', emoji: '🌅', category: 'wellness', coins: 25, ge: 8, time: '06:30', isQuit: false },
      { key: 'protein_30g', name: 'Protein 30g at breakfast', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '07:00', isQuit: false },
      { key: 'plant_diversity_30', name: '30-plant species goal (weekly)', emoji: '🌿', category: 'nutrition', coins: 20, ge: 20, time: '', isQuit: false },
      { key: 'strength_training', name: 'Strength training (peak energy)', emoji: '🏋️', category: 'movement', coins: 50, ge: 0, time: '09:00', isQuit: false },
      { key: 'nsdr_midday', name: 'NSDR / Yoga Nidra (20 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '13:00', isQuit: false },
    ],
    week3: [
      { key: 'sunrise_walk', name: 'Sunrise walk or outdoor movement', emoji: '🌅', category: 'wellness', coins: 25, ge: 8, time: '06:30', isQuit: false },
      { key: 'protein_30g', name: 'Protein 30g at breakfast', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '07:00', isQuit: false },
      { key: 'plant_diversity_30', name: '30-plant species goal (weekly)', emoji: '🌿', category: 'nutrition', coins: 20, ge: 20, time: '', isQuit: false },
      { key: 'strength_training', name: 'Strength training (peak energy)', emoji: '🏋️', category: 'movement', coins: 50, ge: 0, time: '09:00', isQuit: false },
      { key: 'nsdr_midday', name: 'NSDR / Yoga Nidra (20 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '13:00', isQuit: false },
      { key: 'weekly_reflection', name: 'Weekly habit audit (10 min)', emoji: '📊', category: 'mindfulness', coins: 20, ge: 0, time: '19:00', isQuit: false },
    ],
    week4: [
      { key: 'sunrise_walk', name: 'Sunrise walk or outdoor movement', emoji: '🌅', category: 'wellness', coins: 25, ge: 8, time: '06:30', isQuit: false },
      { key: 'protein_30g', name: 'Protein 30g at breakfast', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '07:00', isQuit: false },
      { key: 'plant_diversity_30', name: '30-plant species goal (weekly)', emoji: '🌿', category: 'nutrition', coins: 20, ge: 20, time: '', isQuit: false },
      { key: 'strength_training', name: 'Strength training (peak energy)', emoji: '🏋️', category: 'movement', coins: 50, ge: 0, time: '09:00', isQuit: false },
      { key: 'nsdr_midday', name: 'NSDR / Yoga Nidra (20 min)', emoji: '🧘', category: 'mindfulness', coins: 30, ge: 0, time: '13:00', isQuit: false },
      { key: 'weekly_reflection', name: 'Weekly habit audit (10 min)', emoji: '📊', category: 'mindfulness', coins: 20, ge: 0, time: '19:00', isQuit: false },
      { key: 'cold_exposure', name: 'Cold shower or contrast therapy', emoji: '🚿', category: 'wellness', coins: 25, ge: 0, time: '07:15', isQuit: false },
    ],
  },

  // ── SCATTERED SPARK (Dolphin) ─────────────────────────────────────────────
  scattered: {
    week1: [
      { key: 'fixed_wake', name: 'Fixed wake time (same every day)', emoji: '⏰', category: 'sleep', coins: 25, ge: 0, time: '07:30', isQuit: false },
      { key: 'water_morning', name: 'Water before coffee', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:35', isQuit: false },
      { key: 'protein_meal', name: 'Protein + veg at two meals', emoji: '🥗', category: 'nutrition', coins: 25, ge: 10, time: '', isQuit: false },
    ],
    week2: [
      { key: 'fixed_wake', name: 'Fixed wake time (same every day)', emoji: '⏰', category: 'sleep', coins: 25, ge: 0, time: '07:30', isQuit: false },
      { key: 'water_morning', name: 'Water before coffee', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:35', isQuit: false },
      { key: 'protein_meal', name: 'Protein + veg at two meals', emoji: '🥗', category: 'nutrition', coins: 25, ge: 10, time: '', isQuit: false },
      { key: 'movement_snacks', name: '3x 5-min movement snacks', emoji: '🤸', category: 'movement', coins: 30, ge: 5, time: '', isQuit: false },
      { key: 'pre_sleep_breathe', name: 'Box breathing before sleep', emoji: '🫁', category: 'mindfulness', coins: 20, ge: 0, time: '22:00', isQuit: false },
    ],
    week3: [
      { key: 'fixed_wake', name: 'Fixed wake time (same every day)', emoji: '⏰', category: 'sleep', coins: 25, ge: 0, time: '07:30', isQuit: false },
      { key: 'water_morning', name: 'Water before coffee', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:35', isQuit: false },
      { key: 'protein_meal', name: 'Protein + veg at two meals', emoji: '🥗', category: 'nutrition', coins: 25, ge: 10, time: '', isQuit: false },
      { key: 'movement_snacks', name: '3x 5-min movement snacks', emoji: '🤸', category: 'movement', coins: 30, ge: 5, time: '', isQuit: false },
      { key: 'pre_sleep_breathe', name: 'Box breathing before sleep', emoji: '🫁', category: 'mindfulness', coins: 20, ge: 0, time: '22:00', isQuit: false },
      { key: 'brain_dump', name: 'Brain dump before sleep (3 things)', emoji: '📖', category: 'mindfulness', coins: 15, ge: 0, time: '21:45', isQuit: false },
    ],
    week4: [
      { key: 'fixed_wake', name: 'Fixed wake time (same every day)', emoji: '⏰', category: 'sleep', coins: 25, ge: 0, time: '07:30', isQuit: false },
      { key: 'water_morning', name: 'Water before coffee', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:35', isQuit: false },
      { key: 'protein_meal', name: 'Protein + veg at two meals', emoji: '🥗', category: 'nutrition', coins: 25, ge: 10, time: '', isQuit: false },
      { key: 'movement_snacks', name: '3x 5-min movement snacks', emoji: '🤸', category: 'movement', coins: 30, ge: 5, time: '', isQuit: false },
      { key: 'pre_sleep_breathe', name: 'Box breathing before sleep', emoji: '🫁', category: 'mindfulness', coins: 20, ge: 0, time: '22:00', isQuit: false },
      { key: 'brain_dump', name: 'Brain dump before sleep (3 things)', emoji: '📖', category: 'mindfulness', coins: 15, ge: 0, time: '21:45', isQuit: false },
      { key: 'plant_meal', name: 'One plant-based meal', emoji: '🌱', category: 'nutrition', coins: 20, ge: 20, time: '', isQuit: false },
    ],
  },

  // ── NOURISHMENT SEEKER ────────────────────────────────────────────────────
  nurturer: {
    week1: [
      { key: 'sleep_7hrs', name: 'Protect 7 hours sleep', emoji: '😴', category: 'sleep', coins: 25, ge: 0, time: '22:30', isQuit: false },
      { key: 'probiotic_food', name: 'Probiotic-rich food daily', emoji: '🥛', category: 'nutrition', coins: 20, ge: 8, time: '', isQuit: false },
      { key: 'mindful_meal', name: 'One meal without screens', emoji: '🍽', category: 'mindfulness', coins: 20, ge: 0, time: '', isQuit: false },
    ],
    week2: [
      { key: 'sleep_7hrs', name: 'Protect 7 hours sleep', emoji: '😴', category: 'sleep', coins: 25, ge: 0, time: '22:30', isQuit: false },
      { key: 'probiotic_food', name: 'Probiotic-rich food daily', emoji: '🥛', category: 'nutrition', coins: 20, ge: 8, time: '', isQuit: false },
      { key: 'mindful_meal', name: 'One meal without screens', emoji: '🍽', category: 'mindfulness', coins: 20, ge: 0, time: '', isQuit: false },
      { key: 'craving_breathwork', name: '4-7-8 breathing when craving hits', emoji: '🫁', category: 'mindfulness', coins: 20, ge: 0, time: '', isQuit: false },
      { key: 'pleasure_food', name: 'Build meal around one food you love', emoji: '❤️', category: 'nutrition', coins: 15, ge: 5, time: '', isQuit: false },
    ],
    week3: [
      { key: 'sleep_7hrs', name: 'Protect 7 hours sleep', emoji: '😴', category: 'sleep', coins: 25, ge: 0, time: '22:30', isQuit: false },
      { key: 'probiotic_food', name: 'Probiotic-rich food daily', emoji: '🥛', category: 'nutrition', coins: 20, ge: 8, time: '', isQuit: false },
      { key: 'mindful_meal', name: 'One meal without screens', emoji: '🍽', category: 'mindfulness', coins: 20, ge: 0, time: '', isQuit: false },
      { key: 'craving_breathwork', name: '4-7-8 breathing when craving hits', emoji: '🫁', category: 'mindfulness', coins: 20, ge: 0, time: '', isQuit: false },
      { key: 'pleasure_food', name: 'Build meal around one food you love', emoji: '❤️', category: 'nutrition', coins: 15, ge: 5, time: '', isQuit: false },
      { key: 'self_compassion', name: 'Morning self-compassion intention', emoji: '🌸', category: 'mindfulness', coins: 15, ge: 0, time: '08:00', isQuit: false },
    ],
    week4: [
      { key: 'sleep_7hrs', name: 'Protect 7 hours sleep', emoji: '😴', category: 'sleep', coins: 25, ge: 0, time: '22:30', isQuit: false },
      { key: 'probiotic_food', name: 'Probiotic-rich food daily', emoji: '🥛', category: 'nutrition', coins: 20, ge: 8, time: '', isQuit: false },
      { key: 'mindful_meal', name: 'One meal without screens', emoji: '🍽', category: 'mindfulness', coins: 20, ge: 0, time: '', isQuit: false },
      { key: 'craving_breathwork', name: '4-7-8 breathing when craving hits', emoji: '🫁', category: 'mindfulness', coins: 20, ge: 0, time: '', isQuit: false },
      { key: 'pleasure_food', name: 'Build meal around one food you love', emoji: '❤️', category: 'nutrition', coins: 15, ge: 5, time: '', isQuit: false },
      { key: 'self_compassion', name: 'Morning self-compassion intention', emoji: '🌸', category: 'mindfulness', coins: 15, ge: 0, time: '08:00', isQuit: false },
      { key: 'plant_diversity', name: 'Plant diversity (5 plants today)', emoji: '🌿', category: 'nutrition', coins: 20, ge: 18, time: '', isQuit: false },
    ],
  },

  // ── GENTLE REBUILDER ──────────────────────────────────────────────────────
  rebuilder: {
    week1: [
      { key: 'water_first', name: 'Water before anything else', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'daily_walk_10', name: '10-min walk (any time, any pace)', emoji: '🚶', category: 'movement', coins: 20, ge: 8, time: '', isQuit: false },
      { key: 'veg_every_meal', name: 'One vegetable at every meal', emoji: '🥦', category: 'nutrition', coins: 20, ge: 12, time: '', isQuit: false },
    ],
    week2: [
      { key: 'water_first', name: 'Water before anything else', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'daily_walk_10', name: '10-min walk (any time, any pace)', emoji: '🚶', category: 'movement', coins: 20, ge: 8, time: '', isQuit: false },
      { key: 'veg_every_meal', name: 'One vegetable at every meal', emoji: '🥦', category: 'nutrition', coins: 20, ge: 12, time: '', isQuit: false },
      { key: 'sleep_floor', name: 'Protect 7 hours — phone bedtime alarm', emoji: '😴', category: 'sleep', coins: 25, ge: 0, time: '22:00', isQuit: false },
      { key: 'pre_meal_breath', name: '3 breaths before each meal', emoji: '🫁', category: 'mindfulness', coins: 10, ge: 0, time: '', isQuit: false },
    ],
    week3: [
      { key: 'water_first', name: 'Water before anything else', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'daily_walk_15', name: '15-min walk', emoji: '🚶', category: 'movement', coins: 25, ge: 10, time: '', isQuit: false },
      { key: 'veg_every_meal', name: 'One vegetable at every meal', emoji: '🥦', category: 'nutrition', coins: 20, ge: 12, time: '', isQuit: false },
      { key: 'sleep_floor', name: 'Protect 7 hours — phone bedtime alarm', emoji: '😴', category: 'sleep', coins: 25, ge: 0, time: '22:00', isQuit: false },
      { key: 'pre_meal_breath', name: '3 breaths before each meal', emoji: '🫁', category: 'mindfulness', coins: 10, ge: 0, time: '', isQuit: false },
      { key: 'protein_meal', name: 'Protein at two meals today', emoji: '🥚', category: 'nutrition', coins: 20, ge: 0, time: '', isQuit: false },
    ],
    week4: [
      { key: 'water_first', name: 'Water before anything else', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'daily_walk_20', name: '20-min walk', emoji: '🚶', category: 'movement', coins: 30, ge: 12, time: '', isQuit: false },
      { key: 'veg_every_meal', name: 'One vegetable at every meal', emoji: '🥦', category: 'nutrition', coins: 20, ge: 12, time: '', isQuit: false },
      { key: 'sleep_floor', name: 'Protect 7 hours — phone bedtime alarm', emoji: '😴', category: 'sleep', coins: 25, ge: 0, time: '22:00', isQuit: false },
      { key: 'pre_meal_breath', name: '3 breaths before each meal', emoji: '🫁', category: 'mindfulness', coins: 10, ge: 0, time: '', isQuit: false },
      { key: 'protein_meal', name: 'Protein at two meals today', emoji: '🥚', category: 'nutrition', coins: 20, ge: 0, time: '', isQuit: false },
      { key: 'reusable_swap', name: 'One reusable or sustainable swap', emoji: '🌿', category: 'wellness', coins: 10, ge: 15, time: '', isQuit: false },
    ],
  },

  // ── SLOW-START BLOOMER ────────────────────────────────────────────────────
  slowstarter: {
    week1: [
      { key: 'electrolyte_wake', name: 'Electrolyte water on waking', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'light_before_coffee', name: 'Light outside before first coffee', emoji: '🌅', category: 'wellness', coins: 20, ge: 5, time: '07:40', isQuit: false },
      { key: 'protein_breakfast_delay', name: 'Protein breakfast (60–90 min after waking)', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '09:00', isQuit: false },
    ],
    week2: [
      { key: 'electrolyte_wake', name: 'Electrolyte water on waking', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'light_before_coffee', name: 'Light outside before first coffee', emoji: '🌅', category: 'wellness', coins: 20, ge: 5, time: '07:40', isQuit: false },
      { key: 'protein_breakfast_delay', name: 'Protein breakfast (60–90 min after waking)', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '09:00', isQuit: false },
      { key: 'peak_movement', name: 'Movement at your energy peak', emoji: '🏃', category: 'movement', coins: 35, ge: 8, time: '10:30', isQuit: false },
      { key: 'midday_reset', name: 'Breathwork or stretch after lunch', emoji: '🧘', category: 'mindfulness', coins: 20, ge: 0, time: '13:00', isQuit: false },
    ],
    week3: [
      { key: 'electrolyte_wake', name: 'Electrolyte water on waking', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'light_before_coffee', name: 'Light outside before first coffee', emoji: '🌅', category: 'wellness', coins: 20, ge: 5, time: '07:40', isQuit: false },
      { key: 'protein_breakfast_delay', name: 'Protein breakfast (60–90 min after waking)', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '09:00', isQuit: false },
      { key: 'peak_movement', name: 'Movement at your energy peak', emoji: '🏃', category: 'movement', coins: 35, ge: 8, time: '10:30', isQuit: false },
      { key: 'midday_reset', name: 'Breathwork or stretch after lunch', emoji: '🧘', category: 'mindfulness', coins: 20, ge: 0, time: '13:00', isQuit: false },
      { key: 'evening_plan', name: 'Tomorrow plan before sleep (3 min)', emoji: '📝', category: 'mindfulness', coins: 15, ge: 0, time: '21:30', isQuit: false },
    ],
    week4: [
      { key: 'electrolyte_wake', name: 'Electrolyte water on waking', emoji: '💧', category: 'wellness', coins: 15, ge: 0, time: '07:30', isQuit: false },
      { key: 'light_before_coffee', name: 'Light outside before first coffee', emoji: '🌅', category: 'wellness', coins: 20, ge: 5, time: '07:40', isQuit: false },
      { key: 'protein_breakfast_delay', name: 'Protein breakfast (60–90 min after waking)', emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '09:00', isQuit: false },
      { key: 'peak_movement', name: 'Movement at your energy peak (40 min)', emoji: '🏋️', category: 'movement', coins: 50, ge: 10, time: '10:30', isQuit: false },
      { key: 'midday_reset', name: 'Breathwork or stretch after lunch', emoji: '🧘', category: 'mindfulness', coins: 20, ge: 0, time: '13:00', isQuit: false },
      { key: 'evening_plan', name: 'Tomorrow plan before sleep (3 min)', emoji: '📝', category: 'mindfulness', coins: 15, ge: 0, time: '21:30', isQuit: false },
      { key: 'plant_based_day', name: 'Plant-based day', emoji: '🌱', category: 'nutrition', coins: 25, ge: 25, time: '', isQuit: false },
    ],
  },

  // ── STEADY BUILDER (Bear / default) ──────────────────────────────────────
  steadybuilder: {
    week1: [
      { key: 'wake_7', name: 'Wake at 7:00 AM', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:00', isQuit: false },
      { key: 'morning_light_10', name: 'Morning light (10 min)', emoji: '☀️', category: 'wellness', coins: 20, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:00', isQuit: false },
    ],
    week2: [
      { key: 'wake_7', name: 'Wake at 7:00 AM', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:00', isQuit: false },
      { key: 'morning_light_10', name: 'Morning light (10 min)', emoji: '☀️', category: 'wellness', coins: 20, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (25g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:00', isQuit: false },
      { key: 'post_lunch_walk', name: 'Post-lunch walk (15 min)', emoji: '🚶', category: 'movement', coins: 25, ge: 8, time: '13:00', isQuit: false },
      { key: 'winddown_10', name: 'Wind-down at 10:00 PM', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '22:00', isQuit: false },
    ],
    week3: [
      { key: 'wake_7', name: 'Wake at 7:00 AM', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:00', isQuit: false },
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:00', isQuit: false },
      { key: 'post_lunch_walk', name: 'Post-lunch walk (20 min)', emoji: '🚶', category: 'movement', coins: 30, ge: 10, time: '13:00', isQuit: false },
      { key: 'afternoon_breathwork', name: 'Breathwork after lunch (5 min)', emoji: '🧘', category: 'mindfulness', coins: 20, ge: 0, time: '13:30', isQuit: false },
      { key: 'winddown_10', name: 'Wind-down at 10:00 PM', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '22:00', isQuit: false },
    ],
    week4: [
      { key: 'wake_7', name: 'Wake at 7:00 AM', emoji: '🌅', category: 'sleep', coins: 20, ge: 0, time: '07:00', isQuit: false },
      { key: 'morning_light_15', name: 'Morning light (15 min)', emoji: '☀️', category: 'wellness', coins: 25, ge: 0, time: '07:15', isQuit: false },
      { key: 'protein_breakfast', name: 'Protein breakfast (30g+)', emoji: '🥚', category: 'nutrition', coins: 30, ge: 0, time: '08:00', isQuit: false },
      { key: 'post_lunch_walk', name: 'Post-lunch walk (20 min)', emoji: '🚶', category: 'movement', coins: 30, ge: 10, time: '13:00', isQuit: false },
      { key: 'afternoon_breathwork', name: 'Breathwork after lunch (5 min)', emoji: '🧘', category: 'mindfulness', coins: 20, ge: 0, time: '13:30', isQuit: false },
      { key: 'plant_based_day', name: 'Plant-based day', emoji: '🌱', category: 'nutrition', coins: 25, ge: 25, time: '', isQuit: false },
      { key: 'gratitude_log', name: 'Evening gratitude log (2 min)', emoji: '📖', category: 'mindfulness', coins: 15, ge: 0, time: '21:30', isQuit: false },
      { key: 'winddown_10', name: 'Wind-down at 10:00 PM', emoji: '🌙', category: 'sleep', coins: 25, ge: 0, time: '22:00', isQuit: false },
    ],
  },
};

// ─── LEGACY CHRONOTYPE PROGRAMS ──────────────────────────────────────────────
// Kept for backwards compatibility if needed
export const SPRING_PROGRAM = {
  lion:    ARCHETYPE_PROGRAMS.optimizer,
  bear:    ARCHETYPE_PROGRAMS.steadybuilder,
  wolf:    ARCHETYPE_PROGRAMS.nightowl,
  dolphin: ARCHETYPE_PROGRAMS.scattered,
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Get habits for a user based on their archetype key and current week.
 * Falls back to chronotype if archetypeKey not found.
 */
export function getHabitsForUser(
  archetypeKeyOrChronotype: string,
  week: number
): Habit[] {
  const weekKey = `week${Math.min(Math.max(week, 1), 4)}` as keyof WeeklyHabits;

  // Try archetype first
  if (ARCHETYPE_PROGRAMS[archetypeKeyOrChronotype]) {
    return ARCHETYPE_PROGRAMS[archetypeKeyOrChronotype][weekKey];
  }

  // Fall back to chronotype mapping
  const chronoMap: Record<string, string> = {
    lion: 'optimizer',
    bear: 'steadybuilder',
    wolf: 'nightowl',
    dolphin: 'scattered',
  };

  const mapped = chronoMap[archetypeKeyOrChronotype];
  if (mapped && ARCHETYPE_PROGRAMS[mapped]) {
    return ARCHETYPE_PROGRAMS[mapped][weekKey];
  }

  // Final fallback
  return ARCHETYPE_PROGRAMS.steadybuilder.week1;
}

/**
 * Calculate which week of the program the user is in (1–4).
 */
export function getCurrentWeek(programStartDate: string): number {
  const start = new Date(programStartDate);
  const now = new Date();
  const daysSinceStart = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 4);
}

/**
 * Calculate which day of the current week (1–7).
 */
export function getDayOfWeek(programStartDate: string): number {
  const start = new Date(programStartDate);
  const now = new Date();
  const daysSinceStart = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return (daysSinceStart % 7) + 1;
}

/**
 * Get all archetype keys and their display info.
 */
export const ARCHETYPE_INFO: Record<string, { name: string; icon: string }> = {
  burnout:       { name: 'The Burnt-Out Rebuilder',   icon: '🌙' },
  nightowl:      { name: 'The Night Bloom',            icon: '🌙' },
  optimizer:     { name: 'The Energised Optimizer',    icon: '⚡' },
  scattered:     { name: 'The Scattered Spark',        icon: '🌀' },
  nurturer:      { name: 'The Nourishment Seeker',     icon: '🌸' },
  rebuilder:     { name: 'The Gentle Rebuilder',       icon: '🌱' },
  slowstarter:   { name: 'The Slow-Start Bloomer',     icon: '☀️' },
  steadybuilder: { name: 'The Steady Builder',         icon: '🌿' },
};
