// ============================================
// BLOOM — Health Intelligence Engine
// ============================================
// This generates personalized health reminders
// based on the user's profile, demographics,
// and tracked data. All content is grounded in
// peer-reviewed research (citations included).
// ============================================

import type { User, HealthReminder, CyclePhase } from '../types'

// ============================================
// DEMOGRAPHIC-AWARE REMINDERS
// ============================================
// Source: Ferdinand & Armani (2007). The management
// of hypertension in African Americans.
// Critical Pathways in Cardiology.

export function generateDemographicReminders(user: User): Partial<HealthReminder>[] {
  const reminders: Partial<HealthReminder>[] = []
  const ethnicities = user.ethnicity || []

  // Black/African American — hypertension, earlier onset
  if (ethnicities.some(e => ['black', 'african_american', 'afro_caribbean'].includes(e.toLowerCase()))) {
    reminders.push({
      type: 'insight',
      title: '💓 Blood Pressure Check',
      body: 'Black adults have higher rates of hypertension and earlier onset than other groups. The American Heart Association recommends checking your blood pressure at least once per year — or more often if readings have been elevated. The DASH diet (rich in fruits, vegetables, and low-fat dairy) has strong evidence for reducing blood pressure in this population.',
      source_study: 'Ferdinand & Armani (2007), Critical Pathways in Cardiology; AHA Guidelines (2023)',
    })
    reminders.push({
      type: 'insight',
      title: '🧂 Sodium & Heart Health',
      body: 'Research shows Black adults are often more sensitive to dietary sodium. Reducing sodium intake to under 1,500mg/day (vs. the standard 2,300mg recommendation) may have greater blood pressure benefits. Try tracking sodium in your nutrition log.',
      source_study: 'Appel et al. (1997), NEJM — DASH Trial',
    })
  }

  // Hispanic/Latino — diabetes risk
  if (ethnicities.some(e => ['hispanic', 'latino', 'latina', 'latinx'].includes(e.toLowerCase()))) {
    reminders.push({
      type: 'screening',
      title: '🩺 Diabetes Screening',
      body: 'Hispanic and Latino adults have roughly twice the risk of Type 2 diabetes compared to non-Hispanic white adults. The ADA recommends screening starting at 35, or earlier if you have risk factors. Physical activity habits in BLOOM directly reduce this risk — every logged workout counts.',
      source_study: 'ADA Standards of Medical Care in Diabetes (2024)',
    })
  }

  // South Asian — cardiovascular risk at lower BMI
  if (ethnicities.some(e => ['south_asian', 'indian', 'pakistani', 'bangladeshi', 'sri_lankan'].includes(e.toLowerCase()))) {
    reminders.push({
      type: 'insight',
      title: '❤️ Heart Risk at Lower BMI',
      body: 'South Asian adults have elevated cardiovascular risk at BMI levels considered "normal" for other populations. Some cardiologists recommend LDL and blood glucose screening starting at age 30. Discuss South Asian-specific risk thresholds with your doctor.',
      source_study: 'Sattar et al. (2012), The Lancet',
    })
  }

  return reminders
}

// ============================================
// AGE-BASED SCREENING REMINDERS
// ============================================

