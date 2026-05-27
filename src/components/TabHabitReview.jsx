'use client';

import { useState } from 'react';
import { useStore } from '../lib/store';

// ─── Science database ─────────────────────────────────────────────────────────
// One entry per habit key. Any habit not listed shows a generic card.
// Add entries here as you expand the program.

const HABIT_SCIENCE = {
  // Sleep
  phone_off_930: {
    why: 'Blue light from screens suppresses melatonin by up to 3 hours, delaying sleep onset and cutting REM sleep. Cutting screens 90 min before bed restores natural melatonin release.',
    cite: 'Chang et al. (2015), PNAS; Gooley et al. (2011), J Clin Endocrinol Metab',
    category: 'sleep', color: '#8a7a9e', icon: '😴',
    tip: 'Swap your phone for a book, podcast, or light stretching — your body will thank you by 10pm.',
  },
  blue_light_off: {
    why: 'Light in the 480 nm range (screens, LEDs) hits melanopsin-containing retinal cells and directly suppresses melatonin. 90 minutes is the minimum lead time your brain needs to begin winding down.',
    cite: 'Cajochen et al. (2011), J Appl Physiol; Gooley et al. (2011)',
    category: 'sleep', color: '#8a7a9e', icon: '😴',
    tip: 'Night mode and blue-light glasses help but don\'t eliminate the signal — physical distance from the screen is still best.',
  },
  winddown_10: {
    why: 'Core body temperature needs to drop 1–3°F for sleep onset. A consistent wind-down cue trains your circadian rhythm to begin this process on schedule.',
    cite: 'Walker, M. (2017), Why We Sleep; Raymann et al. (2008), Brain',
    category: 'sleep', color: '#8a7a9e', icon: '😴',
    tip: 'A warm shower 90 min before bed actually accelerates temperature drop — the heat brings blood to the surface and speeds cooling.',
  },

  // Nutrition
  protein_breakfast: {
    why: 'A protein-rich breakfast (30g+) activates dopamine and tyrosine pathways, boosting alertness and satiety for 4–6 hours. It also reduces ghrelin (hunger hormone) more effectively than carbohydrate-first meals.',
    cite: 'Leidy et al. (2013), Am J Clin Nutr; Rains & Leidy (2013), Curr Opin Clin Nutr',
    category: 'nutrition', color: '#c4a882', icon: '🥚',
    tip: 'Eggs, Greek yogurt, smoked salmon, or a protein smoothie all count. Aim for 25–40g within 60 minutes of waking.',
  },
  plant_diversity: {
    why: 'The gut microbiome thrives on fibre diversity. Eating 30+ different plant species per week is associated with significantly higher microbiome diversity, better mood regulation (via the gut-brain axis), and lower inflammation.',
    cite: 'McDonald et al. (2018), Cell Host & Microbe; Sonnenburg & Sonnenburg (2019)',
    category: 'nutrition', color: '#c4a882', icon: '🌱',
    tip: 'Each herb, spice, nut, seed, and vegetable counts as a separate plant. A mixed salad with 8 ingredients = 8 plants.',
  },
  plant_meal: {
    why: 'One plant-based meal daily reduces saturated fat intake, increases prebiotic fibre, and is associated with a 16% lower cardiovascular disease risk over time.',
    cite: 'Willett et al. (2019), The Lancet; Sonnenburg & Gardner (2021), Cell',
    category: 'nutrition', color: '#c4a882', icon: '🌱',
    tip: 'Doesn\'t have to be a full vegan plate — a lentil soup, bean tacos, or tofu stir-fry all count.',
  },
  plant_based_day: {
    why: 'Full plant-based days reset your gut microbiome\'s short-chain fatty acid production and reduce inflammatory markers within 48 hours.',
    cite: 'Zhao et al. (2018), Science; Jacka et al. (2017), BMC Medicine',
    category: 'nutrition', color: '#c4a882', icon: '🌱',
    tip: 'Plan it on your lowest-stress day of the week — less willpower needed when the day is already calm.',
  },
  fermented_foods: {
    why: 'Fermented foods (yogurt, kefir, kimchi, sauerkraut) directly increase gut microbiome diversity. A 10-week trial showed fermented food diets decreased 19 inflammatory proteins.',
    cite: 'Wastyk et al. (2021), Cell; Sonnenburg & Gardner (2021)',
    category: 'nutrition', color: '#c4a882', icon: '🥛',
    tip: 'Even one serving per day makes a measurable difference. Natural yogurt with live cultures counts.',
  },

  // Movement
  outdoor_walk: {
    why: 'Walking after meals reduces blood glucose spikes by up to 30% by using muscle glycogen. Morning outdoor movement also anchors your circadian clock via light exposure, improving energy levels throughout the day.',
    cite: 'Merry et al. (2020), Sports Med; Huberman Lab (2022)',
    category: 'movement', color: '#8aad8a', icon: '🚶',
    tip: 'Even a 10-minute walk outside in the morning is enough to anchor your circadian rhythm for the day.',
  },
  afternoon_movement: {
    why: 'Core body temperature peaks in the mid-to-late afternoon, making it the optimal window for strength, power, and endurance training. Wolf chronotypes particularly benefit from afternoon exercise timing.',
    cite: 'Teo et al. (2011), J Strength Cond Res; Brinkman & Sharma (2023)',
    category: 'movement', color: '#8aad8a', icon: '🏋️',
    tip: 'If afternoon isn\'t possible, even 20 minutes of brisk walking counts — consistency trumps perfect timing.',
  },
  post_lunch_walk: {
    why: 'A post-meal walk (10–15 min) blunts the post-lunch glucose spike that causes the 2pm energy crash. It also aids digestion and reduces cortisol.',
    cite: 'Merry et al. (2020), Sports Med; Reynolds et al. (2022)',
    category: 'movement', color: '#8aad8a', icon: '🚶',
    tip: 'You don\'t need to walk fast — a gentle 10-minute stroll is enough to meaningfully lower blood sugar.',
  },
  movement_snacks: {
    why: 'Breaking up sedentary time with 2-minute movement snacks every 30 minutes reduces cardiovascular risk markers and improves insulin sensitivity more than a single 30-minute session.',
    cite: 'Dempsey et al. (2016), Diabetologia; Dunstan et al. (2012)',
    category: 'movement', color: '#8aad8a', icon: '🤸',
    tip: 'Calf raises at your desk, a quick set of squats, or walking to get water — it all counts.',
  },

  // Mindfulness
  box_breathing: {
    why: 'Box breathing (4-4-4-4) activates the parasympathetic nervous system within 60 seconds by stimulating the vagus nerve. It lowers cortisol and shifts you out of a threat response.',
    cite: 'Zaccaro et al. (2018), Front Hum Neurosci; Perciavalle et al. (2017)',
    category: 'mindfulness', color: '#b5ceb5', icon: '🫁',
    tip: 'Do it at the same time each day — tied to a cue (e.g. after lunch) it becomes automatic within 2 weeks.',
  },
  afternoon_breathwork: {
    why: 'Breathing exercises in the early afternoon can counteract the natural cortisol dip that causes fatigue — without the crash that comes from caffeine.',
    cite: 'Jerath et al. (2015), Med Hypotheses; Zaccaro et al. (2018)',
    category: 'mindfulness', color: '#b5ceb5', icon: '🧘',
    tip: '5 minutes is enough. The physiological sigh (double inhale, long exhale) is the fastest form for acute stress.',
  },
  gratitude_log: {
    why: 'Writing 3 specific things you\'re grateful for activates the prefrontal cortex and downregulates the amygdala. Just 3 weeks reduces depressive symptoms and increases life satisfaction.',
    cite: 'Emmons & McCullough (2003), J Pers Soc Psychol; Seligman et al. (2005)',
    category: 'mindfulness', color: '#b5ceb5', icon: '📖',
    tip: 'Specificity matters more than length — "the warm coffee this morning" is more effective than "I\'m grateful for coffee."',
  },
  evening_planning: {
    why: 'Writing down tomorrow\'s tasks before bed reduces cognitive load at night, decreases sleep latency, and improves morning productivity by 20%.',
    cite: 'Scullin et al. (2018), J Exp Psychol Gen; Baumeister & Masicampo (2011)',
    category: 'mindfulness', color: '#b5ceb5', icon: '📝',
    tip: 'Keep it to 3 intentions max — a long list creates anxiety, not clarity.',
  },

  // Wellness
  morning_light_10: {
    why: 'Morning light triggers a cortisol spike (the "alerting pulse") which anchors your circadian rhythm, sharpens focus, and sets your melatonin timing for 14–16 hours later.',
    cite: 'Huberman (2020), Neuron; Roenneberg et al. (2012), Curr Biol',
    category: 'wellness', color: '#d4af6a', icon: '☀️',
    tip: 'It needs to be outside — glass blocks the UV wavelengths your eyes need. Even on a cloudy day it works.',
  },
  morning_light_15: {
    why: 'The cortisol awakening response is amplified by light exposure. 15 minutes of outdoor morning light can shift your peak alertness window by up to 1–2 hours.',
    cite: 'Huberman Lab (2022); Leproult et al. (2001), Sleep',
    category: 'wellness', color: '#d4af6a', icon: '☀️',
    tip: 'Walk, stretch, or have your coffee outside — you don\'t need to stare at the sky.',
  },
  water_on_wake: {
    why: 'You lose 0.5–1L of water overnight through breathing and sweat. Rehydrating first thing improves cognitive performance, reduces cortisol, and kickstarts digestion.',
    cite: 'Armstrong et al. (2012), J Nutr; Ganio et al. (2011)',
    category: 'wellness', color: '#d4af6a', icon: '💧',
    tip: 'Keep a glass of water on your bedside table the night before — the cue removes all friction.',
  },
  cold_shower: {
    why: 'Cold water immersion triggers norepinephrine release (200–300% increase), improving alertness, mood, and resilience over time. The discomfort itself trains emotional regulation.',
    cite: 'Shevchuk (2008), Med Hypotheses; Janský et al. (1996)',
    category: 'wellness', color: '#d4af6a', icon: '🚿',
    tip: 'You don\'t need a full cold shower — 30 seconds at the end of a warm shower is enough to trigger the response.',
  },
};

