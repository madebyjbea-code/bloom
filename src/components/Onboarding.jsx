'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getHabitsForUser } from '../lib/springProgram';
import { useStore } from '../lib/store';

// ─── QUIZ DATA ───────────────────────────────────────────
const QUESTIONS = [
  {
    pillar: '🕐 Body Rhythm',
    text: 'If you had no obligations, what time would you naturally wake up?',
    type: 'single',
    opts: [
      { l: 'A', t: 'Before 6:30 AM', h: 'Early riser', scores: { chrono: 'lion' } },
      { l: 'B', t: '6:30–8:00 AM', h: 'Standard rhythm', scores: { chrono: 'bear' } },
      { l: 'C', t: 'After 8:00 AM', h: 'Night owl', scores: { chrono: 'wolf' } },
      { l: 'D', t: 'It varies a lot', h: 'Irregular sleeper', scores: { chrono: 'dolphin' } },
    ],
  },
  {
    pillar: '⚡ Energy Patterns',
    text: 'When do you feel most mentally sharp and physically energised?',
    type: 'single',
    opts: [
      { l: 'A', t: 'Early morning (before 9 AM)', scores: { energy: 'morning' } },
      { l: 'B', t: 'Late morning to midday (9 AM–1 PM)', scores: { energy: 'midday' } },
      { l: 'C', t: 'Afternoon (1–5 PM)', scores: { energy: 'afternoon' } },
      { l: 'D', t: 'Evening — I hit my stride after 6 PM', scores: { energy: 'evening' } },
    ],
  },
  {
    pillar: '⚡ Energy Patterns',
    text: 'Which best describes how you start your mornings?',
    type: 'single',
    opts: [
      { l: 'A', t: 'Up and moving — I have a routine', h: 'Coffee, walk, or workout before most people wake', scores: { morning: 'structured' } },
      { l: 'B', t: 'Gradual ramp — decent once I get going', h: 'Need 20–30 min to feel human', scores: { morning: 'gradual' } },
      { l: 'C', t: 'I function on caffeine for the first hour', h: 'Rely on coffee or tea to start', scores: { morning: 'caffeine' } },
      { l: 'D', t: 'Mornings are rough until late morning', h: 'Real alertness comes much later', scores: { morning: 'slow' } },
    ],
  },
  {
    pillar: '🍽 Nutrition Barriers',
    text: "What's your biggest barrier to eating well consistently?",
    type: 'single',
    opts: [
      { l: 'A', t: "No time — I'm too busy or exhausted to cook", scores: { nutBarrier: 'time' } },
      { l: 'B', t: 'Boredom — I hate eating the same things', scores: { nutBarrier: 'variety' } },
      { l: 'C', t: "Planning — I buy groceries but don't use them", scores: { nutBarrier: 'planning' } },
      { l: 'D', t: 'Cravings or emotional eating derail me', scores: { nutBarrier: 'emotional' } },
    ],
  },
  {
    pillar: '🍽 Nutrition Barriers',
    text: 'How do you actually prefer to handle your meals?',
    type: 'single',
    opts: [
      { l: 'A', t: 'Grab-and-go — quick, minimal effort', scores: { mealStyle: 'grab' } },
      { l: 'B', t: 'Simple recipes — 30 min or less', scores: { mealStyle: 'simple' } },
      { l: 'C', t: 'Batch cooking — prep once, eat all week', scores: { mealStyle: 'batch' } },
      { l: 'D', t: 'Daily cooking — I enjoy it when I have energy', scores: { mealStyle: 'daily' } },
    ],
  },
  {
    pillar: '🏃 Movement & Life',
    text: 'What does your daily schedule look like?',
    type: 'single',
    opts: [
      { l: 'A', t: 'Structured 9–5 (or similar fixed hours)', scores: { schedule: 'structured' } },
      { l: 'B', t: 'Flexible — remote work or self-employed', scores: { schedule: 'flexible' } },
      { l: 'C', t: 'Caregiving responsibilities — irregular windows', scores: { schedule: 'caregiver' } },
      { l: 'D', t: 'Shift work or highly variable hours', scores: { schedule: 'shift' } },
    ],
  },
  {
    pillar: '🏃 Movement & Life',
    text: 'How much time can you realistically carve out for movement each day?',
    type: 'single',
    opts: [
      { l: 'A', t: '10–15 minutes max', scores: { movTime: 'minimal' } },
      { l: 'B', t: '20–30 minutes — I can make it work', scores: { movTime: 'moderate' } },
      { l: 'C', t: '45–60 minutes — I have time, need structure', scores: { movTime: 'good' } },
      { l: 'D', t: '60+ minutes — time is not the issue', scores: { movTime: 'ample' } },
    ],
  },
  {
    pillar: '🏃 Movement & Life',
    text: 'How would you describe your current activity level?',
    type: 'single',
    opts: [
      { l: 'A', t: 'Sedentary — desk job, little movement', scores: { activity: 'sedentary' } },
      { l: 'B', t: 'Lightly active — occasional walks, 1–2x/week', scores: { activity: 'light' } },
      { l: 'C', t: 'Moderately active — consistent 3–4x/week', scores: { activity: 'moderate' } },
      { l: 'D', t: 'Very active — daily movement, 5+/week', scores: { activity: 'active' } },
    ],
  },
  {
    pillar: '🧠 Stress & Mindset',
    text: "When you're stressed, what happens in your body and mind?",
    type: 'single',
    opts: [
      { l: 'A', t: 'Physical — tension, headaches, jaw clenching', scores: { stress: 'physical' } },
      { l: 'B', t: 'Mental — racing thoughts, overthinking', scores: { stress: 'mental' } },
      { l: 'C', t: 'Digestive or sleep disruption', scores: { stress: 'gut' } },
      { l: 'D', t: 'Emotional — irritability, overwhelm, tearfulness', scores: { stress: 'emotional' } },
    ],
  },
  {
    pillar: '🧠 Stress & Mindset',
    text: 'Do you have any consistent practices for managing stress?',
    type: 'single',
    opts: [
      { l: 'A', t: 'Yes — meditation, journalling, nature walks are regular', scores: { stressMgmt: 'strong' } },
      { l: 'B', t: 'Sometimes — but it is inconsistent', scores: { stressMgmt: 'occasional' } },
      { l: 'C', t: 'Rarely — I usually distract myself', scores: { stressMgmt: 'distract' } },
      { l: 'D', t: 'No — I do not really know how to decompress', scores: { stressMgmt: 'none' } },
    ],
  },
  {
    pillar: '🧠 Stress & Mindset',
    text: 'Which of these feel true for you right now?',
    type: 'multi',
    opts: [
      { l: 'A', t: 'Exhausted even after a full night of sleep', scores: { drain: 'sleep' } },
      { l: 'B', t: 'I know what I need to do but cannot seem to start', scores: { drain: 'inertia' } },
      { l: 'C', t: 'I feel emotionally flat or unmotivated most days', scores: { drain: 'mood' } },
      { l: 'D', t: 'I am ready for a real change — I just need structure', scores: { drain: 'ready' } },
    ],
  },
  {
    pillar: '🌱 Your Starting Point',
    text: 'How established is your current wellness routine?',
    type: 'single',
    opts: [
      { l: 'A', t: 'Just getting started — no real routine yet', h: 'Foundation · 10–15 min/day', scores: { level: 'foundation' } },
      { l: 'B', t: 'Some habits in place — inconsistent but trying', h: 'Building · 20–30 min/day', scores: { level: 'building' } },
      { l: 'C', t: 'Consistent habits — I want to level up', h: 'Optimisation · 30–45+ min/day', scores: { level: 'optimization' } },
    ],
  },
  {
    pillar: '🎯 Spring Goals',
    text: 'What matters most to you this spring?',
    type: 'multi',
    opts: [
      { l: 'A', t: 'Sustained energy throughout the day', scores: { goal: 'energy' } },
      { l: 'B', t: 'Better mood and mental clarity', scores: { goal: 'mood' } },
      { l: 'C', t: 'Improved sleep quality', scores: { goal: 'sleep' } },
      { l: 'D', t: 'Building consistent movement habits', scores: { goal: 'movement' } },
    ],
  },
];

