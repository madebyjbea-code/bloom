'use client';

// ─────────────────────────────────────────────────────────────────────────────
// EnergyModeModal.jsx
//
// Three sub-modals, shown in order:
//   1. SetupModal   — first-ever open after update: organise existing habits or skip
//   2. DailyPrompt  — each new calendar day: pick Low / Normal / High
//   3. ModeEditor   — accessible any time from habits tab: edit each mode's stack
//
// Usage in Dashboard.jsx:
//   import EnergyModeModal from './EnergyModeModal';
//   <EnergyModeModal habits={allHabits} archetypeKey={archetypeKey} />
//
// The component manages its own open/close state by reading from the store.
// No props needed beyond habits + archetypeKey.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';

// ─── ARCHETYPE HIGH-MODE SUGGESTIONS ─────────────────────────────────────────
// 5–6 science-backed suggestions per archetype for the High energy mode bonus slot.
// These are ADDITIONAL habits not in the main stack — things to try when thriving.

const ARCHETYPE_SUGGESTIONS = {
  burnout: [
    { key: 'sugg_burnout_cold',      name: 'Cold shower (30 sec)',           emoji: '🚿', category: 'wellness', coins: 20, ge: 0, time: '07:15', isQuit: false, isCustom: false, why: 'Norepinephrine boost — builds resilience gradually without overload.' },
    { key: 'sugg_burnout_journalpm', name: 'Evening journal (5 min)',        emoji: '📓', category: 'mindfulness', coins: 15, ge: 0, time: '21:00', isQuit: false, isCustom: false, why: 'Cognitive offloading before sleep reduces cortisol and rumination.' },
    { key: 'sugg_burnout_stretch',   name: 'Full-body stretch (10 min)',     emoji: '🧘', category: 'movement', coins: 15, ge: 0, time: '08:00', isQuit: false, isCustom: false, why: 'Gentle movement activates the parasympathetic system post-burnout.' },
    { key: 'sugg_burnout_sunlight',  name: 'Midday sunlight (10 min)',       emoji: '☀️', category: 'wellness', coins: 15, ge: 0, time: '12:30', isQuit: false, isCustom: false, why: 'Second light dose anchors the circadian afternoon energy peak.' },
    { key: 'sugg_burnout_noalcohol', name: 'Alcohol-free day',               emoji: '🚫', category: 'wellness', coins: 25, ge: 0, time: '', isQuit: true, isCustom: false, why: 'Alcohol disrupts REM recovery — critical for burnout repair.' },
    { key: 'sugg_burnout_nap',       name: 'NSDR nap (20 min)',              emoji: '😴', category: 'mindfulness', coins: 20, ge: 0, time: '13:00', isQuit: false, isCustom: false, why: 'Non-sleep deep rest restores dopamine without full sleep inertia.' },
  ],
  nightowl: [
    { key: 'sugg_nightowl_wakefix',  name: 'Same wake time (no alarm)',      emoji: '⏰', category: 'sleep', coins: 30, ge: 0, time: '08:00', isQuit: false, isCustom: false, why: 'Anchoring wake time is the single most powerful circadian lever for wolves.' },
    { key: 'sugg_nightowl_cold',     name: 'Cold shower (30 sec)',           emoji: '🚿', category: 'wellness', coins: 20, ge: 0, time: '08:30', isQuit: false, isCustom: false, why: 'Cold exposure phase-advances the wolf chronotype\'s cortisol peak.' },
    { key: 'sugg_nightowl_strength', name: 'Strength training (evening)',    emoji: '🏋️', category: 'movement', coins: 50, ge: 0, time: '18:00', isQuit: false, isCustom: false, why: 'Wolves\' testosterone and reaction time peak in the late afternoon–evening window.' },
    { key: 'sugg_nightowl_magnesium',name: 'Magnesium glycinate before bed',emoji: '💊', category: 'wellness', coins: 15, ge: 0, time: '21:30', isQuit: false, isCustom: false, why: 'Magnesium activates GABA receptors — directly improves sleep onset for night types.' },
    { key: 'sugg_nightowl_noscreen', name: 'No screens after 10 PM',        emoji: '📵', category: 'sleep', coins: 20, ge: 0, time: '22:00', isQuit: true, isCustom: false, why: 'Blue-light suppresses melatonin — extra important for already-late chronotypes.' },
    { key: 'sugg_nightowl_breatham', name: 'Breathwork on waking (5 min)',   emoji: '🫁', category: 'mindfulness', coins: 15, ge: 0, time: '08:15', isQuit: false, isCustom: false, why: 'Cyclic sighing accelerates morning cortisol rise — helps wolves feel alert sooner.' },
  ],
  optimizer: [
    { key: 'sugg_optimizer_sauna',   name: 'Sauna or heat exposure (15 min)',emoji: '🔥', category: 'wellness', coins: 30, ge: 0, time: '17:00', isQuit: false, isCustom: false, why: 'Heat shock proteins improve cardiovascular health and recovery.' },
    { key: 'sugg_optimizer_vo2',     name: 'Zone 2 cardio (45 min)',         emoji: '🚴', category: 'movement', coins: 55, ge: 10, time: '07:00', isQuit: false, isCustom: false, why: 'Zone 2 training is the most efficient VO₂max builder for busy optimizers.' },
    { key: 'sugg_optimizer_journal', name: 'Morning pages (10 min)',         emoji: '📓', category: 'mindfulness', coins: 15, ge: 0, time: '06:00', isQuit: false, isCustom: false, why: 'Cognitive offloading before the workday preserves working memory capacity.' },
    { key: 'sugg_optimizer_plants',  name: '30-plant week tracker (1 today)',emoji: '🌿', category: 'nutrition', coins: 20, ge: 20, time: '', isQuit: false, isCustom: false, why: 'Diversity of plant polyphenols directly predicts microbiome richness.' },
    { key: 'sugg_optimizer_nofeed',  name: 'No social media before noon',   emoji: '🚫', category: 'mindfulness', coins: 20, ge: 0, time: '09:00', isQuit: true, isCustom: false, why: 'Protecting the morning cortisol peak from dopamine hijacking improves focus for 4–5 hours.' },
    { key: 'sugg_optimizer_omega3',  name: 'Omega-3 supplement today',      emoji: '🐟', category: 'nutrition', coins: 10, ge: 0, time: '08:00', isQuit: false, isCustom: false, why: 'DHA supports neuroplasticity — directly relevant for performance optimization.' },
  ],
  scattered: [
    { key: 'sugg_scattered_timer',   name: '25-min focus block (Pomodoro)', emoji: '⏱', category: 'mindfulness', coins: 25, ge: 0, time: '10:00', isQuit: false, isCustom: false, why: 'Time-boxing is the highest-ROI intervention for dolphin/scattered attention profiles.' },
    { key: 'sugg_scattered_body',    name: 'Body scan before sleep (8 min)',emoji: '🧘', category: 'mindfulness', coins: 20, ge: 0, time: '22:30', isQuit: false, isCustom: false, why: 'Dolphins have elevated night cortisol — body scans reduce the stress arousal baseline.' },
    { key: 'sugg_scattered_caffeine',name: 'No caffeine after 1 PM',       emoji: '☕', category: 'wellness', coins: 20, ge: 0, time: '13:00', isQuit: true, isCustom: false, why: 'Caffeine\'s 6-hr half-life hits light sleepers hardest. Cutting off at 13:00 restores deep sleep.' },
    { key: 'sugg_scattered_walk',    name: 'Walking meeting or lunch walk',  emoji: '🚶', category: 'movement', coins: 20, ge: 8, time: '12:30', isQuit: false, isCustom: false, why: 'Movement-linked memory consolidation particularly benefits ADHD-adjacent profiles.' },
    { key: 'sugg_scattered_protein', name: 'Protein + fat at every meal',   emoji: '🥩', category: 'nutrition', coins: 20, ge: 0, time: '', isQuit: false, isCustom: false, why: 'Stabilising blood sugar prevents the energy crashes that scatter focus mid-afternoon.' },
    { key: 'sugg_scattered_digital', name: 'Digital sunset 90 min before bed',emoji: '📵', category: 'sleep', coins: 20, ge: 0, time: '21:00', isQuit: true, isCustom: false, why: 'Dolphin chronotypes are the most sensitive to light-driven melatonin suppression.' },
  ],
  nurturer: [
    { key: 'sugg_nurturer_ferment',  name: 'Fermented food (kefir/kimchi)', emoji: '🫙', category: 'nutrition', coins: 20, ge: 8, time: '', isQuit: false, isCustom: false, why: 'Fermented foods raise microbiome diversity faster than fibre alone (Sonnenburg 2021).' },
    { key: 'sugg_nurturer_walk',     name: 'Solo walk without podcast (20 min)',emoji: '🚶', category: 'movement', coins: 25, ge: 8, time: '08:30', isQuit: false, isCustom: false, why: 'Undirected attention walks reduce emotional overload unique to nurturer profiles.' },
    { key: 'sugg_nurturer_boundary', name: 'Set one boundary today',        emoji: '🛡', category: 'mindfulness', coins: 20, ge: 0, time: '', isQuit: false, isCustom: false, why: 'Nurturers commonly deplete cortisol through over-giving — boundary practice is restorative.' },
    { key: 'sugg_nurturer_nosugar',  name: 'No added sugar today',          emoji: '🚫', category: 'nutrition', coins: 30, ge: 0, time: '', isQuit: true, isCustom: false, why: 'Gut-brain axis sensitivity in nurturer profiles means sugar directly dysregulates mood.' },
    { key: 'sugg_nurturer_herbs',    name: 'Herbal tea ritual (evening)',   emoji: '🍵', category: 'wellness', coins: 10, ge: 5, time: '20:00', isQuit: false, isCustom: false, why: 'Chamomile / lemon balm activate GABA-A receptors — clinically reduces anxiety (Hieu 2019).' },
    { key: 'sugg_nurturer_strength', name: 'Resistance training (30 min)', emoji: '🏋️', category: 'movement', coins: 45, ge: 0, time: '10:00', isQuit: false, isCustom: false, why: 'Strength training is consistently underdone by nurturer profiles but is highest-ROI for metabolic health.' },
  ],
  rebuilder: [
    { key: 'sugg_rebuilder_sun',     name: 'Morning sunlight (15 min)',     emoji: '☀️', category: 'wellness', coins: 20, ge: 0, time: '08:00', isQuit: false, isCustom: false, why: 'Light anchors cortisol rhythm — the foundation of rebuilding energy architecture.' },
    { key: 'sugg_rebuilder_protein', name: '25g protein at breakfast',      emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '08:00', isQuit: false, isCustom: false, why: 'Protein at breakfast reduces hunger hormones for 6+ hours — supports gentle caloric management.' },
    { key: 'sugg_rebuilder_stretch', name: 'Stretch + mobility (10 min)',   emoji: '🧘', category: 'movement', coins: 15, ge: 0, time: '07:30', isQuit: false, isCustom: false, why: 'Low-intensity movement restores nervous system tone without triggering fatigue.' },
    { key: 'sugg_rebuilder_gratitude',name: 'Gratitude log (3 things)',    emoji: '📖', category: 'mindfulness', coins: 15, ge: 0, time: '21:00', isQuit: false, isCustom: false, why: 'Consistent gratitude practice raises subjective wellbeing baseline within 2 weeks (Emmons 2003).' },
    { key: 'sugg_rebuilder_noalc',   name: 'Alcohol-free day',             emoji: '🚫', category: 'wellness', coins: 25, ge: 0, time: '', isQuit: true, isCustom: false, why: 'Even one drink fragments sleep architecture — critical to avoid during rebuilding phases.' },
    { key: 'sugg_rebuilder_steps',   name: '7,000 steps today',            emoji: '👟', category: 'movement', coins: 30, ge: 10, time: '', isQuit: false, isCustom: false, why: 'Step count is the most accessible and evidenced marker of all-cause mortality reduction.' },
  ],
  slowstarter: [
    { key: 'sugg_slow_magnesium',    name: 'Magnesium glycinate at night',  emoji: '💊', category: 'wellness', coins: 15, ge: 0, time: '21:30', isQuit: false, isCustom: false, why: 'Magnesium deficiency directly impairs slow cortisol ramp in morning-sluggish profiles.' },
    { key: 'sugg_slow_nosnooze',     name: 'No snooze button today',        emoji: '⏰', category: 'sleep', coins: 25, ge: 0, time: '07:30', isQuit: true, isCustom: false, why: 'Fragmented waking disrupts sleep inertia clearance — even 9 min matters.' },
    { key: 'sugg_slow_protein',      name: '30g protein at first meal',     emoji: '🥚', category: 'nutrition', coins: 25, ge: 0, time: '09:00', isQuit: false, isCustom: false, why: 'High-protein first meal accelerates the cortisol rise in slow-start chronotypes.' },
    { key: 'sugg_slow_yoga',         name: 'Yin yoga or slow flow (20 min)',emoji: '🧘', category: 'movement', coins: 25, ge: 0, time: '10:00', isQuit: false, isCustom: false, why: 'Slow-start profiles recover best with parasympathetic movement, not intensity.' },
    { key: 'sugg_slow_journal',      name: 'Journaling at your peak (noon)',emoji: '📓', category: 'mindfulness', coins: 15, ge: 0, time: '12:00', isQuit: false, isCustom: false, why: 'Journaling at cognitive peak time maximises insight quality for this chronotype.' },
    { key: 'sugg_slow_plant',        name: 'Plant-rich lunch today',        emoji: '🌱', category: 'nutrition', coins: 20, ge: 15, time: '12:30', isQuit: false, isCustom: false, why: 'Plant polyphenols improve mitochondrial efficiency — helps the slow-start afternoon energy.' },
  ],
  steadybuilder: [
    { key: 'sugg_steady_cold',       name: 'Cold shower (30–60 sec)',       emoji: '🚿', category: 'wellness', coins: 20, ge: 0, time: '07:15', isQuit: false, isCustom: false, why: 'Norepinephrine release (200–300%) builds the alertness foundation bears need.' },
    { key: 'sugg_steady_zone2',      name: 'Zone 2 cardio (30 min)',        emoji: '🚴', category: 'movement', coins: 45, ge: 10, time: '09:00', isQuit: false, isCustom: false, why: 'Zone 2 is the most efficient aerobic base builder and VO₂max contributor.' },
    { key: 'sugg_steady_omega3',     name: 'Omega-3 supplement',            emoji: '🐟', category: 'nutrition', coins: 10, ge: 0, time: '08:00', isQuit: false, isCustom: false, why: 'DHA supplementation improves cognitive performance and reduces inflammatory markers.' },
    { key: 'sugg_steady_journal',    name: 'Evening reflection (5 min)',    emoji: '📓', category: 'mindfulness', coins: 15, ge: 0, time: '21:00', isQuit: false, isCustom: false, why: 'Bears consolidate gains better with consistent reflection rituals.' },
    { key: 'sugg_steady_nosugar',    name: 'No added sugar today',          emoji: '🚫', category: 'nutrition', coins: 30, ge: 0, time: '', isQuit: true, isCustom: false, why: 'Bears are metabolically the most sugar-sensitive chronotype — insulin sensitivity is the lever.' },
    { key: 'sugg_steady_sauna',      name: 'Sauna or heat therapy (15 min)',emoji: '🔥', category: 'wellness', coins: 30, ge: 0, time: '17:00', isQuit: false, isCustom: false, why: 'Sauna 4x/week reduces all-cause mortality by 40% (Laukkanen 2018). High ROI for bears.' },
  ],
};

