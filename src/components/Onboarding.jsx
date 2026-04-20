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

// ─── ARCHETYPE ENGINE ─────────────────────────────────────
function deriveArchetype(s) {
  const isBurnedOut =
    s.drain.includes('sleep') ||
    s.drain.includes('mood') ||
    s.stressMgmt === 'none' ||
    s.stressMgmt === 'distract';
  const isNightOwl = s.chrono === 'wolf';
  const isEarlyRiser = s.chrono === 'lion';
  const isIrregular = s.chrono === 'dolphin';
  const isOptimiser = s.level === 'optimization';
  const isFoundation = s.level === 'foundation';
  const isTimeConstrained = s.movTime === 'minimal' || s.movTime === 'moderate';
  const isSedentary = s.activity === 'sedentary' || s.activity === 'light';
  const isEmotionalEater = s.nutBarrier === 'emotional';
  const isStressHead = s.stress === 'mental' || s.stress === 'emotional';
  const hasMoodGoal = s.goals.includes('mood');

  if (isBurnedOut && (isStressHead || s.stress === 'emotional')) return 'burnout';
  if (isNightOwl && isSedentary) return 'nightowl';
  if (isEarlyRiser && isOptimiser) return 'optimizer';
  if (isIrregular && isBurnedOut) return 'scattered';
  if (isEmotionalEater && hasMoodGoal) return 'nurturer';
  if (isTimeConstrained && isSedentary && isFoundation) return 'rebuilder';
  if (s.morning === 'slow' || s.morning === 'caffeine') return 'slowstarter';
  return 'steadybuilder';
}

const ARCHETYPES = {
  burnout:      { name: 'The Burnt-Out Rebuilder',   icon: '🌙', chrono: null },
  nightowl:     { name: 'The Night Bloom',            icon: '🌙', chrono: 'wolf' },
  optimizer:    { name: 'The Energised Optimizer',    icon: '⚡', chrono: 'lion' },
  scattered:    { name: 'The Scattered Spark',        icon: '🌀', chrono: 'dolphin' },
  nurturer:     { name: 'The Nourishment Seeker',     icon: '🌸', chrono: null },
  rebuilder:    { name: 'The Gentle Rebuilder',       icon: '🌱', chrono: null },
  slowstarter:  { name: 'The Slow-Start Bloomer',     icon: '☀️', chrono: null },
  steadybuilder:{ name: 'The Steady Builder',         icon: '🌿', chrono: 'bear' },
};

// Map archetype → closest springProgram chronotype
const ARCHETYPE_CHRONO = {
  burnout:       'bear',
  nightowl:      'wolf',
  optimizer:     'lion',
  scattered:     'dolphin',
  nurturer:      'bear',
  rebuilder:     'bear',
  slowstarter:   'bear',
  steadybuilder: 'bear',
};