const CATEGORY_COLORS = {
  sleep:       { bg: '#f0edf8', border: '#c4b0e0', text: '#6a4a8a', label: 'Sleep' },
  nutrition:   { bg: '#fdf8ed', border: '#e8c882', text: '#8a6a20', label: 'Nutrition' },
  movement:    { bg: '#f3f8f3', border: '#8aad8a', text: '#3a6a3a', label: 'Movement' },
  mindfulness: { bg: '#f0f8f0', border: '#a0c8a0', text: '#3a5a3a', label: 'Mindfulness' },
  wellness:    { bg: '#fdf8ed', border: '#d4af6a', text: '#8a6a30', label: 'Wellness' },
};

export default function TabHabitReview({ habits = [], customHabits = [] }) {
  const [selected, setSelected]   = useState(null); // habit key for detail modal
  const [filter, setFilter]       = useState('all');
  const completedToday = useStore(s => s.completedToday);

  const allHabits = [...habits, ...customHabits];
  const categories = ['all', 'sleep', 'nutrition', 'movement', 'mindfulness', 'wellness'];
  const filtered   = filter === 'all' ? allHabits : allHabits.filter(h => h.category === filter);

  const selectedHabit   = allHabits.find(h => h.key === selected);
  const selectedScience = selected ? HABIT_SCIENCE[selected] : null;

  return (
    <div style={{ padding: '22px 26px', maxWidth: 900 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, fontWeight: 400, color: '#1a1a1a', marginBottom: 4 }}>
          Your Habit Science
        </h1>
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, maxWidth: 600 }}>
          Every habit in your program is backed by peer-reviewed research. Tap any card to read the science behind it — understanding <em>why</em> a habit works makes it 40% more likely to stick.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
        {categories.map(c => {
          const col = c === 'all' ? null : CATEGORY_COLORS[c];
          const active = filter === c;
          return (
            <button key={c} onClick={() => setFilter(c)}
              style={{
                padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${active ? (col?.border || '#2a2a2a') : '#e8e4de'}`,
                background: active ? (col?.bg || '#1a2e1a') : 'white',
                color: active ? (col?.text || 'white') : '#888',
                fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
              }}>
              {c === 'all' ? 'All habits' : col?.label}
            </button>
          );
        })}
      </div>

      {/* Habit cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 32 }}>
        {filtered.map(h => {
          const sci = HABIT_SCIENCE[h.key];
          const cat = CATEGORY_COLORS[h.category] || CATEGORY_COLORS.wellness;
          const done = completedToday.includes(h.key);
          return (
            <div key={h.key} onClick={() => setSelected(h.key)}
              style={{
                background: 'white', borderRadius: 16, padding: 18, cursor: 'pointer',
                border: `1.5px solid ${done ? '#8aad8a' : '#e8e4de'}`,
                borderTop: `3px solid ${cat.border}`,
                transition: 'all 0.2s', position: 'relative',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}
            >
              {done && (
                <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: '50%', background: '#8aad8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 700 }}>✓</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 24 }}>{h.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 }}>{h.name}</div>
                  {h.time && <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{h.time}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
                  {cat.label}
                </span>
                <span style={{ fontSize: 10, color: '#d4af6a', fontWeight: 600 }}>+{h.coins} 🪙</span>
                {h.ge > 0 && <span style={{ fontSize: 10, color: '#38a855', fontWeight: 600 }}>+{h.ge} ⚡</span>}
              </div>

              {sci ? (
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, margin: 0 }}>
                  {sci.why.slice(0, 100)}…
                  <span style={{ color: '#8aad8a', fontWeight: 600 }}> Read more →</span>
                </p>
              ) : (
                <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic', margin: 0 }}>
                  {h.isCustom ? 'Your custom habit' : 'Science note coming soon'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#aaa' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14 }}>No {filter} habits in your program yet</div>
        </div>
      )}

      {/* Science note */}
      <div style={{ background: '#f7f3ed', border: '1px solid #e8d9c4', borderRadius: 14, padding: '14px 18px', fontSize: 12, color: '#7a6040', lineHeight: 1.7 }}>
        🔬 <strong>Why the science matters:</strong> Research by Milkman et al. (2021) found that people who understood the mechanism behind a behaviour were 38% more likely to sustain it after 6 weeks. These aren&apos;t arbitrary habits — they&apos;re chosen because they work together as a system.
      </div>

      {/* Detail modal */}
      {selected && selectedHabit && (
        <div onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 24, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: selectedScience ? CATEGORY_COLORS[selectedScience.category]?.bg || '#f7f3ed' : '#f7f3ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                  {selectedHabit.emoji}
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 20, color: '#1a1a1a', marginBottom: 4 }}>{selectedHabit.name}</h2>
                  {selectedHabit.time && <div style={{ fontSize: 11, color: '#aaa' }}>⏰ {selectedHabit.time}</div>}
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            {/* Rewards */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <div style={{ flex: 1, background: '#fdf8ed', border: '1px solid #e8c882', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#d4af6a' }}>+{selectedHabit.coins}</div>
                <div style={{ fontSize: 10, color: '#888' }}>🪙 coins / day</div>
              </div>
              {selectedHabit.ge > 0 && (
                <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#38a855' }}>+{selectedHabit.ge}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>⚡ green energy / day</div>
                </div>
              )}
            </div>

            {selectedScience ? (
              <>
                {/* Why it works */}
                <div style={{ background: '#f7f3ed', borderRadius: 16, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 10 }}>🔬 Why it works</div>
                  <p style={{ fontSize: 14, color: '#2a2a2a', lineHeight: 1.75, margin: 0 }}>{selectedScience.why}</p>
                </div>

                {/* Citation */}
                <div style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>📄 Research</div>
                  <p style={{ fontSize: 12, color: '#666', margin: 0, fontStyle: 'italic' }}>{selectedScience.cite}</p>
                </div>

                {/* Practical tip */}
                <div style={{ background: 'linear-gradient(135deg, #f3f8f3, #e8f0e8)', border: '1px solid #b5ceb5', borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#5a7a5a', marginBottom: 8 }}>💡 Make it stick</div>
                  <p style={{ fontSize: 13, color: '#3a5a3a', lineHeight: 1.7, margin: 0 }}>{selectedScience.tip}</p>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📚</div>
                <div style={{ fontSize: 13 }}>Science note for this habit coming soon</div>
              </div>
            )}

            <button onClick={() => setSelected(null)}
              style={{ width: '100%', marginTop: 20, padding: 13, background: '#1a2e1a', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Got it ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