export function generateAgeBasedReminders(user: User): Partial<HealthReminder>[] {
  const reminders: Partial<HealthReminder>[] = []
  if (!user.birth_year) return reminders

  const age = new Date().getFullYear() - user.birth_year

  // Dental — everyone, every 6 months
  reminders.push({
    type: 'appointment',
    title: '🦷 Dentist Visit',
    body: 'Dental checkups every 6 months help catch cavities early and are linked to lower cardiovascular disease risk. When did you last go?',
    repeat_interval_days: 180,
    source_study: 'Tonetti et al. (2007), NEJM — Periodontal treatment and cardiovascular risk',
  })

  // Eye exam — every 2 years under 60, annually after
  if (age >= 20) {
    reminders.push({
      type: 'appointment',
      title: '👁 Eye Exam',
      body: age >= 60
        ? 'After 60, annual eye exams are recommended — glaucoma, macular degeneration, and diabetic retinopathy risk increase with age.'
        : 'An eye exam every 1–2 years is recommended. Early detection of conditions like glaucoma is key.',
      repeat_interval_days: age >= 60 ? 365 : 730,
      source_study: 'American Academy of Ophthalmology Guidelines (2023)',
    })
  }

  // Cervical screening (Pap smear) — ages 21–65
  if (user.biological_sex === 'female' && age >= 21 && age <= 65) {
    reminders.push({
      type: 'screening',
      title: '🩺 Cervical Screening',
      body: age < 30
        ? 'Pap smear every 3 years is recommended for ages 21–29.'
        : 'Co-testing (Pap + HPV) every 5 years, or Pap alone every 3 years, is recommended for ages 30–65.',
      repeat_interval_days: age < 30 ? 1095 : 1825,
      source_study: 'USPSTF Cervical Cancer Screening Guidelines (2018)',
    })
  }

  // Mammogram — age 40+
  if (user.biological_sex === 'female' && age >= 40) {
    reminders.push({
      type: 'screening',
      title: '🎀 Mammogram',
      body: age >= 40 && age < 50
        ? 'The USPSTF (2024) now recommends mammograms starting at age 40 (previously 50). Talk to your doctor about your personal risk and screening preference.'
        : 'Annual mammograms are recommended. If you have a family history of breast cancer, you may benefit from earlier or more frequent screening.',
      repeat_interval_days: 365,
      source_study: 'USPSTF Breast Cancer Screening Recommendation (2024)',
    })
  }

  // Colorectal cancer screening — 45+
  if (age >= 45) {
    reminders.push({
      type: 'screening',
      title: '🩺 Colorectal Cancer Screening',
      body: 'The USPSTF recommends colorectal cancer screening starting at age 45. Options include colonoscopy every 10 years or stool-based tests annually. Colorectal cancer is highly treatable when caught early.',
      repeat_interval_days: 365,
      source_study: 'USPSTF Colorectal Cancer Screening Guidelines (2021)',
    })
  }

  // Bone density — women 65+, or 50+ with risk factors
  if (user.biological_sex === 'female' && age >= 65) {
    reminders.push({
      type: 'screening',
      title: '🦴 Bone Density Scan (DEXA)',
      body: 'Bone density screening (DEXA scan) is recommended for women 65 and older to check for osteoporosis. Weight-bearing exercise — which you can track in BLOOM — is one of the best ways to maintain bone density.',
      source_study: 'USPSTF Osteoporosis Screening Guidelines (2018)',
    })
  }

  // Prostate screening conversation — men 50+
  if (user.biological_sex === 'male' && age >= 50) {
    reminders.push({
      type: 'screening',
      title: '🩺 Prostate Cancer Discussion',
      body: 'At 50 (or 40–45 for Black men and those with family history), it\'s worth having a conversation with your doctor about PSA screening. The evidence is mixed — your doctor can help weigh personal risk vs. benefit.',
      source_study: 'USPSTF Prostate Cancer Screening (2018); ACS guidelines for high-risk men',
    })
  }

  return reminders
}

// ============================================
// CYCLE-PHASE HABIT ADAPTATION
// ============================================
// Source: Sung et al. (2014), Wikström-Frisén et al. (2017)
// Hormonal influence on exercise performance across cycle phases

