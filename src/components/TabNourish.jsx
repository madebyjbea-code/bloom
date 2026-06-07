'use client';

// ─────────────────────────────────────────────────────────────────────────────
// TabNourish.jsx
// Drop into: src/components/TabNourish.jsx
//
// Two sections:
//   1. Daily Plate — tap food categories you hit today → macro rings update
//   2. Meal Quality — rate breakfast/lunch/dinner as 🌱/🟡/🔴/skip
//      Three consecutive 🔴 across days triggers health decay
//
// All state stored in localStorage (keyed by date) — no schema changes needed.
// Coins awarded only for 🌱 meal logs.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

// ─── FOOD CATEGORIES ─────────────────────────────────────────────────────────
// Each category contributes to one or more macros.
// examples shown as a light tooltip/hint — not required, just inspiring.

const FOOD_CATEGORIES = [
  {
    key: 'meat_fish_eggs',
    emoji: '🥩',
    name: 'Meat, Fish & Eggs',
    examples: 'chicken, salmon, eggs, tuna',
    macros: ['protein'],
  },
  {
    key: 'oily_fish',
    emoji: '🐟',
    name: 'Oily Fish',
    examples: 'salmon, mackerel, sardines, herring',
    macros: ['protein', 'healthy_fats'],
  },
  {
    key: 'dairy',
    emoji: '🥛',
    name: 'Dairy & Alternatives',
    examples: 'greek yoghurt, kefir, cheese, milk',
    macros: ['protein', 'healthy_fats'],
  },
  {
    key: 'legumes',
    emoji: '🫘',
    name: 'Legumes',
    examples: 'lentils, chickpeas, black beans, edamame',
    macros: ['protein', 'complex_carbs'],
  },
  {
    key: 'nuts_seeds',
    emoji: '🌰',
    name: 'Nuts & Seeds',
    examples: 'almonds, walnuts, chia, flaxseed',
    macros: ['healthy_fats', 'protein'],
  },
  {
    key: 'healthy_fats',
    emoji: '🥑',
    name: 'Healthy Fats',
    examples: 'avocado, olive oil, coconut oil',
    macros: ['healthy_fats'],
  },
  {
    key: 'grains_starchy',
    emoji: '🌾',
    name: 'Grains & Starchy Carbs',
    examples: 'oats, sweet potato, rice, whole grain bread',
    macros: ['complex_carbs'],
  },
  {
    key: 'cruciferous',
    emoji: '🥦',
    name: 'Cruciferous Veg',
    examples: 'broccoli, cauliflower, kale, Brussels sprouts',
    macros: ['complex_carbs'],
  },
  {
    key: 'root_veg',
    emoji: '🥕',
    name: 'Root Veg',
    examples: 'carrots, beetroot, parsnip, celeriac',
    macros: ['complex_carbs'],
  },
  {
    key: 'leafy_greens',
    emoji: '🌿',
    name: 'Leafy Greens',
    examples: 'spinach, rocket, chard, watercress',
    macros: ['diversity'],
  },
  {
    key: 'fruit',
    emoji: '🍓',
    name: 'Fruit',
    examples: 'berries, apple, citrus, banana',
    macros: ['complex_carbs'],
  },
  {
    key: 'fermented',
    emoji: '🫙',
    name: 'Fermented Foods',
    examples: 'kimchi, sauerkraut, miso, kombucha',
    macros: ['diversity'],
  },
  {
    key: 'mushrooms',
    emoji: '🍄',
    name: 'Mushrooms & Fungi',
    examples: 'shiitake, portobello, oyster, chestnut',
    macros: ['diversity'],
  },
  {
    key: 'hydration',
    emoji: '💧',
    name: 'Hydration',
    examples: 'water, herbal tea, coconut water',
    macros: ['diversity'],
  },
];