// ─── ALGORITHM — assign habits to energy modes ───────────────────────────────
// Low  = sleep + foundational wellness (max 3)
// Normal = all habits
// High = all habits (keys seeded, user picks one bonus from suggestions)

const LOW_PRIORITY_CATEGORIES = ['sleep', 'wellness'];
const ALWAYS_LOW_KEYS = [
  'water_on_wake','water_first','water_morning','electrolyte_wake',
  'phone_off_930','blue_light_off','fixed_wake','wake_7','sleep_7hrs',
  'sleep_floor','protein_breakfast','protein_breakfast_delay',
];

function assignHabitsToModes(habits) {
  const allKeys = habits.map(h => h.key);

  // Low: sleep/wellness habits first, then fill to 3 max with most essential
  const lowCandidates = habits.filter(h =>
    ALWAYS_LOW_KEYS.includes(h.key) ||
    LOW_PRIORITY_CATEGORIES.includes(h.category)
  );

  // Sort: always-low keys first, then by category priority
  lowCandidates.sort((a, b) => {
    const aAlways = ALWAYS_LOW_KEYS.includes(a.key) ? 0 : 1;
    const bAlways = ALWAYS_LOW_KEYS.includes(b.key) ? 0 : 1;
    return aAlways - bAlways;
  });

  const lowKeys = lowCandidates.slice(0, 3).map(h => h.key);

  // Normal: all habits
  const normalKeys = [...allKeys];

  // High: all habits (user adds one bonus suggestion on top each day)
  const highKeys = [...allKeys];

  return { low: lowKeys, normal: normalKeys, high: highKeys };
}