// ─── COMPONENT ────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const [phase, setPhase] = useState('intro'); // intro | signin | quiz | gate | name
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(new Array(QUESTIONS.length).fill(null));
  const [collectedScores, setCollectedScores] = useState({});
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [avatarType, setAvatarType] = useState('pet');
  const [avatarName, setAvatarName] = useState('Fern');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Gate state
  const [gateCode, setGateCode] = useState('');
  const [gateError, setGateError] = useState('');
  const [gateLoading, setGateLoading] = useState(false);

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

    // Show gate after question 4 (index 3)
    if (current === 3) {
      setPhase('gate');
    } else if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
    } else {
      setPhase('name');
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

      // Derive archetype from collected scores
      const s = {
        chrono: (collectedScores.chrono || ['bear'])[0],
        level: (collectedScores.level || ['building'])[0],
        energy: (collectedScores.energy || ['midday'])[0],
        nutBarrier: (collectedScores.nutBarrier || ['time'])[0],
        movTime: (collectedScores.movTime || ['moderate'])[0],
        activity: (collectedScores.activity || ['light'])[0],
        stress: (collectedScores.stress || ['mental'])[0],
        stressMgmt: (collectedScores.stressMgmt || ['occasional'])[0],
        morning: (collectedScores.morning || ['gradual'])[0],
        goals: collectedScores.goal || ['energy'],
        drain: collectedScores.drain || [],
      };

      const archetypeKey = deriveArchetype(s);
      const archetype = ARCHETYPES[archetypeKey];
      const chronotype = ARCHETYPE_CHRONO[archetypeKey] || s.chrono;

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
          archetype_key: archetypeKey,
          archetype_name: archetype.name,
          archetype_icon: archetype.icon,
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
        archetypeKey,
        archetypeName: archetype.name,
        archetypeIcon: archetype.icon,
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
        content: `Just joined the Spring Wellness Program as ${archetype.icon} ${archetype.name}! Let's bloom 🌱`,
        post_type: 'milestone',
      });

      const habits = getHabitsForUser(chronotype, 1);
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
  async function handleGate(e) {
    e.preventDefault();
    if (!gateCode.trim()) return;
    setGateLoading(true);
    setGateError('');

    try {
      const code = gateCode.trim().toLowerCase();

      // Check if returning user
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('access_code', code)
        .single();

      if (existing) {
        // Returning user — load account and skip to dashboard
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', existing.id)
          .single();

        setUser({
          userId: existing.id,
          accessCode: existing.access_code,
          name: existing.name,
          avatarType: existing.avatar_type,
          avatarName: existing.avatar_name,
          avatarEmoji: existing.avatar_emoji,
          chronotype: existing.chronotype,
          lifestyleLevel: existing.lifestyle_level,
          archetypeKey: existing.archetype_key || null,
          archetypeName: existing.archetype_name || null,
          archetypeIcon: existing.archetype_icon || null,
          health: stats?.health ?? 78,
          coins: stats?.coins ?? 0,
          greenEnergy: stats?.green_energy ?? 0,
          level: stats?.level ?? 1,
        });
        const src = existing.archetype_key || existing.chronotype || 'steadybuilder';
        setHabits(getHabitsForUser(src, existing.current_week || 1));
        onComplete();
        return;
      }

      // New user — validate against access_codes table
      const { data: validCode } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code)
        .eq('redeemed', false)
        .single();

      if (!validCode) {
        setGateError('Invalid or already used access code. Check your purchase email.');
        setGateLoading(false);
        return;
      }

      // Valid — save code and continue quiz
      setAccessCode(code);
      setCurrent(4); // jump to question 5
      setPhase('quiz');
    } catch (err) {
      console.error(err);
      setGateError('Something went wrong. Please try again.');
    } finally {
      setGateLoading(false);
    }
  }

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
            <a href="https://jbeastudios.com" target="_blank" rel="noreferrer" style={{ color: 'var(--sage-dark)', textDecoration: 'none', fontWeight: 500 }}>
              Get access →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: GATE ─────────────────────────────────────────
  if (phase === 'gate') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoBar}>
            <span style={styles.logo}>well with j bea</span>
          </div>

          {/* Progress — frozen at q4 */}
          <div style={{ marginBottom: 28 }}>
            <div style={styles.progMeta}>
              <span>Question 4 of {QUESTIONS.length} complete</span>
              <span>30%</span>
            </div>
            <div style={styles.progBar}>
              <div style={{ ...styles.progFill, width: '30%' }} />
            </div>
          </div>

          {/* Teaser */}
          <div style={styles.qCard}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔮</div>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, fontWeight: 400, color: '#1a1a1a', marginBottom: 8 }}>
                Your archetype is taking shape
              </h2>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7 }}>
                9 more questions to reveal your full Wellness Archetype and personalised 4-week program. Enter your access code to continue.
              </p>
            </div>

            {/* What they get teaser */}
            <div style={{ background: '#f7f3ed', borderRadius: 14, padding: '16px 18px', marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 12 }}>What unlocks with access</div>
              {[
                '🌿 Your personal Wellness Archetype — one of 8 profiles',
                '📋 4-week program built around your biology',
                '⏱ Guided routines with step-by-step timer',
                '🔬 Peer-reviewed science behind every habit',
                '👥 Private Spring cohort community',
              ].map(item => (
                <div key={item} style={{ fontSize: 13, color: '#555', marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0 }}>{item.split(' ')[0]}</span>
                  <span>{item.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleGate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={styles.inputLabel}>Access code</label>
                <input
                  type="text"
                  value={gateCode}
                  onChange={e => setGateCode(e.target.value)}
                  placeholder="e.g. bloom-spring-007"
                  autoFocus
                  style={{ ...styles.input, textAlign: 'center', letterSpacing: '1px' }}
                  onFocus={e => e.target.style.borderColor = 'var(--sage)'}
                  onBlur={e => e.target.style.borderColor = '#e8e4de'}
                />
              </div>

              {gateError && (
                <div style={{ background: '#fdf0f0', border: '1px solid #e07070', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#c05050' }}>
                  {gateError}
                </div>
              )}

              <button
                type="submit"
                disabled={gateLoading || !gateCode.trim()}
                style={{ ...styles.btnPrimary, opacity: gateLoading || !gateCode.trim() ? 0.6 : 1, cursor: gateLoading || !gateCode.trim() ? 'not-allowed' : 'pointer' }}
              >
                {gateLoading ? 'Checking...' : 'Continue my quiz →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <a
                href="https://jbeastudios.com"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 13, color: 'var(--sage-dark)', fontWeight: 600, textDecoration: 'none' }}
              >
                Don&apos;t have a code? Get access for €10 →
              </a>
            </div>

            <button
              onClick={() => { setCurrent(3); setPhase('quiz'); }}
              style={{ background: 'transparent', border: 'none', color: '#bbb', fontSize: 12, cursor: 'pointer', marginTop: 12, width: '100%', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}
            >
              ← Back to quiz
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