// ─── MACRO DEFINITIONS ───────────────────────────────────────────────────────
const MACROS = [
  { key: 'protein',      label: 'Protein',       emoji: '💪', color: '#c4880a', bg: '#fdf8ed', border: '#d4af6a' },
  { key: 'healthy_fats', label: 'Healthy Fats',  emoji: '🥑', color: '#5a7a5a', bg: '#f0f7f0', border: '#8aad8a' },
  { key: 'complex_carbs',label: 'Complex Carbs', emoji: '🌾', color: '#7a6a9e', bg: '#f3f0f8', border: '#b0a0d0' },
  { key: 'diversity',    label: 'Diversity',     emoji: '🌈', color: '#c47a5a', bg: '#fdf3ed', border: '#d4a882' },
];

// Minimum categories to "cover" a macro
const MACRO_THRESHOLD = 1;

// ─── MEAL QUALITY ────────────────────────────────────────────────────────────
const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙' },
];

const QUALITY_OPTIONS = [
  { key: 'whole',     emoji: '🌱', label: 'Whole & fresh',      color: '#5a7a5a', bg: '#f0f7f0', border: '#8aad8a', coins: 10 },
  { key: 'mixed',     emoji: '🟡', label: 'Mixed',               color: '#9a8a3a', bg: '#fdf8e0', border: '#c8b850', coins: 0  },
  { key: 'processed', emoji: '🔴', label: 'Processed / takeout', color: '#a04040', bg: '#fdf0f0', border: '#d08080', coins: 0  },
  { key: 'skipped',   emoji: '⏭', label: 'Skipped',             color: '#aaa',    bg: '#f7f7f7', border: '#ddd',    coins: 0  },
];

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'bloom-nourish';

function loadNourishData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveNourishData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayKey() {
  return new Date(Date.now() - 86400000).toISOString().split('T')[0];
}