// ─── COLOURS ─────────────────────────────────────────────────────────────────
const MODE_CONFIG = {
  low:    { label: 'Low Energy',    emoji: '🌙', color: '#8a7a9e', bg: '#f3f0f8', border: '#c4b0e0', description: 'Your essential stack only — rest, hydrate, anchor.' },
  normal: { label: 'Normal',        emoji: '🌿', color: '#5a7a5a', bg: '#f0f7f0', border: '#8aad8a', description: 'Your full routine. Steady and consistent.' },
  high:   { label: 'High Energy',   emoji: '⚡', color: '#c4880a', bg: '#fdf8ed', border: '#d4af6a', description: 'Full stack plus one new habit to try today.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT 1: First-time setup modal
// ─────────────────────────────────────────────────────────────────────────────
function SetupModal({ habits, onOrganise, onSkip }) {
  const [step, setStep] = useState('intro'); // 'intro' | 'preview'
  const [preview, setPreview] = useState(null);

  function handleOrganise() {
    const stacks = assignHabitsToModes(habits);
    setPreview(stacks);
    setStep('preview');
  }

  if (step === 'intro') return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.pill}>✨ New feature</div>
        <div style={styles.title}>Energy Mode</div>
        <p style={styles.body}>
          Your routine now adapts to how you feel each day. On low-energy days you get your essentials only. On high days, you get your full stack plus one new habit to build.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',background:cfg.bg,border:`1.5px solid ${cfg.border}`,borderRadius:12}}>
              <span style={{fontSize:20,flexShrink:0}}>{cfg.emoji}</span>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:cfg.color,marginBottom:2}}>{cfg.label}</div>
                <div style={{fontSize:12,color:'#666',lineHeight:1.5}}>{cfg.description}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={handleOrganise} style={{...styles.primaryBtn, marginBottom:10}}>
          ✨ Organise my habits automatically
        </button>
        <button onClick={onSkip} style={styles.ghostBtn}>
          Keep app as-is for now
        </button>
      </div>
    </div>
  );

  // Preview the algorithm result
  const habitMap = Object.fromEntries(habits.map(h => [h.key, h]));
  return (
    <div style={styles.overlay}>
      <div style={{...styles.modal, maxHeight:'85vh', overflowY:'auto'}}>
        <div style={styles.title}>Here's your arrangement</div>
        <p style={{...styles.body, marginBottom:20}}>
          Each mode is editable — you can add or remove habits any time from the Habits tab.
        </p>
        {Object.entries(MODE_CONFIG).map(([mode, cfg]) => (
          <div key={mode} style={{marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:16}}>{cfg.emoji}</span>
              <span style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:cfg.color}}>{cfg.label}</span>
              <span style={{fontSize:11,color:'#aaa',marginLeft:'auto'}}>{preview[mode].length} habits</span>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {preview[mode].map(key => {
                const h = habitMap[key];
                if (!h) return null;
                return (
                  <div key={key} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:99,fontSize:12}}>
                    <span>{h.emoji}</span>
                    <span style={{color:'#444'}}>{h.name}</span>
                  </div>
                );
              })}
              {preview[mode].length === 0 && (
                <span style={{fontSize:12,color:'#aaa',fontStyle:'italic'}}>No habits assigned</span>
              )}
            </div>
          </div>
        ))}
        <button onClick={() => onOrganise(preview)} style={{...styles.primaryBtn, marginTop:8, marginBottom:10}}>
          ✅ Looks good — let's go
        </button>
        <button onClick={() => setStep('intro')} style={styles.ghostBtn}>
          ← Back
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT 2: Daily energy prompt
// ─────────────────────────────────────────────────────────────────────────────
function DailyPrompt({ archetypeKey, habits, onSelect, onSkip }) {
  const [chosen, setChosen] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pickedSuggestion, setPickedSuggestion] = useState(null);

  const key = archetypeKey || 'steadybuilder';
  const suggestions = ARCHETYPE_SUGGESTIONS[key] || ARCHETYPE_SUGGESTIONS.steadybuilder;

  // Filter out suggestions already in the user's habits
  const habitKeys = habits.map(h => h.key);
  const availableSuggestions = suggestions.filter(s => !habitKeys.includes(s.key));

  function handleModeClick(mode) {
    setChosen(mode);
    if (mode === 'high') setShowSuggestions(true);
    else setShowSuggestions(false);
  }

  function handleConfirm() {
    onSelect(chosen, pickedSuggestion);
  }

  return (
    <div style={styles.overlay}>
      <div style={{...styles.modal, maxHeight:'85vh', overflowY:'auto'}}>
        <div style={{fontSize:13,color:'#888',marginBottom:6,textAlign:'center'}}>
          {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
        </div>
        <div style={styles.title}>How's your energy today?</div>
        <p style={{...styles.body, marginBottom:20}}>Your habit list adapts to match your capacity.</p>

        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
          {Object.entries(MODE_CONFIG).map(([mode, cfg]) => (
            <button
              key={mode}
              onClick={() => handleModeClick(mode)}
              style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'14px 16px',
                background: chosen===mode ? cfg.bg : 'white',
                border: `2px solid ${chosen===mode ? cfg.color : '#e8e4de'}`,
                borderRadius:14, cursor:'pointer', textAlign:'left',
                transition:'all 0.2s', fontFamily:'DM Sans,sans-serif',
                boxShadow: chosen===mode ? `0 2px 12px ${cfg.border}80` : 'none',
              }}
            >
              <span style={{fontSize:24,flexShrink:0}}>{cfg.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:chosen===mode?cfg.color:'#333',marginBottom:2}}>{cfg.label}</div>
                <div style={{fontSize:12,color:'#888',lineHeight:1.4}}>{cfg.description}</div>
              </div>
              {chosen===mode && <span style={{color:cfg.color,fontSize:18,flexShrink:0}}>✓</span>}
            </button>
          ))}
        </div>

        {/* High energy: pick a bonus suggestion */}
        {showSuggestions && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#c4880a',marginBottom:10}}>
              ⚡ Pick one habit to try today
            </div>
            {availableSuggestions.length === 0 ? (
              <p style={{fontSize:12,color:'#888',fontStyle:'italic'}}>
                You've already built all the suggested habits for your archetype. Nice work! 🏆
              </p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {availableSuggestions.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setPickedSuggestion(pickedSuggestion?.key===s.key ? null : s)}
                    style={{
                      display:'flex', alignItems:'flex-start', gap:12,
                      padding:'12px 14px',
                      background: pickedSuggestion?.key===s.key ? '#fdf8ed' : 'white',
                      border: `1.5px solid ${pickedSuggestion?.key===s.key ? '#d4af6a' : '#e8e4de'}`,
                      borderRadius:12, cursor:'pointer', textAlign:'left',
                      transition:'all 0.2s', fontFamily:'DM Sans,sans-serif',
                    }}
                  >
                    <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{s.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500,color:'#333',marginBottom:3}}>{s.name}</div>
                      <div style={{fontSize:11,color:'#888',lineHeight:1.5,fontStyle:'italic'}}>{s.why}</div>
                      <div style={{fontSize:10,color:'#d4af6a',marginTop:3,fontWeight:600}}>+{s.coins} 🪙 {s.isQuit?'· 🚫 quit habit':''}</div>
                    </div>
                    {pickedSuggestion?.key===s.key && (
                      <div style={{width:20,height:20,borderRadius:'50%',background:'#d4af6a',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>✓</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {chosen==='high' && !pickedSuggestion && availableSuggestions.length > 0 && (
              <p style={{fontSize:11,color:'#aaa',marginTop:8,textAlign:'center'}}>
                You can skip this and still use High mode
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!chosen}
          style={{
            ...styles.primaryBtn,
            opacity: chosen ? 1 : 0.4,
            cursor: chosen ? 'pointer' : 'default',
            marginBottom:10,
          }}
        >
          {chosen ? `Start ${MODE_CONFIG[chosen].emoji} ${MODE_CONFIG[chosen].label} day` : 'Choose your energy level'}
        </button>
        <button onClick={onSkip} style={styles.ghostBtn}>
          Skip for today (use all habits)
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT 3: Mode Editor (opened from Habits tab)
// ─────────────────────────────────────────────────────────────────────────────
export function ModeEditor({ habits, archetypeKey, onClose }) {
  const habitsByMode    = useStore(s => s.habitsByMode);
  const addHabitToMode    = useStore(s => s.addHabitToMode);
  const removeHabitFromMode = useStore(s => s.removeHabitFromMode);
  const [activeMode, setActiveMode] = useState('low');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showAllHabitsView, setShowAllHabitsView] = useState(false);

  const key = archetypeKey || 'steadybuilder';
  const suggestions = ARCHETYPE_SUGGESTIONS[key] || ARCHETYPE_SUGGESTIONS.steadybuilder;
  const habitMap = Object.fromEntries(habits.map(h => [h.key, h]));
  const allSuggestions = [...suggestions];

  const currentStack = habitsByMode[activeMode] || [];

  // Habits available to add: all habits + suggestions not already in this mode
  const addableHabits = [
    ...habits.filter(h => !currentStack.includes(h.key)),
    ...allSuggestions.filter(s => !currentStack.includes(s.key) && !habits.some(h=>h.key===s.key)),
  ];

  const cfg = MODE_CONFIG[activeMode];

  // All habits + suggestions for overview
  const allAvailableHabits = [
    ...habits,
    ...ARCHETYPE_SUGGESTIONS[key].filter(s => !habits.some(h => h.key === s.key)),
  ];

  return (
    <div style={styles.overlay}>
      <div style={{...styles.modal, maxHeight:'85vh', overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={styles.title}>Edit Energy Modes</div>
          <button onClick={onClose} style={{...styles.ghostBtn, padding:'6px 12px', fontSize:13}}>✕</button>
        </div>

        {/* Toggle between All Habits Overview and Energy Mode Editor */}
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <button
            onClick={() => setShowAllHabitsView(false)}
            style={{flex:1,padding:'10px 14px',borderRadius:10,fontWeight:600,fontSize:12,fontFamily:'DM Sans,sans-serif',background:!showAllHabitsView?'#5a7a5a':'#f0f7f0',color:!showAllHabitsView?'white':'#5a7a5a',border:!showAllHabitsView?'none':'1.5px solid #b5ceb5',cursor:'pointer'}}
          >
            By Energy Level
          </button>
          <button
            onClick={() => setShowAllHabitsView(true)}
            style={{flex:1,padding:'10px 14px',borderRadius:10,fontWeight:600,fontSize:12,fontFamily:'DM Sans,sans-serif',background:showAllHabitsView?'#5a7a5a':'#f0f7f0',color:showAllHabitsView?'white':'#5a7a5a',border:showAllHabitsView?'none':'1.5px solid #b5ceb5',cursor:'pointer'}}
          >
            All Habits
          </button>
        </div>

        {showAllHabitsView ? (
          // ────────── ALL HABITS OVERVIEW ──────────────────────────
          <div>
            <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#888',marginBottom:12}}>
              All available habits & suggestions
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:400,overflowY:'auto'}}>
              {allAvailableHabits.map(h => {
                const inLow = (habitsByMode.low || []).includes(h.key);
                const inNormal = (habitsByMode.normal || []).includes(h.key);
                const inHigh = (habitsByMode.high || []).includes(h.key);
                const statusLabel = inLow ? 'Low' : inNormal ? 'Normal' : inHigh ? 'High' : '—';
                const statusColor = inLow ? '#8aad8a' : inNormal ? '#888' : inHigh ? '#d4af6a' : '#ccc';
                return (
                  <div key={h.key} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',background:'white',border:'1.5px solid #e8e4de',borderRadius:11}}>
                    <span style={{fontSize:18,flexShrink:0}}>{h.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500,color:'#333',marginBottom:2}}>{h.name}</div>
                      {h.why && <div style={{fontSize:11,color:'#888',lineHeight:1.4}}>{h.why}</div>}
                      {h.time && <div style={{fontSize:10,color:'#aaa',marginTop:4}}>⏰ {h.time}</div>}
                    </div>
                    <div style={{flexShrink:0,textAlign:'right'}}>
                      <div style={{fontSize:10,fontWeight:700,color:statusColor,textTransform:'uppercase',letterSpacing:'0.5px'}}>{statusLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid #f0ece6'}}>
              <p style={{fontSize:11,color:'#888',lineHeight:1.6,marginBottom:12}}>
                💡 <strong>Tip:</strong> Use the "By Energy Level" tab to organize habits into Low, Normal, or High energy stacks. Your daily energy will show the right habits for how you're feeling.
              </p>
              <button onClick={() => setShowAllHabitsView(false)} style={{width:'100%',padding:'12px',background:'#5a7a5a',color:'white',border:'none',borderRadius:10,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
                Start Organizing →
              </button>
            </div>
          </div>
        ) : (
          // ────────── BY ENERGY LEVEL EDITOR ──────────────────────────────
          <div>

        {/* Mode tabs */}
        <div style={{display:'flex',gap:6,marginBottom:20,background:'#f7f3ed',borderRadius:10,padding:4}}>
          {Object.entries(MODE_CONFIG).map(([mode, c]) => (
            <button
              key={mode}
              onClick={() => { setActiveMode(mode); setShowAddPanel(false); }}
              style={{
                flex:1, padding:'8px 4px',
                background: activeMode===mode ? c.bg : 'transparent',
                border: activeMode===mode ? `1.5px solid ${c.border}` : '1.5px solid transparent',
                borderRadius:8, cursor:'pointer',
                fontSize:12, fontWeight:600, color:activeMode===mode?c.color:'#888',
                fontFamily:'DM Sans,sans-serif', transition:'all 0.2s',
              }}
            >
              {c.emoji} {c.label.split(' ')[0]}
            </button>
          ))}
        </div>

        <div style={{fontSize:11,color:'#888',marginBottom:14,lineHeight:1.5}}>
          {cfg.description}
          {activeMode==='low' && ' — We recommend keeping this to 3 essentials maximum.'}
          {activeMode==='high' && ' — The daily suggestion slot adds one more on top of this.'}
        </div>

        {/* Current stack */}
        <div style={{marginBottom:16}}>
          {currentStack.length === 0 ? (
            <div style={{padding:'16px',background:'#f7f3ed',borderRadius:12,textAlign:'center',fontSize:13,color:'#aaa'}}>
              No habits in this mode yet. Add some below.
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {currentStack.map(hKey => {
                const h = habitMap[hKey] || allSuggestions.find(s=>s.key===hKey);
                if (!h) return null;
                return (
                  <div key={hKey} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:10}}>
                    <span style={{fontSize:18}}>{h.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500,color:'#333'}}>{h.name}</div>
                      {h.time && <div style={{fontSize:10,color:'#aaa'}}>{h.time}</div>}
                    </div>
                    <button
                      onClick={() => removeHabitFromMode(activeMode, hKey)}
                      style={{width:24,height:24,borderRadius:'50%',border:'1px solid #e8e4de',background:'white',cursor:'pointer',fontSize:11,color:'#bbb',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}
                      onMouseOver={e=>{e.currentTarget.style.borderColor='#e07070';e.currentTarget.style.color='#e07070';}}
                      onMouseOut={e=>{e.currentTarget.style.borderColor='#e8e4de';e.currentTarget.style.color='#bbb';}}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add habit panel */}
        {!showAddPanel ? (
          <button
            onClick={() => setShowAddPanel(true)}
            style={{...styles.ghostBtn, width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}
          >
            ＋ Add a habit to {cfg.emoji} {cfg.label}
          </button>
        ) : (
          <div>
            <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#888',marginBottom:10}}>
              Available to add
            </div>
            {addableHabits.length === 0 ? (
              <p style={{fontSize:12,color:'#aaa',textAlign:'center',fontStyle:'italic'}}>All habits are already in this mode.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:250,overflowY:'auto'}}>
                {addableHabits.map(h => (
                  <button
                    key={h.key}
                    onClick={() => { addHabitToMode(activeMode, h.key); setShowAddPanel(false); }}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'white',border:'1.5px solid #e8e4de',borderRadius:10,cursor:'pointer',textAlign:'left',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s'}}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=cfg.color;e.currentTarget.style.background=cfg.bg;}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor='#e8e4de';e.currentTarget.style.background='white';}}
                  >
                    <span style={{fontSize:18}}>{h.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500,color:'#333'}}>{h.name}</div>
                      {h.why && <div style={{fontSize:10,color:'#888',marginTop:2,lineHeight:1.4,fontStyle:'italic'}}>{h.why}</div>}
                    </div>
                    <span style={{fontSize:13,color:cfg.color,fontWeight:700,flexShrink:0}}>＋</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowAddPanel(false)} style={{...styles.ghostBtn, width:'100%', marginTop:10}}>
              Cancel
            </button>
          </div>
        )}

        <div style={{marginTop:20, paddingTop:16, borderTop:'1px solid #f0ece6'}}>
          <button onClick={onClose} style={styles.primaryBtn}>
            ✅ Done editing
          </button>
        </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function EnergyModeModal({ habits, archetypeKey }) {
  const energyModeSetupDone = useStore(s => s.energyModeSetupDone);
  const energyModeDate      = useStore(s => s.energyModeDate);
  const setEnergyMode       = useStore(s => s.setEnergyMode);
  const setEnergyModeDate   = useStore(s => s.setEnergyModeDate);
  const setEnergyModeSetupDone = useStore(s => s.setEnergyModeSetupDone);
  const setHabitsByMode     = useStore(s => s.setHabitsByMode);
  const setTodayHighSuggestion = useStore(s => s.setTodayHighSuggestion);
  const addCustomHabit      = useStore(s => s.addCustomHabit);

  const today = new Date().toISOString().split('T')[0];
  const needsDailyPrompt = energyModeSetupDone && energyModeDate !== today;

  // Only show if habits have loaded
  if (!habits || habits.length === 0) return null;

  // ── Step 1: first-time setup ─────────────────────────────────────────────
  if (!energyModeSetupDone) {
    return (
      <SetupModal
        habits={habits}
        onOrganise={(stacks) => {
          setHabitsByMode(stacks);
          setEnergyModeSetupDone(true);
          // Don't set today's mode yet — daily prompt will fire next
        }}
        onSkip={() => {
          // Mark setup done but don't assign modes → energy mode system stays inactive
          setEnergyModeSetupDone(true);
          setEnergyModeDate(today); // suppress daily prompt today too
          setEnergyMode('normal');  // default to normal so app works as before
        }}
      />
    );
  }

  // ── Step 2: daily mode prompt ────────────────────────────────────────────
  if (needsDailyPrompt) {
    return (
      <DailyPrompt
        archetypeKey={archetypeKey}
        habits={habits}
        onSelect={(mode, suggestion) => {
          setEnergyMode(mode);
          setEnergyModeDate(today);
          if (suggestion) {
            // Add the chosen bonus habit to customHabits for today
            addCustomHabit({ ...suggestion, isCustom: true });
            setTodayHighSuggestion(suggestion.key);
          } else {
            setTodayHighSuggestion(null);
          }
        }}
        onSkip={() => {
          setEnergyMode('normal');
          setEnergyModeDate(today);
          setTodayHighSuggestion(null);
        }}
      />
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '20px',
  },
  modal: {
    background: 'white',
    borderRadius: 24,
    padding: '28px 24px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
    fontFamily: 'DM Sans, sans-serif',
  },
  pill: {
    display: 'inline-block',
    padding: '4px 12px',
    background: '#f0f7f0',
    border: '1px solid #b5ceb5',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    color: '#5a7a5a',
    marginBottom: 10,
    letterSpacing: '0.5px',
  },
  title: {
    fontFamily: 'Instrument Serif, serif',
    fontSize: 26,
    fontWeight: 400,
    color: '#1a1a16',
    marginBottom: 8,
    lineHeight: 1.2,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: '#666',
    lineHeight: 1.6,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #8aad8a, #5a7a5a)',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    boxShadow: '0 4px 14px rgba(90,122,90,0.3)',
    transition: 'all 0.2s',
  },
  ghostBtn: {
    width: '100%',
    padding: '11px 20px',
    background: 'transparent',
    color: '#888',
    border: '1.5px solid #e8e4de',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'all 0.2s',
  },
};