// ─── TWO-TIER ARCHETYPE ENGINE ───────────────────────────
// Step 1: Determine chronotype (biological clock)
function deriveChronotype(s) {
  return s.chrono; // lion, bear, wolf, or dolphin
}

// Step 2: Determine wellness profile (lifestyle/behavioral pattern)
function deriveWellnessProfile(s) {
  const scores = {
    burnout: 0,
    optimizer: 0,
    nurturer: 0,
    rebuilder: 0,
    balanced: 0,
  };

  // ── BURNOUT SIGNALS ──
  if (s.drain.includes('sleep')) scores.burnout += 4;
  if (s.drain.includes('mood')) scores.burnout += 4;
  if (s.drain.includes('inertia')) scores.burnout += 3;
  if (s.stressMgmt === 'none' || s.stressMgmt === 'distract') scores.burnout += 5;
  if (s.stress === 'emotional') scores.burnout += 3;
  if (s.stress === 'mental') scores.burnout += 2;
  if (s.stress === 'gut') scores.burnout += 2;
  if (s.activity === 'sedentary') scores.burnout += 2;

  // ── OPTIMIZER SIGNALS ──
  if (s.level === 'optimization') scores.optimizer += 6;
  if (s.activity === 'active') scores.optimizer += 4;
  if (s.activity === 'moderate') scores.optimizer += 2;
  if (s.stressMgmt === 'strong') scores.optimizer += 3;
  if (s.movTime === 'ample' || s.movTime === 'good') scores.optimizer += 2;
  if (s.drain.includes('ready')) scores.optimizer += 2; // ready for change

  // ── NURTURER SIGNALS ──
  if (s.nutBarrier === 'emotional') scores.nurturer += 6;
  if (s.goals.includes('mood')) scores.nurturer += 3;
  if (s.stress === 'emotional') scores.nurturer += 3;
  if (s.drain.includes('mood')) scores.nurturer += 2;
  if (s.mealStyle === 'daily') scores.nurturer += 1; // enjoys cooking

  // ── REBUILDER SIGNALS ──
  if (s.level === 'foundation') scores.rebuilder += 5;
  if (s.movTime === 'minimal') scores.rebuilder += 4;
  if (s.activity === 'sedentary' || s.activity === 'light') scores.rebuilder += 3;
  if (s.nutBarrier === 'time') scores.rebuilder += 2;
  if (s.schedule === 'structured') scores.rebuilder += 1; // 9-5 = time constrained

  // ── BALANCED SIGNALS (default for healthy, consistent people) ──
  if (s.level === 'building') scores.balanced += 4;
  if (s.activity === 'moderate') scores.balanced += 2;
  if (s.stressMgmt === 'occasional') scores.balanced += 2;
  if (s.movTime === 'moderate' || s.movTime === 'good') scores.balanced += 2;
  if (s.drain.includes('ready')) scores.balanced += 1;

  // Find highest score
  let maxScore = 0;
  let bestProfile = 'balanced'; // fallback

  for (const [profile, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestProfile = profile;
    }
  }

  return bestProfile;
}

