'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import {
  getWeekStartStr,
  getWeeklySleepSummary,
  getWeeklyNutritionSummary,
  getWeeklyHabitSummary,
  getWeeklyBadHabitSummary,
  saveWeeklyReflection,
  REFLECTION_DAY_OPTIONS,
} from '../lib/weeklyReflection';
import { supabase } from '../lib/supabase';

// ── Mini components ─────────────────────────────────────────────────────────

function PillarChip({ emoji, label, value, color = '#8aad8a', sub }) {
  return (
    <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 14, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ emoji, title, color = '#1a1a1a' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</span>
    </div>
  );
}

function BarRow({ label, pct, color = '#8aad8a' }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#555' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function PillTag({ label, color = '#5a7a5a', bg = '#f0f7f0', border = '#b5ceb5' }) {
  return (
    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 99, background: bg, border: `1px solid ${border}`, fontSize: 11, fontWeight: 600, color, marginRight: 6, marginBottom: 6 }}>
      {label}
    </span>
  );
}

function ReflPrompt({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', marginBottom: 6 }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e4de', borderRadius: 14, fontSize: 13, fontFamily: 'DM Sans, sans-serif', resize: 'vertical', outline: 'none', color: '#2a2a2a', lineHeight: 1.6, boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = '#8aad8a'}
        onBlur={e => e.target.style.borderColor = '#e8e4de'}
      />
    </div>
  );
}

// ── Reflection schedule setup (first-time) ────────────────────────────────────