// Count consecutive 🔴 across the last N meal slots chronologically
function countConsecutiveRed(allData, todayKey) {
  // Build a flat ordered list of meal quality ratings from today backwards
  const days = [todayKey, getYesterdayKey()];
  const mealOrder = ['dinner', 'lunch', 'breakfast']; // reverse order for counting back

  const flatRatings = [];
  for (const day of days) {
    const dayData = allData[day] || {};
    const meals = dayData.meals || {};
    for (const slot of mealOrder) {
      if (meals[slot] && meals[slot] !== 'skipped') {
        flatRatings.push(meals[slot]);
      }
    }
  }

  // Count consecutive reds from the most recent logged meal
  let count = 0;
  for (const rating of flatRatings) {
    if (rating === 'processed') count++;
    else break;
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function TabNourish({ userId, coins, setStats, toast }) {
  const today = getTodayKey();
  const allData = loadNourishData();
  const todayData = allData[today] || { categories: [], meals: {} };

  const [selectedCategories, setSelectedCategories] = useState(todayData.categories || []);
  const [meals, setMeals] = useState(todayData.meals || {});
  const [tooltip, setTooltip] = useState(null); // key of category showing examples
  const [redWarning, setRedWarning] = useState(false);

  // Persist on every change
  useEffect(() => {
    const updated = {
      ...allData,
      [today]: { categories: selectedCategories, meals },
    };
    saveNourishData(updated);
  }, [selectedCategories, meals]);

  // ── Category toggle ────────────────────────────────────────────────────────
  function toggleCategory(key) {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  // ── Macro coverage ─────────────────────────────────────────────────────────
  function getMacroCoverage() {
    const covered = {};
    for (const macro of MACROS) {
      const contributing = FOOD_CATEGORIES.filter(
        c => selectedCategories.includes(c.key) && c.macros.includes(macro.key)
      );
      covered[macro.key] = contributing.length >= MACRO_THRESHOLD;
    }
    return covered;
  }

  const macroCoverage = getMacroCoverage();
  const coveredCount = Object.values(macroCoverage).filter(Boolean).length;

  // ── Meal quality log ───────────────────────────────────────────────────────
  async function logMeal(slot, quality) {
    const prev = meals[slot];
    const updated = { ...meals, [slot]: quality };
    setMeals(updated);

    // Award coins for whole/fresh meals
    const opt = QUALITY_OPTIONS.find(o => o.key === quality);
    if (opt?.coins > 0 && prev !== quality) {
      const nc = coins + opt.coins;
      if (userId) {
        await supabase.from('user_stats').update({ coins: nc }).eq('user_id', userId);
      }
      setStats({ coins: nc });
      toast(`🌱 +${opt.coins} 🪙 wholesome meal logged!`);
    }

    // Check consecutive red meals for health decay
    const allUpdated = {
      ...allData,
      [today]: { categories: selectedCategories, meals: updated },
    };
    const consecutive = countConsecutiveRed(allUpdated, today);
    if (consecutive >= 3) {
      setRedWarning(true);
      // Apply a small health decay (-3)
      // Note: only fires once per "trigger" — you could add a flag to allData to prevent double-firing
      const alreadyTriggered = allUpdated[today]?.redDecayTriggered;
      if (!alreadyTriggered) {
        allUpdated[today].redDecayTriggered = true;
        saveNourishData(allUpdated);
        const currentHealth = useStore.getState?.().health ?? 50;
        const newHealth = Math.max(10, currentHealth - 3);
        if (userId) {
          await supabase.from('user_stats').update({ health: newHealth }).eq('user_id', userId);
        }
        setStats({ health: newHealth });
        toast('🔴 3 processed meals in a row — small health dip (-3 ❤️)');
      }
    } else {
      setRedWarning(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const allCovered = coveredCount === MACROS.length;
  const consecutiveRed = countConsecutiveRed(
    { ...allData, [today]: { categories: selectedCategories, meals } },
    today
  );

  return (
    <div style={{ padding: '22px 26px', maxWidth: 800, fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, fontWeight: 400, color: '#1a1a16', marginBottom: 4 }}>
          Nourish 🥗
        </h2>
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
          Tap what you ate today — no quantities, no guilt. Just awareness.
        </p>
      </div>

      {/* ── Macro Coverage Rings ───────────────────────────────────────────── */}
      <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 14 }}>
          Today&apos;s Coverage
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {MACROS.map(macro => {
            const covered = macroCoverage[macro.key];
            return (
              <div key={macro.key} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '12px 8px',
                background: covered ? macro.bg : '#f7f3ed',
                border: `1.5px solid ${covered ? macro.border : '#e8e4de'}`,
                borderRadius: 14,
                transition: 'all 0.3s',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: covered ? `linear-gradient(135deg, ${macro.border}, ${macro.color})` : '#e8e4de',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, transition: 'all 0.3s',
                  boxShadow: covered ? `0 3px 10px ${macro.border}60` : 'none',
                }}>
                  {covered ? '✓' : macro.emoji}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: covered ? macro.color : '#bbb', textAlign: 'center', lineHeight: 1.3 }}>
                  {macro.label}
                </div>
              </div>
            );
          })}
        </div>
        {allCovered && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'linear-gradient(135deg, #f0f7f0, #e8f0e8)', border: '1px solid #8aad8a', borderRadius: 12, fontSize: 12, color: '#5a7a5a', fontWeight: 600, textAlign: 'center' }}>
            🌟 Full coverage today — beautifully balanced!
          </div>
        )}
        {!allCovered && selectedCategories.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#aaa', textAlign: 'center' }}>
            {coveredCount}/{MACROS.length} categories covered · keep going
          </div>
        )}
      </div>

      {/* ── Food Categories Grid ───────────────────────────────────────────── */}
      <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 14 }}>
          What did you eat today?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {FOOD_CATEGORIES.map(cat => {
            const selected = selectedCategories.includes(cat.key);
            const showTip = tooltip === cat.key;
            return (
              <div key={cat.key} style={{ position: 'relative' }}>
                <button
                  onClick={() => toggleCategory(cat.key)}
                  onMouseEnter={() => setTooltip(cat.key)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 13px',
                    background: selected ? '#f0f7f0' : 'white',
                    border: `1.5px solid ${selected ? '#8aad8a' : '#e8e4de'}`,
                    borderRadius: 12, cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.2s',
                    boxShadow: selected ? '0 2px 8px rgba(90,122,90,0.12)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{cat.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: selected ? '#3a6a3a' : '#333', lineHeight: 1.3 }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 1, lineHeight: 1.3 }}>
                      {cat.macros.map(m => MACROS.find(x => x.key === m)?.label).filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {selected && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#8aad8a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>✓</div>
                  )}
                </button>
                {/* Examples tooltip */}
                {showTip && cat.examples && (
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
                    background: '#1a1a16', color: 'white', borderRadius: 8,
                    padding: '6px 10px', fontSize: 11, lineHeight: 1.5,
                    zIndex: 10, pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}>
                    e.g. {cat.examples}
                    <div style={{ position: 'absolute', bottom: -4, left: 16, width: 8, height: 8, background: '#1a1a16', transform: 'rotate(45deg)' }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {selectedCategories.length === 0 && (
          <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>
            Tap anything you ate or drank today
          </p>
        )}
      </div>

      {/* ── Meal Quality ──────────────────────────────────────────────────── */}
      <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888' }}>
            Meal Quality
          </div>
          <div style={{ fontSize: 10, color: '#aaa' }}>🌱 earns +10 🪙</div>
        </div>
        <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, lineHeight: 1.5 }}>
          No judgment — just noticing. Three processed meals in a row has a small health impact.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MEAL_SLOTS.map(slot => {
            const current = meals[slot.key];
            return (
              <div key={slot.key}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{slot.emoji}</span> {slot.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {QUALITY_OPTIONS.map(opt => {
                    const active = current === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => logMeal(slot.key, opt.key)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '10px 6px',
                          background: active ? opt.bg : 'white',
                          border: `1.5px solid ${active ? opt.border : '#e8e4de'}`,
                          borderRadius: 12, cursor: 'pointer',
                          transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
                          boxShadow: active ? `0 2px 8px ${opt.border}50` : 'none',
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: active ? opt.color : '#bbb', textAlign: 'center', lineHeight: 1.3 }}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Consecutive red warning */}
        {consecutiveRed >= 2 && consecutiveRed < 3 && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#fdf8ed', border: '1px solid #d4af6a', borderRadius: 12, fontSize: 12, color: '#9a7a2a' }}>
            ⚠️ {consecutiveRed} processed meals in a row — one more affects your health score.
          </div>
        )}
        {consecutiveRed >= 3 && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#fdf0f0', border: '1px solid #d08080', borderRadius: 12, fontSize: 12, color: '#a04040' }}>
            🔴 3+ processed meals in a row — small health dip applied. A nourishing meal resets the streak.
          </div>
        )}
      </div>

      {/* ── Daily summary ─────────────────────────────────────────────────── */}
      {(selectedCategories.length > 0 || Object.keys(meals).length > 0) && (
        <div style={{ background: 'linear-gradient(135deg, #f0f7f0, #e8f0e8)', border: '1px solid #b5ceb5', borderRadius: 20, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#5a7a5a', marginBottom: 10 }}>
            Today&apos;s snapshot
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: selectedCategories.length > 0 ? 10 : 0 }}>
            {selectedCategories.map(key => {
              const cat = FOOD_CATEGORIES.find(c => c.key === key);
              if (!cat) return null;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'white', border: '1px solid #b5ceb5', borderRadius: 99, fontSize: 11 }}>
                  <span>{cat.emoji}</span>
                  <span style={{ color: '#3a6a3a', fontWeight: 500 }}>{cat.name}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {MEAL_SLOTS.filter(s => meals[s.key]).map(slot => {
              const q = QUALITY_OPTIONS.find(o => o.key === meals[slot.key]);
              if (!q) return null;
              return (
                <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'white', border: `1px solid ${q.border}`, borderRadius: 99, fontSize: 11 }}>
                  <span>{slot.emoji}</span>
                  <span style={{ color: q.color, fontWeight: 500 }}>{slot.label}: {q.emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