// Step 3: Combine chronotype + profile into archetype metadata
function buildArchetype(chronotype, profile) {
  const CHRONOTYPE_DATA = {
    lion: { name: 'Lion', icon: '🦁', desc: 'Early riser' },
    bear: { name: 'Bear', icon: '🐻', desc: 'Standard rhythm' },
    wolf: { name: 'Wolf', icon: '🐺', desc: 'Night owl' },
    dolphin: { name: 'Dolphin', icon: '🐬', desc: 'Irregular sleeper' },
  };

  const PROFILE_DATA = {
    burnout: { 
      name: 'Burnt-Out Rebuilder', 
      icon: '🌙',
      focus: 'Nervous system restoration, sleep, and stress recovery',
    },
    optimizer: { 
      name: 'Energised Optimizer', 
      icon: '⚡',
      focus: 'Performance optimization and habit refinement',
    },
    nurturer: { 
      name: 'Nourishment Seeker', 
      icon: '🌸',
      focus: 'Gut-brain connection and emotional eating patterns',
    },
    rebuilder: { 
      name: 'Gentle Rebuilder', 
      icon: '🌱',
      focus: 'Low-barrier habits for time-constrained beginners',
    },
    balanced: { 
      name: 'Steady Builder', 
      icon: '🌿',
      focus: 'Balanced progression across all wellness pillars',
    },
  };

  const chrono = CHRONOTYPE_DATA[chronotype];
  const prof = PROFILE_DATA[profile];

  return {
    chronotype,
    chronotypeName: chrono.name,
    chronotypeIcon: chrono.icon,
    chronotypeDesc: chrono.desc,
    
    profile,
    profileName: prof.name,
    profileIcon: prof.icon,
    profileFocus: prof.focus,

    // Combined display name
    archetypeName: `${chrono.icon} ${chrono.name} ${prof.icon} ${prof.name}`,
    archetypeKey: `${chronotype}-${profile}`, // e.g., "wolf-burnout"
  };
}

// Legacy mapping for springProgram (until we rebuild programs with two-tier logic)
const LEGACY_ARCHETYPE_MAP = {
  'lion-optimizer': 'optimizer',
  'lion-burnout': 'burnout',
  'lion-nurturer': 'nurturer',
  'lion-rebuilder': 'rebuilder',
  'lion-balanced': 'steadybuilder',
  
  'bear-optimizer': 'optimizer',
  'bear-burnout': 'burnout',
  'bear-nurturer': 'nurturer',
  'bear-rebuilder': 'rebuilder',
  'bear-balanced': 'steadybuilder',
  
  'wolf-optimizer': 'nightowl',
  'wolf-burnout': 'burnout',
  'wolf-nurturer': 'nurturer',
  'wolf-rebuilder': 'nightowl',
  'wolf-balanced': 'nightowl',
  
  'dolphin-optimizer': 'scattered',
  'dolphin-burnout': 'scattered',
  'dolphin-nurturer': 'nurturer',
  'dolphin-rebuilder': 'scattered',
  'dolphin-balanced': 'scattered',
};