function ScheduleSetup({ onDone }) {
  const [selected, setSelected] = useState(0);
  const userId = useStore(s => s.userId);

  async function confirm() {
    const opt = REFLECTION_DAY_OPTIONS[selected];
    if (userId) {
      await supabase.from('users').update({
        reflection_day: opt.day,
        reflection_time: opt.time,
        reflection_setup_done: true,
      }).eq('id', userId);
    }
    try {
      localStorage.setItem('bloom-reflection-schedule', JSON.stringify({ day: opt.day, time: opt.time }));
    } catch {}
    onDone();
  }

  return (
    <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
      <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, color: '#1a1a1a', marginBottom: 8 }}>
        Your weekly reflection
      </h2>
      <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
        Once a week, Bloom will pull together your sleep, nutrition, habits, and more into a personal insight summary. When works best for you?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {REFLECTION_DAY_OPTIONS.map((opt, i) => (
          <button
            key={opt.label}
            onClick={() => setSelected(i)}
            style={{
              padding: '13px 20px', borderRadius: 14, border: `2px solid ${selected === i ? '#8aad8a' : '#e8e4de'}`,
              background: selected === i ? '#f3f8f3' : 'white', cursor: 'pointer', fontSize: 14,
              fontWeight: selected === i ? 600 : 400, color: selected === i ? '#3a6a3a' : '#555',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        onClick={confirm}
        style={{ width: '100%', padding: 14, background: '#1a2e1a', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
      >
        Set my reflection day →
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function WeeklyReflectionModal({ onClose, onSaved, showScheduleSetup = false, manualStats = {} }) {
  const userId       = useStore(s => s.userId);
  const habits       = useStore(s => s.habits);
  const customHabits = useStore(s => s.customHabits);
  const badHabits    = useStore(s => s.badHabits);

  const [phase, setPhase] = useState(showScheduleSetup ? 'setup' : 'loading');
  const [data, setData]   = useState(null);
  const [weekStart, setWeekStart] = useState('');

  // Reflection answers
  const [whatWorked, setWhatWorked]           = useState('');
  const [whatChallenging, setWhatChallenging] = useState('');
  const [intention, setIntention]             = useState('');
  const [energyRating, setEnergyRating]       = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (phase !== 'loading') return;
    loadData();
  }, [phase]);

  async function loadData() {
    const ws = getWeekStartStr();
    setWeekStart(ws);

    const allHabits = [...habits, ...customHabits];

    // ── Habit completions from habit_completions table (correct table + key) ──
    let habitLogs = [];
    if (userId) {
      try {
        const weekEnd = new Date(ws);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        const { data: completions } = await supabase
          .from('habit_completions')
          .select('habit_key, date')
          .eq('user_id', userId)
          .gte('date', ws)
          .lt('date', weekEndStr);

        if (completions?.length) {
          // Build scheduled logs: one entry per habit per scheduled day, mark completed if found
          const completedKeys = new Set(completions.map(c => c.habit_key));
          // Each habit appears ~7 times (once per day) — mark completed ones
          habitLogs = allHabits.flatMap(h => {
            const completedCount = completions.filter(c => c.habit_key === h.key).length;
            // Generate 7 log entries per habit (one per day), mark first N as completed
            return Array.from({ length: 7 }, (_, i) => ({
              habit_key: h.key,
              category: h.category,
              completed: i < completedCount,
            }));
          });
        }
      } catch {}
    }

    // Fallback if no completions yet — show all as scheduled but not completed
    if (!habitLogs.length) {
      habitLogs = allHabits.flatMap(h =>
        Array.from({ length: 7 }, () => ({ habit_key: h.key, category: h.category, completed: false }))
      );
    }

    // ── Read week's manual stats from localStorage (water, mindfulness, movement) ──
    // bloom-daily-stats stores today only; collect all days in the week
    const weeklyManualStats = readWeeklyManualStats(ws);

    const [sleepData, nutritionData] = await Promise.all([
      getWeeklySleepSummary(userId, ws),
      Promise.resolve(getWeeklyNutritionSummary(ws)),
    ]);

    const habitData    = getWeeklyHabitSummary(habitLogs);
    const badHabitData = getWeeklyBadHabitSummary(badHabits, ws);

    setData({
      weekStart: ws,
      sleep: sleepData,
      habits: habitData,
      nutrition: nutritionData,
      badHabits: badHabitData,
      manualStats: weeklyManualStats,
    });
    setPhase('summary');
  }

  // Read all logged daily stats for the week from localStorage
  // bloom-daily-stats only stores one day, but bloom-daily-stats-log stores history
  function readWeeklyManualStats(ws) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    let totalWater = 0, totalMindfulness = 0, totalMovement = 0;
    let daysWithWater = 0, daysWithMindfulness = 0, daysWithMovement = 0;

    // Check bloom-daily-stats-log (keyed by date) first
    try {
      const log = JSON.parse(localStorage.getItem('bloom-daily-stats-log') || '{}');
      for (const day of days) {
        const d = log[day];
        if (!d) continue;
        if (d.water)       { totalWater       += Number(d.water);       daysWithWater++;       }
        if (d.mindfulness) { totalMindfulness += Number(d.mindfulness); daysWithMindfulness++; }
        if (d.movement)    { totalMovement    += Number(d.movement);    daysWithMovement++;    }
      }
    } catch {}

    // Also read bloom-daily-stats directly (today only, single-day store)
    // This is the primary source before bloom-daily-stats-log builds up history
    const today = new Date().toISOString().split('T')[0];
    if (days.includes(today)) {
      try {
        const todayRaw = JSON.parse(localStorage.getItem('bloom-daily-stats') || '{}');
        // Only use if it's actually today's data
        if (todayRaw.date === today) {
          if (Number(todayRaw.water)       > 0 && daysWithWater       === 0) { totalWater       += Number(todayRaw.water);       daysWithWater++;       }
          if (Number(todayRaw.mindfulness) > 0 && daysWithMindfulness === 0) { totalMindfulness += Number(todayRaw.mindfulness); daysWithMindfulness++; }
          if (Number(todayRaw.movement)    > 0 && daysWithMovement    === 0) { totalMovement    += Number(todayRaw.movement);    daysWithMovement++;    }
        }
      } catch {}
      // Also merge manualStats prop as final fallback
      if (manualStats.water       && Number(manualStats.water)       > 0 && daysWithWater       === 0) { totalWater       += Number(manualStats.water);       daysWithWater++;       }
      if (manualStats.mindfulness && Number(manualStats.mindfulness) > 0 && daysWithMindfulness === 0) { totalMindfulness += Number(manualStats.mindfulness); daysWithMindfulness++; }
      if (manualStats.movement    && Number(manualStats.movement)    > 0 && daysWithMovement    === 0) { totalMovement    += Number(manualStats.movement);    daysWithMovement++;    }
    }

    return {
      avgWaterL:       daysWithWater       ? Math.round((totalWater       / daysWithWater)       * 10) / 10 : null,
      avgMindfulMin:   daysWithMindfulness ? Math.round(totalMindfulness  / daysWithMindfulness)           : null,
      avgMovementMin:  daysWithMovement    ? Math.round(totalMovement     / daysWithMovement)              : null,
      daysWithWater,
      daysWithMindfulness,
      daysWithMovement,
      // Pct of days hitting targets (2.5L water, 10min mindful, 15min movement)
      waterTargetPct:       daysWithWater       ? Math.round((Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws); d.setDate(d.getDate() + i);
        try {
          const log = JSON.parse(localStorage.getItem('bloom-daily-stats-log') || '{}');
          return (log[d.toISOString().split('T')[0]]?.water || 0) >= 2.5 ? 1 : 0;
        } catch { return 0; }
      }).reduce((a, b) => a + b, 0) / 7) * 100) : 0,
      mindfulTargetPct: daysWithMindfulness ? Math.round((Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws); d.setDate(d.getDate() + i);
        try {
          const log = JSON.parse(localStorage.getItem('bloom-daily-stats-log') || '{}');
          return (log[d.toISOString().split('T')[0]]?.mindfulness || 0) >= 10 ? 1 : 0;
        } catch { return 0; }
      }).reduce((a, b) => a + b, 0) / 7) * 100) : 0,
      movementTargetPct: daysWithMovement ? Math.round((Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws); d.setDate(d.getDate() + i);
        try {
          const log = JSON.parse(localStorage.getItem('bloom-daily-stats-log') || '{}');
          return (log[d.toISOString().split('T')[0]]?.movement || 0) >= 15 ? 1 : 0;
        } catch { return 0; }
      }).reduce((a, b) => a + b, 0) / 7) * 100) : 0,
    };
  }

  async function submit() {
    setSaving(true);
    await saveWeeklyReflection(userId, weekStart, data, { whatWorked, whatChallenging, intention, energyRating });
    try { localStorage.setItem('bloom-last-reflection-week', weekStart); } catch {}
    setSaving(false);
    onSaved?.();
    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16, overflowY: 'auto' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#faf9f6', borderRadius: 28, padding: 28, width: 580, maxWidth: '97vw', maxHeight: '92vh', overflowY: 'auto', position: 'relative' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 20, right: 20, width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: 15, color: '#888' }}
        >✕</button>

        {/* ── Schedule setup ──────────────────────────────────────── */}
        {phase === 'setup' && (
          <ScheduleSetup onDone={() => setPhase('loading')} />
        )}

        {/* ── Loading ─────────────────────────────────────────────── */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌿</div>
            <div style={{ fontSize: 14 }}>Pulling together your week…</div>
          </div>
        )}

        {/* ── Summary + reflection ─────────────────────────────────── */}
        {phase === 'summary' && data && (
          <>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, color: '#1a1a1a', margin: '0 0 4px' }}>
                Your week in review ✨
              </h2>
              <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>
                Week of {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              </p>
            </div>

            {/* ── 1. Sleep ────────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <SectionHeader emoji="😴" title="Sleep" color="#8a7a9e" />
              {data.sleep.daysLogged === 0 ? (
                <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>No sleep logs this week — tap the sleep card on home to start tracking.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                    <PillarChip emoji="⭐" label="Avg quality" value={`${data.sleep.avgQuality}/10`} color="#8a7a9e" />
                    <PillarChip
                      emoji="📐"
                      label="Consistency"
                      value={data.sleep.consistencyMin !== null ? (data.sleep.consistencyMin <= 15 ? '✓ Consistent' : `±${data.sleep.consistencyMin}m`) : '—'}
                      color={data.sleep.consistencyMin <= 20 ? '#8aad8a' : '#c47a5a'}
                    />
                    <PillarChip
                      emoji={data.sleep.trend === 'improving' ? '↑' : data.sleep.trend === 'declining' ? '↓' : '→'}
                      label="Trend"
                      value={data.sleep.trend || '—'}
                      color={data.sleep.trend === 'improving' ? '#8aad8a' : data.sleep.trend === 'declining' ? '#c47a5a' : '#888'}
                    />
                  </div>
                  {data.sleep.avgBedtimeLabel && (
                    <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 16 }}>
                      <span>🌙 Avg bedtime: <strong>{data.sleep.avgBedtimeLabel}</strong></span>
                      <span>☀️ Avg wake: <strong>{data.sleep.avgWakeLabel}</strong></span>
                      <span>📅 {data.sleep.daysLogged} days logged</span>
                    </div>
                  )}
                  {data.sleep.consistencyMin > 30 && (
                    <div style={{ marginTop: 12, background: '#fdf8ed', border: '1px solid #e8c882', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#7a6040' }}>
                      💡 Your bedtime varied by ±{data.sleep.consistencyMin} minutes — consistency in sleep and wake times is the biggest driver of sleep quality over time.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── 2. Nutrition ─────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <SectionHeader emoji="🥗" title="Nutrition" color="#c4880a" />
              {!data.nutrition.anyData ? (
                <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>No Nourish logs this week.</div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                    Meals logged {data.nutrition.daysLogged}/7 days
                  </div>
                  {data.nutrition.topNutrients.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#5a7a5a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>Well covered</div>
                      <div>
                        {data.nutrition.topNutrients.map(n => (
                          <PillTag key={n.key} label={`${n.label} ${n.avgPct}%`} color="#5a7a5a" bg="#f0f7f0" border="#b5ceb5" />
                        ))}
                      </div>
                    </div>
                  )}
                  {data.nutrition.sparseNutrients.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: '#c4880a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>Biggest opportunity</div>
                      <div>
                        {data.nutrition.sparseNutrients.map(n => (
                          <PillTag key={n.key} label={`${n.label} ${n.avgPct}%`} color="#7a5a0a" bg="#fdf8ed" border="#d4af6a" />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── 3. Movement ──────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <SectionHeader emoji="🏃" title="Movement" color="#c4880a" />
              {data.manualStats.avgMovementMin === null ? (
                <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>No movement logged this week — tap the movement card on home to start tracking.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                    <PillarChip emoji="⏱" label="Avg / day" value={`${data.manualStats.avgMovementMin} min`} color="#c4880a" />
                    <PillarChip
                      emoji="🎯"
                      label="Days hitting 15min"
                      value={`${data.manualStats.daysWithMovement}/7`}
                      color={data.manualStats.daysWithMovement >= 5 ? '#8aad8a' : '#c47a5a'}
                    />
                  </div>
                  <BarRow label="Movement habits this week" pct={data.habits.movementPct} color="#c4a882" />
                </>
              )}
            </div>

            {/* ── 4. Mindfulness ───────────────────────────────────── */}
            <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <SectionHeader emoji="🧘" title="Mindfulness" color="#8a7a9e" />
              {data.manualStats.avgMindfulMin === null ? (
                <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>No mindfulness logged this week — tap the mindfulness card on home to start tracking.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                    <PillarChip emoji="⏱" label="Avg / day" value={`${data.manualStats.avgMindfulMin} min`} color="#8a7a9e" />
                    <PillarChip
                      emoji="🎯"
                      label="Days hitting 10min"
                      value={`${data.manualStats.daysWithMindfulness}/7`}
                      color={data.manualStats.daysWithMindfulness >= 5 ? '#8aad8a' : '#c47a5a'}
                    />
                  </div>
                  <BarRow label="Mindfulness habits this week" pct={data.habits.mindfulnessPct} color="#8a7a9e" />
                </>
              )}
            </div>

            {/* ── 5. Hydration ─────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <SectionHeader emoji="💧" title="Hydration" color="#6a9ab0" />
              {data.manualStats.avgWaterL === null ? (
                <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>No hydration logged this week — tap the hydration card on home to start tracking.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <PillarChip emoji="🫙" label="Avg / day" value={`${data.manualStats.avgWaterL}L`} color="#6a9ab0" />
                  <PillarChip
                    emoji="🎯"
                    label="Days hitting 2.5L"
                    value={`${data.manualStats.daysWithWater}/7`}
                    color={data.manualStats.daysWithWater >= 5 ? '#8aad8a' : '#c47a5a'}
                  />
                </div>
              )}
            </div>

            {/* ── 6. Habits overview ───────────────────────────────── */}
            <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <SectionHeader emoji="✅" title="Habits" color="#3a6a3a" />
              <div style={{ marginBottom: 8 }}>
                <BarRow label="All habits" pct={data.habits.pct} color="#8aad8a" />
                <BarRow label="Movement"        pct={data.habits.movementPct}      color="#c4a882" />
                <BarRow label="Mindfulness"     pct={data.habits.mindfulnessPct}   color="#8a7a9e" />
                <BarRow label="Sleep habits"    pct={data.habits.sleepHabitPct}    color="#6a9ab0" />
                <BarRow label="Nutrition habits" pct={data.habits.nutritionHabitPct} color="#c4880a" />
              </div>
              {data.habits.pct >= 80 && (
                <div style={{ fontSize: 12, color: '#5a7a5a', fontWeight: 600 }}>🌟 Strong week — consistency is compounding.</div>
              )}
              {data.habits.pct < 50 && data.habits.pct > 0 && (
                <div style={{ fontSize: 12, color: '#c47a5a' }}>💛 A lighter week is fine — see what pattern comes up in your reflection below.</div>
              )}
            </div>

            {/* ── 4. Bad habits ─────────────────────────────────────── */}
            {badHabits.length > 0 && (
              <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 20, marginBottom: 16 }}>
                <SectionHeader emoji="⚠️" title="Habits to reduce" color="#a05040" />
                {data.badHabits.totalViolations === 0 ? (
                  <div style={{ fontSize: 13, color: '#8aad8a', fontWeight: 600 }}>✓ No violations logged this week — well done.</div>
                ) : (
                  <>
                    {data.badHabits.violations.map(v => (
                      <div key={v.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
                        <span style={{ fontSize: 13, color: '#555' }}>{v.emoji} {v.name}</span>
                        <span style={{ fontSize: 12, color: '#c47a5a', fontWeight: 600 }}>{v.count}× this week</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 10 }}>
                      Total health impact: −{data.badHabits.totalHealthLost} ❤️
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Reflection prompts ────────────────────────────────── */}
            <div style={{ background: 'white', border: '1.5px solid #b5ceb5', borderRadius: 20, padding: 20, marginBottom: 20 }}>
              <SectionHeader emoji="💭" title="Reflect" color="#3a6a3a" />
              <ReflPrompt
                label="What supported your wellbeing this week?"
                value={whatWorked}
                onChange={setWhatWorked}
                placeholder="A habit that clicked, something that helped you rest, a small win…"
              />
              <ReflPrompt
                label="What got in the way?"
                value={whatChallenging}
                onChange={setWhatChallenging}
                placeholder="Busy schedule, low energy, skipping meals…"
              />
              <ReflPrompt
                label="One thing to focus on next week"
                value={intention}
                onChange={setIntention}
                placeholder="I want to prioritise…"
              />

              {/* Energy rating */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', marginBottom: 10 }}>
                Overall energy this week
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
                {[
                  { n: 1, label: 'Low' },
                  { n: 2, label: 'Fair' },
                  { n: 3, label: 'OK' },
                  { n: 4, label: 'Good' },
                  { n: 5, label: 'High' },
                ].map(({ n, label }) => (
                  <button
                    key={n}
                    onClick={() => setEnergyRating(n)}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 12, border: `2px solid ${energyRating === n ? '#8aad8a' : '#e8e4de'}`,
                      background: energyRating === n ? '#f3f8f3' : 'white', cursor: 'pointer',
                      fontSize: 11, fontWeight: energyRating === n ? 700 : 400,
                      color: energyRating === n ? '#3a6a3a' : '#aaa', fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {n}<br /><span style={{ fontSize: 9 }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={submit}
              disabled={saving}
              style={{ width: '100%', padding: 15, background: saving ? '#ccc' : '#1a2e1a', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              {saving ? 'Saving…' : 'Save reflection ✨'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