export const cyclePhaseGuidance: Record<CyclePhase, {
  label: string
  emoji: string
  description: string
  workout_suggestion: string
  nutrition_focus: string
  mindfulness_note: string
  source: string
}> = {
  menstrual: {
    label: 'Menstrual Phase',
    emoji: '🌑',
    description: 'Days 1–5. Estrogen and progesterone are at their lowest. Energy is naturally lower — honor that.',
    workout_suggestion: 'Gentle yoga, walking, or stretching. Your body is doing significant work already. Research shows high-intensity training during this phase may increase injury risk.',
    nutrition_focus: 'Iron-rich foods (leafy greens, lentils, lean red meat) to replenish iron lost through bleeding. Magnesium (dark chocolate, nuts) may reduce cramping. Stay hydrated.',
    mindfulness_note: 'This is a natural time for rest and reflection. Even 5 minutes of breathwork counts toward your mindfulness goal.',
    source: 'Wikström-Frisén et al. (2017), Journal of Sports Sciences',
  },
  follicular: {
    label: 'Follicular Phase',
    emoji: '🌒',
    description: 'Days 6–13. Estrogen is rising. Energy, mood, and motivation typically increase — ideal for building new habits.',
    workout_suggestion: 'This is a great time to start new workout habits or increase intensity. Muscle-building and endurance training respond well in this phase.',
    nutrition_focus: 'Focus on protein to support muscle repair, and complex carbohydrates for sustained energy. Fermented foods support gut health as your body prepares for ovulation.',
    mindfulness_note: 'Rising estrogen often improves cognitive clarity. Great time for goal-setting, journaling, or learning new skills.',
    source: 'Sung et al. (2014), Journal of Strength and Conditioning Research',
  },
  ovulatory: {
    label: 'Ovulatory Phase',
    emoji: '🌕',
    description: 'Days 14–16. Peak estrogen and LH surge. Energy, confidence, and social motivation are typically highest.',
    workout_suggestion: 'Peak performance window. High-intensity interval training (HIIT), heavy lifting, or challenging cardio. Your body\'s pain tolerance is naturally higher now.',
    nutrition_focus: 'Anti-inflammatory foods (berries, fatty fish, flaxseed) support this phase. Lighter meals if experiencing bloating.',
    mindfulness_note: 'You may feel naturally more outgoing — great time for community engagement, sharing your wellness journey, or accountability check-ins.',
    source: 'McNulty et al. (2020), Sports Medicine',
  },
  luteal: {
    label: 'Luteal Phase',
    emoji: '🌗',
    description: 'Days 17–28. Progesterone rises. Energy may dip in the second half. PMS symptoms can appear days 24–28.',
    workout_suggestion: 'Moderate exercise is beneficial and may reduce PMS symptoms. Avoid over-training. Pilates, swimming, and light strength work feel good for most people in this phase.',
    nutrition_focus: 'Complex carbs help regulate serotonin, which drops with progesterone. Reduce caffeine and alcohol, which can amplify PMS symptoms. Magnesium and B6 have evidence for PMS relief.',
    mindfulness_note: 'Emotional sensitivity is higher. Self-compassion practices and journaling are especially valuable. If habits slip this week, it\'s physiological — not a failure.',
    source: 'Direkvand-Moghadam et al. (2014), International Journal of Preventive Medicine',
  }
}

// ============================================
// HABIT NUDGE GENERATION
// ============================================
// Smart nudges based on user behavior patterns

export function generateHabitNudges(
  userId: string,
  recentSleepAvgHours: number,
  habitsCompletedToday: number,
  totalHabitsToday: number,
  hourOfDay: number
): Partial<HealthReminder>[] {
  const nudges: Partial<HealthReminder>[] = []

  // Low sleep nudge
  if (recentSleepAvgHours < 6.5) {
    nudges.push({
      type: 'insight',
      title: '😴 Sleep has been low this week',
      body: `You've averaged ${recentSleepAvgHours.toFixed(1)} hours over the past 3 nights. Research shows less than 7 hours impairs habit adherence, mood regulation, and immune function. Consider setting a wind-down habit in BLOOM tonight.`,
      source_study: 'Walker, M. (2017). Why We Sleep. Kline (2014), American Journal of Lifestyle Medicine.',
    })
  }

  // Evening nudge if habits incomplete
  if (hourOfDay >= 19 && habitsCompletedToday < totalHabitsToday) {
    const remaining = totalHabitsToday - habitsCompletedToday
    nudges.push({
      type: 'habit_nudge',
      title: `🌙 ${remaining} habit${remaining > 1 ? 's' : ''} still to go today`,
      body: 'The evening is still yours. Even completing one more habit today keeps your streak alive and adds to Fern\'s health bar.',
    })
  }

  return nudges
}