// ─── COMPONENT ────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const [phase, setPhase] = useState('intro'); // intro | signin | quiz | reveal | gate | name
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(new Array(QUESTIONS.length).fill(null));
  const [collectedScores, setCollectedScores] = useState({});
  const [derivedArchetype, setDerivedArchetype] = useState(null); // Store archetype after quiz
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [avatarType, setAvatarType] = useState('pet');
  const [avatarName, setAvatarName] = useState('Fern');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const setUser = useStore((s) => s.setUser);
  const setHabits = useStore((s) => s.setHabits);

  const q = QUESTIONS[current];
  const isMulti = q?.type === 'multi';
  const pct = Math.round((current / QUESTIONS.length) * 100);
  const hasAnswer =
    answers[current] !== null &&
    !(Array.isArray(answers[current]) && answers[current].length === 0);

  // ── Option select ──
  function selectOpt(idx) {
    if (isMulti) {
      const prev = Array.isArray(answers[current]) ? [...answers[current]] : [];
      const pos = prev.indexOf(idx);
      const next = pos === -1 ? [...prev, idx] : prev.filter((i) => i !== pos);
      const updated = [...answers];
      updated[current] = next.length > 0 ? next : null;
      setAnswers(updated);
    } else {
      const updated = [...answers];
      updated[current] = idx;
      setAnswers(updated);
    }
  }

  // ── Next question ──
  function handleNext() {
    const ans = answers[current];
    const newScores = { ...collectedScores };

    const collect = (idx) => {
      const s = q.opts[idx].scores;
      Object.entries(s).forEach(([k, v]) => {
        if (!newScores[k]) newScores[k] = [];
        newScores[k].push(v);
      });
    };

    if (Array.isArray(ans)) ans.forEach(collect);
    else collect(ans);

    setCollectedScores(newScores);

    // Allow full quiz completion
    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
    } else {
      // Quiz complete - calculate chronotype + profile and show reveal
      const s = {
        chrono: (newScores.chrono || ['bear'])[0],
        level: (newScores.level || ['building'])[0],
        energy: (newScores.energy || ['midday'])[0],
        nutBarrier: (newScores.nutBarrier || ['time'])[0],
        movTime: (newScores.movTime || ['moderate'])[0],
        activity: (newScores.activity || ['light'])[0],
        stress: (newScores.stress || ['mental'])[0],
        stressMgmt: (newScores.stressMgmt || ['occasional'])[0],
        morning: (newScores.morning || ['gradual'])[0],
        mealStyle: (newScores.mealStyle || ['simple'])[0],
        schedule: (newScores.schedule || ['structured'])[0],
        goals: newScores.goal || ['energy'],
        drain: newScores.drain || [],
      };

      // Two-tier derivation
      const chronotype = deriveChronotype(s);
      const profile = deriveWellnessProfile(s);
      const archetype = buildArchetype(chronotype, profile);
      
      setDerivedArchetype({
        chronotype,
        profile,
        archetype,
        scores: s,
      });
      
      setPhase('reveal');
    }
  }

  function handleBack() {
    if (current > 0) setCurrent(current - 1);
  }

  // ── Finish — create user in Supabase ──
  async function handleFinish(e) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      setIsLoading(false);
      return;
    }
    if (!accessCode.trim()) {
      setError('Please enter your access code.');
      setIsLoading(false);
      return;
    }

    try {
      const code = accessCode.trim().toLowerCase();

      // ── Step 1: Check if returning user with this code ──
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('access_code', code)
        .order('created_at', { ascending: false });

      if (existing && existing.length > 0) {
        // Returning user — restore account, skip quiz
        const u = existing[0];
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', u.id)
          .single();

        setUser({
          userId: u.id,
          accessCode: u.access_code,
          name: u.name,
          avatarType: u.avatar_type,
          avatarName: u.avatar_name,
          avatarEmoji: u.avatar_emoji,
          chronotype: u.chronotype,
          lifestyleLevel: u.lifestyle_level,
          archetypeKey: u.archetype_key || null,
          archetypeName: u.archetype_name || null,
          archetypeIcon: u.archetype_icon || null,
          health: stats?.health ?? 78,
          coins: stats?.coins ?? 0,
          greenEnergy: stats?.green_energy ?? 0,
          level: stats?.level ?? 1,
        });

        const src = u.archetype_key || u.chronotype || 'steadybuilder';
        setHabits(getHabitsForUser(src, u.current_week || 1));
        onComplete();
        return;
      }

      // ── Step 2: New user — validate code against access_codes table ──
      const { data: validCode, error: codeErr } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code)
        .eq('redeemed', false)
        .single();

      if (codeErr || !validCode) {
        setError('Invalid or already used access code. Check your purchase confirmation email or contact support.');
        setIsLoading(false);
        return;
      }

      // Use the archetype that was already calculated during quiz
      const { chronotype, profile, archetype, scores: s } = derivedArchetype;
      
      // Get legacy archetype key for springProgram compatibility
      const legacyArchetypeKey = LEGACY_ARCHETYPE_MAP[archetype.archetypeKey] || 'steadybuilder';

      const avatarEmojis = { pet: '🦔', 'mini-me': '🧑‍🌿', simple: '📊' };

      // Create user row
      const { data: user, error: createErr } = await supabase
        .from('users')
        .insert({
          access_code: accessCode.trim().toLowerCase(),
          name: name.trim(),
          avatar_type: avatarType,
          avatar_name: avatarType === 'pet' ? avatarName || 'Fern' : null,
          avatar_emoji: avatarEmojis[avatarType] || '🦔',
          chronotype,
          lifestyle_level: s.level,
          archetype_key: archetype.archetypeKey, // e.g., "wolf-burnout"
          archetype_name: archetype.archetypeName, // e.g., "🐺 Wolf 🌙 Burnt-Out Rebuilder"
          archetype_icon: archetype.profileIcon, // Profile icon
          current_week: 1,
          program_start_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (createErr) throw createErr;

      // Mark access code as redeemed
      await supabase
        .from('access_codes')
        .update({ redeemed: true, redeemed_by: user.id })
        .eq('code', code);

      // user_stats row is auto-created by DB trigger — fetch to confirm
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUser({
        userId: user.id,
        accessCode: user.access_code,
        name: user.name,
        avatarType: user.avatar_type,
        avatarName: user.avatar_name,
        avatarEmoji: user.avatar_emoji,
        chronotype,
        lifestyleLevel: s.level,
        archetypeKey: archetype.archetypeKey,
        archetypeName: archetype.archetypeName,
        archetypeIcon: archetype.profileIcon,
        health: stats?.health ?? 78,
        coins: stats?.coins ?? 0,
        greenEnergy: stats?.green_energy ?? 0,
        level: stats?.level ?? 1,
      });

      // Post welcome message to community
      await supabase.from('community_posts').insert({
        user_id: user.id,
        user_name: user.name,
        user_avatar_emoji: user.avatar_emoji,
        content: `Just joined the Spring Wellness Program as ${archetype.chronotypeIcon} ${archetype.chronotypeName} with ${archetype.profileIcon} ${archetype.profileName} profile! Let's bloom 🌱`,
        post_type: 'milestone',
      });

      const habits = getHabitsForUser(legacyArchetypeKey, 1);
      setHabits(habits);
      onComplete();
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // SIGN IN — returning user, access code only
  // ─────────────────────────────────────────────────────────
  const [signinCode, setSigninCode] = useState('');
  const [signinError, setSigninError] = useState('');
  const [signinLoading, setSigninLoading] = useState(false);

  async function handleSignIn(e) {
    e.preventDefault();
    if (!signinCode.trim()) return;
    setSigninLoading(true);
    setSigninError('');

    try {
      const code = signinCode.trim().toLowerCase();
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('access_code', code)
        .order('created_at', { ascending: false });

      if (!existing || existing.length === 0) {
        setSigninError('No account found with that code. Check your purchase email or start fresh.');
        setSigninLoading(false);
        return;
      }

      const u = existing[0];
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', u.id)
        .single();

      setUser({
        userId: u.id,
        accessCode: u.access_code,
        name: u.name,
        avatarType: u.avatar_type,
        avatarName: u.avatar_name,
        avatarEmoji: u.avatar_emoji,
        chronotype: u.chronotype,
        lifestyleLevel: u.lifestyle_level,
        archetypeKey: u.archetype_key || null,
        archetypeName: u.archetype_name || null,
        archetypeIcon: u.archetype_icon || null,
        health: stats?.health ?? 78,
        coins: stats?.coins ?? 0,
        greenEnergy: stats?.green_energy ?? 0,
        level: stats?.level ?? 1,
      });

      const src = u.archetype_key || u.chronotype || 'steadybuilder';
      setHabits(getHabitsForUser(src, u.current_week || 1));
      onComplete();
    } catch (err) {
      console.error(err);
      setSigninError('Something went wrong. Please try again.');
    } finally {
      setSigninLoading(false);
    }
  }

  // ── Gate — validate code mid-quiz ──────────────────────
  // ── RENDER: SIGN IN ──────────────────────────────────────
  if (phase === 'signin') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoBar}>
            <span style={styles.logo}>BLOOM</span>
            <span style={styles.pill}>🌿 Spring Wellness</span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
            <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, fontWeight: 400, color: '#1a1a1a', marginBottom: 8 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 15, color: '#888', lineHeight: 1.6 }}>
              Enter your access code to continue your program
            </p>
          </div>

          <div style={styles.qCard}>
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={styles.inputLabel}>Your access code</label>
                <input
                  type="text"
                  value={signinCode}
                  onChange={e => setSigninCode(e.target.value)}
                  placeholder="e.g. bloom-spring-007"
                  autoFocus
                  style={{ ...styles.input, fontSize: 16, letterSpacing: '0.5px', textAlign: 'center' }}
                  onFocus={e => e.target.style.borderColor = 'var(--sage)'}
                  onBlur={e => e.target.style.borderColor = '#e8e4de'}
                />
                <p style={{ fontSize: 12, color: '#aaa', marginTop: 6, textAlign: 'center' }}>
                  This was emailed to you after purchase
                </p>
              </div>

              {signinError && (
                <div style={{ background: '#fdf0f0', border: '1px solid #e07070', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#c05050', lineHeight: 1.5 }}>
                  {signinError}
                </div>
              )}

              <button
                type="submit"
                disabled={signinLoading || !signinCode.trim()}
                style={{ ...styles.btnPrimary, opacity: signinLoading || !signinCode.trim() ? 0.6 : 1, cursor: signinLoading || !signinCode.trim() ? 'not-allowed' : 'pointer' }}
              >
                {signinLoading ? 'Signing in...' : 'Continue to my program →'}
              </button>
            </form>
          </div>

          <button
            onClick={() => setPhase('intro')}
            style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer', marginTop: 16, display: 'block', textAlign: 'center', width: '100%', fontFamily: 'DM Sans, sans-serif' }}
          >
            ← Back to intro
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#bbb' }}>
            Don&apos;t have a code?{' '}
            <a href="https://byjbea.gumroad.com/l/qdxti" target="_blank" rel="noreferrer" style={{ color: 'var(--sage-dark)', textDecoration: 'none', fontWeight: 500 }}>
              Get access →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: REVEAL (after quiz, before gate) ────────────
  if (phase === 'reveal' && derivedArchetype) {
    const { archetype, chronotype, profile } = derivedArchetype;
    
    // Get legacy program for display (until we rebuild programs)
    const legacyKey = LEGACY_ARCHETYPE_MAP[archetype.archetypeKey] || 'steadybuilder';
    
    // Import program data from ARCHETYPE_PROGRAMS (similar to ProgramReveal)
    const ARCHETYPE_PROGRAMS = {
      burnout: {
        programTitle: 'Rest &',
        programTitleItalic: 'Rise',
        programDesc: 'A 4-week nervous system restoration program that prioritises sleep, breathwork, and nourishment before any intensity.',
        color: '#7a6e9e',
        pillars: [
          { icon: '😴', name: 'Sleep Architecture' },
          { icon: '🫁', name: 'Nervous System Reset' },
          { icon: '🥗', name: 'Cortisol Nutrition' },
          { icon: '🚶', name: 'Gentle Movement' },
          { icon: '📖', name: 'Mindful Anchor' },
          { icon: '🌱', name: 'Plant Reset' },
        ],
      },
      nightowl: {
        programTitle: 'Night Bloom',
        programTitleItalic: 'Spring',
        programDesc: 'A late-shifted circadian support program. Rather than forcing early mornings, this anchors your rhythm at the right phase.',
        color: '#5a6e8a',
        pillars: [
          { icon: '🌅', name: 'Light Anchor' },
          { icon: '🏃', name: 'Afternoon Movement' },
          { icon: '🥗', name: 'Aligned Eating' },
          { icon: '📵', name: 'Evening Wind-Down' },
          { icon: '🌱', name: 'Plant Diversity' },
          { icon: '📝', name: 'Evening Intention' },
        ],
      },
      optimizer: {
        programTitle: 'Sharpen &',
        programTitleItalic: 'Flourish',
        programDesc: 'A 4-week optimisation protocol for someone with established habits who wants to identify and close specific energy gaps.',
        color: '#5a8a6a',
        pillars: [
          { icon: '🌅', name: 'Pre-Dawn Anchor' },
          { icon: '🥗', name: 'Precision Nutrition' },
          { icon: '🏋️', name: 'Strength Signal' },
          { icon: '🧘', name: 'Recovery Protocol' },
          { icon: '🌿', name: 'Gut Diversity Upgrade' },
          { icon: '📊', name: 'Weekly Reflection' },
        ],
      },
      scattered: {
        programTitle: 'Ground &',
        programTitleItalic: 'Gather',
        programDesc: 'A 4-week rhythm anchoring program for variable schedules. Built around minimum viable anchors that create consistency.',
        color: '#8a7a5a',
        pillars: [
          { icon: '⏰', name: 'Anchor Points' },
          { icon: '💧', name: 'Morning Signal' },
          { icon: '🥗', name: 'Minimum Viable Nutrition' },
          { icon: '🤸', name: 'Micro Movement' },
          { icon: '🫁', name: 'Grounding Practice' },
          { icon: '📖', name: 'Evening Offload' },
        ],
      },
      nurturer: {
        programTitle: 'Nourish &',
        programTitleItalic: 'Bloom',
        programDesc: 'A 4-week program centred on the gut-brain axis and emotional eating patterns. Built to add pleasure and satisfaction.',
        color: '#8a5a6a',
        pillars: [
          { icon: '🧠', name: 'Gut-Brain Axis' },
          { icon: '🥗', name: 'Pleasure-First Nourishment' },
          { icon: '🫁', name: 'Pre-Craving Breathwork' },
          { icon: '😴', name: 'Sleep for Appetite' },
          { icon: '🍽', name: 'Mindful Eating' },
          { icon: '🌸', name: 'Self-Compassion' },
        ],
      },
      rebuilder: {
        programTitle: 'Steady &',
        programTitleItalic: 'Sustainable',
        programDesc: 'A low-barrier entry program for those with limited time. Short, achievable habits that build momentum without overwhelm.',
        color: '#6a8a7a',
        pillars: [
          { icon: '🚶', name: '10-Minute Daily Walk' },
          { icon: '🥗', name: 'One Whole Food Swap' },
          { icon: '💧', name: 'Hydration Signal' },
          { icon: '🫁', name: 'Desk Breathing Reset' },
          { icon: '📖', name: 'Evening Reflection' },
          { icon: '🌱', name: 'Gentle Plant Increase' },
        ],
      },
      steadybuilder: {
        programTitle: 'Build &',
        programTitleItalic: 'Sustain',
        programDesc: 'A balanced 4-week program for consistent habit-builders who want structured progression without extremes.',
        color: '#7a8a6a',
        pillars: [
          { icon: '🏃', name: 'Regular Movement' },
          { icon: '🥗', name: 'Balanced Nutrition' },
          { icon: '😴', name: 'Sleep Routine' },
          { icon: '🫁', name: 'Stress Management' },
          { icon: '🌱', name: 'Plant Diversity' },
          { icon: '📊', name: 'Progress Tracking' },
        ],
      },
    };

    const program = ARCHETYPE_PROGRAMS[legacyKey] || ARCHETYPE_PROGRAMS.steadybuilder;

    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Header - Two-tier display */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#8aad8a', marginBottom: 12 }}>
              Your personalised wellness profile
            </div>
            
            {/* Chronotype badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f7f3ed', border: '2px solid #e8e4de', borderRadius: 16, padding: '10px 20px', marginBottom: 16 }}>
              <span style={{ fontSize: 32 }}>{archetype.chronotypeIcon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa' }}>Chronotype</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#2a2a2a' }}>{archetype.chronotypeName}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{archetype.chronotypeDesc}</div>
              </div>
            </div>

            {/* Profile (main archetype) */}
            <div style={{ fontSize: 64, marginBottom: 12 }}>{archetype.profileIcon}</div>
            <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a16', marginBottom: 8 }}>
              {archetype.profileName}
            </h1>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
              {archetype.profileFocus}
            </p>
          </div>

          {/* Program preview */}
          <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '28px 24px', marginBottom: 24, borderTop: `4px solid ${program.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: '#aaa', marginBottom: 8 }}>
              Your program
            </div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, fontWeight: 400, marginBottom: 12, color: '#1a1a16' }}>
              {program.programTitle}{' '}
              <em style={{ color: program.color, fontStyle: 'italic' }}>{program.programTitleItalic}</em>
            </h2>
            <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7, marginBottom: 20 }}>
              {program.programDesc}
            </p>

            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 12 }}>
              Your 6 science-backed pillars
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {program.pillars.map((pillar, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555' }}>
                  <span style={{ fontSize: 18 }}>{pillar.icon}</span>
                  <span style={{ fontWeight: 500 }}>{pillar.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Two-tier explanation */}
          <div style={{ background: '#f7f3ed', border: '1px solid #e8e4de', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>
              <strong style={{ color: '#2a2a2a' }}>Why two parts?</strong> Your {archetype.chronotypeIcon} {archetype.chronotypeName} chronotype determines <em>when</em> you do habits (timing, energy peaks). Your {archetype.profileIcon} {archetype.profileName} profile determines <em>what</em> habits you need (focus areas, recovery vs. optimization).
            </div>
          </div>

          {/* CTA - proceed to gate */}
          <button
            onClick={() => setPhase('gate')}
            style={{ width: '100%', background: 'var(--sage)', color: 'white', border: 'none', borderRadius: 14, padding: '16px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: 16 }}
          >
            Unlock my full program →
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
            Your {archetype.chronotypeName} × {archetype.profileName} program is ready. Complete registration to start.
          </p>
        </div>
      </div>
    );
  }

  // ── RENDER: GATE (paywall after archetype reveal) ───────
  if (phase === 'gate') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoBar}>
            <span style={styles.logo}>BLOOM</span>
            <span style={styles.pill}>🌿 Spring Wellness</span>
          </div>

          {/* Main gate card */}
          <div style={styles.qCard}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, fontWeight: 400, color: '#1a1a1a', marginBottom: 8 }}>
                Your {derivedArchetype?.archetype.chronotypeIcon} {derivedArchetype?.archetype.chronotypeName} × {derivedArchetype?.archetype.profileIcon} {derivedArchetype?.archetype.profileName} program is ready
              </h2>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7 }}>
                Enter your access code to unlock your full 4-week personalised plan and start today.
              </p>
            </div>

            {/* Beta pricing callout */}
            <div style={{ background: 'linear-gradient(135deg, #f3f8f3 0%, #fdf9f0 100%)', border: '2px solid var(--sage-light)', borderRadius: 14, padding: '18px 20px', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ background: 'var(--sage)', color: 'white', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 6 }}>
                  Beta Founding Member
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage-dark)' }}>First 10 users only</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a16', marginBottom: 4 }}>
                €10
                <span style={{ fontSize: 15, fontWeight: 400, color: '#888', marginLeft: 6 }}>lifetime access</span>
              </div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
                One-time payment • No subscription • Full access forever • Priority support
              </div>
            </div>

            {/* What's included */}
            <div style={{ background: '#f7f3ed', borderRadius: 14, padding: '16px 18px', marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 12 }}>What you get</div>
              {[
                `${derivedArchetype?.archetype.profileIcon} Your ${derivedArchetype?.archetype.profileName} 4-week program`,
                '⏱ Guided routines with step-by-step timer',
                '🔬 Peer-reviewed science behind every habit',
                '🎮 Gamification - coins, energy, avatar progression',
                '👥 Private Spring cohort community',
                '📊 Progress tracking & weekly roadmap',
              ].map(item => (
                <div key={item} style={{ fontSize: 13, color: '#555', marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0 }}>{item.split(' ')[0]}</span>
                  <span>{item.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setPhase('name'); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <button
                type="submit"
                style={{ ...styles.btnPrimary, background: 'var(--sage)', fontSize: 15 }}
              >
                I have an access code →
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 18, paddingTop: 18, borderTop: '1px solid #e8e4de' }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Don&apos;t have a code yet?</div>
              <a
                href="https://byjbea.gumroad.com/l/qdxti"
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', background: '#1a1a16', color: 'white', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}
              >
                Get beta access for €10 →
              </a>
            </div>

            <button
              onClick={() => setPhase('reveal')}
              style={{ background: 'transparent', border: 'none', color: '#bbb', fontSize: 12, cursor: 'pointer', marginTop: 16, width: '100%', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}
            >
              ← Back to my archetype
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: INTRO ────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoBar}>
            <span style={styles.logo}>BLOOM</span>
            <span style={styles.pill}>🌿 Spring Wellness</span>
          </div>

          <div style={styles.introEyebrow}>Precision Wellness · Spring 2026</div>
          <h1 style={styles.introH1}>
            Discover your{' '}
            <em style={{ color: 'var(--sage)', fontStyle: 'italic' }}>
              Wellness Archetype
            </em>
          </h1>
          <p style={styles.introLead}>
            Most wellness programs give everyone the same plan. BLOOM does not.
            Your Spring Wellness Program is built from your actual biology, schedule,
            stress patterns, and goals — not a generic template.
          </p>

          <div style={styles.precisionBlock}>
            <p style={styles.precisionP}>
              This 13-question assessment maps your{' '}
              <strong style={{ color: 'var(--sage-dark)', fontWeight: 600 }}>chronotype</strong> (your
              body clock),{' '}
              <strong style={{ color: 'var(--sage-dark)', fontWeight: 600 }}>lifestyle barriers</strong>{' '}
              (what actually stops you),{' '}
              <strong style={{ color: 'var(--sage-dark)', fontWeight: 600 }}>nervous system patterns</strong>{' '}
              (how stress shows up), and{' '}
              <strong style={{ color: 'var(--sage-dark)', fontWeight: 600 }}>energy architecture</strong>{' '}
              (when and why you crash).
            </p>
            <p style={{ ...styles.precisionP, marginBottom: 0 }}>
              The result is your{' '}
              <strong style={{ color: 'var(--sage-dark)', fontWeight: 600 }}>Wellness Archetype</strong> —
              one of 8 science-informed profiles that determines your program pillars, habit
              timing, and the research behind every recommendation. No two people get the same plan.
            </p>
          </div>

          <div style={styles.timeBadge}>⏱ 4 minutes · 13 questions · instant results</div>

          <div style={styles.pillarsRow}>
            {['🕐 Chronotype', '⚡ Energy', '🍽 Nutrition', '🏃 Movement', '🧠 Stress', '🎯 Goals'].map((p) => (
              <span key={p} style={styles.pillarChip}>{p}</span>
            ))}
          </div>

          <button style={styles.btnPrimary} onClick={() => setPhase('quiz')}>
            Map my archetype →
          </button>

          <button
            onClick={() => setPhase('signin')}
            style={{ background: 'transparent', border: '1.5px solid #e8e4de', borderRadius: 12, padding: '12px 24px', fontSize: 14, color: '#888', cursor: 'pointer', marginTop: 12, width: '100%', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, transition: 'all 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--sage)'; e.currentTarget.style.color = 'var(--sage-dark)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#e8e4de'; e.currentTarget.style.color = '#888'; }}
          >
            Already have an account? Sign in →
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDER: QUIZ
  // ─────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoBar}>
            <span style={styles.logo}>BLOOM</span>
            <span style={styles.pill}>🌿 Spring Wellness</span>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 28 }}>
            <div style={styles.progMeta}>
              <span>Question {current + 1} of {QUESTIONS.length}</span>
              <span>{pct}%</span>
            </div>
            <div style={styles.progBar}>
              <div style={{ ...styles.progFill, width: `${pct}%` }} />
            </div>
            <div style={styles.dotRow}>
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.dot,
                    background: i < current ? 'var(--sage-light)' : i === current ? 'var(--sage)' : '#e8e4de',
                    transform: i === current ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Question card */}
          <div style={styles.qCard}>
            <div style={styles.pillarTag}>
              <div style={styles.pillarDot} />
              <span>{q.pillar}</span>
            </div>
            <div style={styles.qNum}>
              {String(current + 1).padStart(2, '0')}
            </div>
            <div style={styles.qText}>{q.text}</div>

            {isMulti && (
              <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginBottom: 12, fontStyle: 'italic' }}>
                Select all that apply
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {q.opts.map((opt, idx) => {
                const sel = Array.isArray(answers[current])
                  ? answers[current].includes(idx)
                  : answers[current] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => selectOpt(idx)}
                    style={{
                      ...styles.optBtn,
                      borderColor: sel ? 'var(--sage)' : '#e8e4de',
                      background: sel ? '#f3f8f3' : 'white',
                    }}
                  >
                    <div style={{
                      ...styles.optLetter,
                      background: sel ? 'var(--sage)' : 'transparent',
                      borderColor: sel ? 'var(--sage)' : '#e8e4de',
                      color: sel ? 'white' : '#888',
                    }}>
                      {opt.l}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 14, color: '#2a2a2a' }}>{opt.t}</div>
                      {opt.h && (
                        <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{opt.h}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={styles.navRow}>
              {current > 0 ? (
                <button style={styles.btnGhost} onClick={handleBack}>← Back</button>
              ) : (
                <div />
              )}
              <button
                style={{
                  ...styles.btnPrimary,
                  flex: 1,
                  maxWidth: 200,
                  opacity: hasAnswer ? 1 : 0.4,
                  cursor: hasAnswer ? 'pointer' : 'not-allowed',
                }}
                onClick={handleNext}
                disabled={!hasAnswer}
              >
                {current === QUESTIONS.length - 1 ? 'Almost done →' : 'Continue →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDER: NAME + ACCESS CODE
  // ─────────────────────────────────────────────────────────
  if (phase === 'name') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoBar}>
            <span style={styles.logo}>BLOOM</span>
          </div>

          <div style={styles.qCard}>
            <div style={styles.pillarTag}>
              <div style={styles.pillarDot} />
              <span>Almost there</span>
            </div>
            <div style={styles.qText}>One last thing — what should we call you?</div>

            <form onSubmit={handleFinish} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={styles.inputLabel}>Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan"
                  required
                  style={styles.input}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--sage)')}
                  onBlur={(e) => (e.target.style.borderColor = '#e8e4de')}
                />
              </div>

              <div>
                <label style={styles.inputLabel}>Access code</label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter code from your guide"
                  required
                  style={styles.input}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--sage)')}
                  onBlur={(e) => (e.target.style.borderColor = '#e8e4de')}
                />
              </div>

              <div>
                <label style={styles.inputLabel}>Avatar style</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { key: 'pet', icon: '🦔', label: 'Pet' },
                    { key: 'mini-me', icon: '🧑‍🌿', label: 'Mini-Me' },
                    { key: 'simple', icon: '📊', label: 'Simple' },
                  ].map(({ key, icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAvatarType(key)}
                      style={{
                        padding: '14px 8px',
                        borderRadius: 12,
                        border: `2px solid ${avatarType === key ? 'var(--sage)' : '#e8e4de'}`,
                        background: avatarType === key ? '#f3f8f3' : 'white',
                        cursor: 'pointer',
                        fontSize: 28,
                        textAlign: 'center',
                      }}
                    >
                      {icon}
                      <div style={{ fontSize: 11, marginTop: 6, color: '#888' }}>{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {avatarType === 'pet' && (
                <div>
                  <label style={styles.inputLabel}>Pet name</label>
                  <input
                    type="text"
                    value={avatarName}
                    onChange={(e) => setAvatarName(e.target.value)}
                    placeholder="Fern"
                    style={styles.input}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--sage)')}
                    onBlur={(e) => (e.target.style.borderColor = '#e8e4de')}
                  />
                </div>
              )}

              {error && (
                <div style={{ background: '#fff5f5', border: '1.5px solid #e07070', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ color: '#e07070', fontSize: 13, margin: 0 }}>{error}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" style={styles.btnGhost} onClick={() => setPhase('quiz')}>
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{ ...styles.btnPrimary, flex: 1, opacity: isLoading ? 0.6 : 1 }}
                >
                  {isLoading ? 'Creating your program...' : 'See my archetype ✨'}
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 4 }}>
                Do not have a code?{' '}
                <a href="https://byjbea.myshopify.com" style={{ color: 'var(--sage)' }}>
                  Get the guide →
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── STYLES ──────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--cream)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '0 0 60px',
    overflowX: 'hidden',
  },
  container: {
    maxWidth: 580,
    width: '100%',
    padding: '40px 24px',
    position: 'relative',
  },
  logoBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  logo: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 15,
    fontWeight: 800,
    color: 'var(--sage-dark)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--sage-dark)',
    color: 'white',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    padding: '5px 14px',
    borderRadius: 99,
    fontWeight: 500,
  },
  introEyebrow: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: 'var(--sage)',
    marginBottom: 12,
  },
  introH1: {
    fontFamily: 'Instrument Serif, serif',
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: 400,
    lineHeight: 1.15,
    color: 'var(--soft-black)',
    marginBottom: 18,
  },
  introLead: {
    fontSize: 15,
    color: '#666',
    lineHeight: 1.7,
    marginBottom: 10,
    fontWeight: 300,
  },
  precisionBlock: {
    background: '#f3f8f3',
    border: '1px solid var(--sage-light)',
    borderRadius: 14,
    padding: '18px 20px',
    margin: '20px 0',
  },
  precisionP: {
    fontSize: 13,
    color: '#555',
    lineHeight: 1.7,
    marginBottom: 10,
  },
  timeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    background: 'white',
    border: '1.5px solid var(--border)',
    borderRadius: 99,
    padding: '7px 16px',
    fontSize: 12,
    color: '#888',
    margin: '14px 0 20px',
  },
  pillarsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  pillarChip: {
    background: 'white',
    border: '1.5px solid var(--border)',
    borderRadius: 99,
    padding: '5px 14px',
    fontSize: 12,
    color: 'var(--sage-dark)',
    fontWeight: 500,
  },
  btnPrimary: {
    width: '100%',
    padding: '14px 28px',
    background: 'var(--sage)',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'all 0.2s',
  },
  btnGhost: {
    padding: '13px 20px',
    background: 'transparent',
    color: '#888',
    border: '1.5px solid var(--border)',
    borderRadius: 12,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'all 0.2s',
  },
  progMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#aaa',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  progBar: {
    height: 4,
    background: '#e8e4de',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--sage), var(--gold))',
    borderRadius: 2,
    transition: 'width 0.5s ease',
  },
  dotRow: {
    display: 'flex',
    gap: 5,
    marginTop: 10,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    transition: 'all 0.3s',
  },
  qCard: {
    background: 'white',
    borderRadius: 20,
    padding: '32px 28px 26px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
    border: '1px solid rgba(122,158,126,0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  pillarTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#f3f8f3',
    border: '1px solid var(--sage-light)',
    borderRadius: 99,
    padding: '4px 13px',
    fontSize: 11,
    color: 'var(--sage-dark)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 500,
    marginBottom: 16,
  },
  pillarDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--sage)',
  },
  qNum: {
    fontSize: 11,
    color: '#ccc',
    marginBottom: 8,
    letterSpacing: 2,
  },
  qText: {
    fontFamily: 'Instrument Serif, serif',
    fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
    fontWeight: 400,
    lineHeight: 1.35,
    color: 'var(--charcoal)',
    marginBottom: 24,
  },
  optBtn: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 13,
    padding: '13px 16px',
    border: '1.5px solid',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
    width: '100%',
    fontFamily: 'DM Sans, sans-serif',
  },
  optLetter: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 500,
    transition: 'all 0.2s',
    marginTop: 1,
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  inputLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--charcoal)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 12,
    border: '1.5px solid #e8e4de',
    fontSize: 15,
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: 'white',
    color: 'var(--charcoal)',
  },
};
