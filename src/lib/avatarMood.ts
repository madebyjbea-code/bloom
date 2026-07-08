// avatarMood.ts
// Derives a DiceBear "personas" facial expression from the user's current
// health (and rest-day status) WITHOUT mutating their saved avatar.
//
// Usage (on the Dashboard / live avatar only — NOT the avatar editor):
//   import { getMoodExpression } from './avatarMood';
//   const { mouth, eyes } = getMoodExpression(health, avatarEyes, { isRestDay: isRestDayToday });
//   // then feed `mouth` and `eyes` into your DiceBear URL instead of the stored values.

export type AvatarMood = 'thriving' | 'content' | 'neutral' | 'struggling' | 'resting';

// Personas eye variants that are pure EXPRESSIONS (safe to override for mood).
// glasses / sunglasses are intentionally excluded so we never strip a user's
// chosen accessory when reflecting mood.
const SAFE_EYE_OVERRIDE = new Set(['open', 'happy', 'wink', 'sleep']);

// Health thresholds. Health floor is 10 and default is ~78, so these tiers
// map onto the real range the decay system produces.
export function getAvatarMood(
  health: number,
  opts: { isRestDay?: boolean } = {}
): AvatarMood {
  if (opts.isRestDay) return 'resting';   // protected day = peaceful, never sad
  if (health >= 75) return 'thriving';
  if (health >= 55) return 'content';
  if (health >= 38) return 'neutral';
  return 'struggling';
}

// Valid personas mouth variants: bigSmile, smile, lips, smirk, surprise, frown
const MOOD_MOUTH: Record<AvatarMood, string> = {
  thriving: 'bigSmile',
  content: 'smile',
  neutral: 'lips',      // closed/neutral — reads as "steady", not unhappy
  struggling: 'frown',
  resting: 'smile',
};

// Only thriving and resting nudge the eyes (and only when safe — see guard below).
// content / neutral / struggling keep the user's chosen eyes so the change stays subtle.
const MOOD_EYES: Partial<Record<AvatarMood, string>> = {
  thriving: 'happy',
  resting: 'sleep',
};

// Optional gentle captions. Deliberately encouraging — the mini-me is "you",
// so the struggling state is framed as a fresh start, never a failure.
export const MOOD_LABEL: Record<AvatarMood, string> = {
  thriving: 'thriving',
  content: 'doing well',
  neutral: 'steady',
  struggling: 'ready for a fresh start',
  resting: 'resting',
};

export function getMoodExpression(
  health: number,
  userEyes: string,
  opts: { isRestDay?: boolean; affectEyes?: boolean } = {}
): { mouth: string; eyes: string; mood: AvatarMood; label: string } {
  const mood = getAvatarMood(health, opts);
  const mouth = MOOD_MOUTH[mood];

  let eyes = userEyes;
  if (opts.affectEyes !== false) {
    const proposed = MOOD_EYES[mood];
    // Never override glasses/sunglasses — only swap pure-expression eyes.
    if (proposed && SAFE_EYE_OVERRIDE.has(userEyes)) {
      eyes = proposed;
    }
  }

  return { mouth, eyes, mood, label: MOOD_LABEL[mood] };
}
