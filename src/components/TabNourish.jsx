'use client';

// ─────────────────────────────────────────────────────────────────────────────
// TabNourish.jsx  (v2)
// Drop into: src/components/TabNourish.jsx
//
// Same props as before — userId, coins, setStats, toast — fully drop-in.
//
// What's new vs v1:
//   • Tiered logging: category → specific food (from your Notion pantry, with
//     a built-in common-foods fallback so it works before Make is wired) →
//     serving size → nutrition bar-graph reveal (USDA, via lib/nutrition.ts)
//   • In Season Now shelf — region-based (seasonalProduce.ts), fully
//     independent of Notion; region auto-detected, overridable inline
//   • Today's Coverage — full-day nutrient estimate aggregated across every
//     food logged today (opportunity-framed, never "deficient")
//   • Recipe Suggestions (from `recipes`, matched against what's in season)
//   • Shopping List (simple, local, add-from-recipe)
//
// UNCHANGED from v1 (verbatim logic, just relocated lower in the page):
//   • Meal Quality (🌱/🟡/🔴/⏭) — same coin award + 3-red health decay trigger
//
// Storage:
//   'bloom-nourish'       — { [date]: { categories: [], meals: {} } }  (UNCHANGED
//                            shape — TabCompanion's hunger meter reads this)
//   'bloom-nourish-foods' — { [date]: [{ id, name, category, grams, nutrients }] }
//                            (NEW — powers the full-day coverage estimate)
//   'bloom-shopping-list' — [{ id, name, checked }]
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  getPantryFoods, getFoodNutrients, getRecipeSuggestions,
  aggregateDayCoverage, groupByCategory, currentMonthName,
  getInSeasonFoods, regionLabel, detectRegionFromTimezone, REGIONS,
  NUTRIENT_FOOD_SUGGESTIONS,
} from '../lib/nutrition';
import { resolveServing, servingText, qtyLabel, QTY_STEPS } from '../lib/servingSizes';

// ─── FOOD CATEGORIES (unchanged from v1 — drives tiered logging + macro tags) ─
const FOOD_CATEGORIES = [
  { key: 'meat_fish_eggs', emoji: '🥩', name: 'Meat, Fish & Eggs',   macros: ['protein'] },
  { key: 'oily_fish',      emoji: '🐟', name: 'Oily Fish',           macros: ['protein', 'healthy_fats'] },
  { key: 'dairy',          emoji: '🥛', name: 'Dairy & Alternatives',macros: ['protein', 'healthy_fats'] },
  { key: 'legumes',        emoji: '🫘', name: 'Legumes',             macros: ['protein', 'complex_carbs'] },
  { key: 'nuts_seeds',     emoji: '🌰', name: 'Nuts & Seeds',        macros: ['healthy_fats', 'protein'] },
  { key: 'healthy_fats',   emoji: '🥑', name: 'Healthy Fats',        macros: ['healthy_fats'] },
  { key: 'grains_starchy', emoji: '🌾', name: 'Grains & Starchy Carbs', macros: ['complex_carbs'] },
  { key: 'cruciferous',    emoji: '🥦', name: 'Cruciferous Veg',     macros: ['complex_carbs'] },
  { key: 'root_veg',       emoji: '🥕', name: 'Root Veg',            macros: ['complex_carbs'] },
  { key: 'leafy_greens',   emoji: '🌿', name: 'Leafy Greens',        macros: ['diversity'] },
  { key: 'fruit',          emoji: '🍓', name: 'Fruit',               macros: ['complex_carbs'] },
  { key: 'fermented',      emoji: '🫙', name: 'Fermented Foods',     macros: ['diversity'] },
  { key: 'mushrooms',      emoji: '🍄', name: 'Mushrooms & Fungi',   macros: ['diversity'] },
  { key: 'hydration',      emoji: '💧', name: 'Hydration',           macros: ['diversity'] },
];

// Built-in common foods per category — used only where your Notion pantry
// hasn't synced a food for that category yet, so logging works day one.
// Once Make syncs pantry_foods, real entries take priority automatically.
const FALLBACK_FOODS = {
  meat_fish_eggs: ['Chicken breast', 'Eggs', 'Salmon', 'Tuna', 'Ground beef'],
  oily_fish:      ['Salmon', 'Mackerel', 'Sardines', 'Herring'],
  dairy:          ['Greek yoghurt', 'Kefir', 'Cheddar cheese', 'Cottage cheese', 'Milk'],
  legumes:        ['Lentils', 'Chickpeas', 'Black beans', 'Edamame', 'Kidney beans'],
  nuts_seeds:     ['Almonds', 'Walnuts', 'Chia seeds', 'Flaxseed', 'Pumpkin seeds'],
  healthy_fats:   ['Avocado', 'Olive oil', 'Coconut oil'],
  grains_starchy: ['Rice', 'Quinoa', 'Potato', 'Sweet potato', 'Oats', 'Whole grain bread'],
  cruciferous:    ['Broccoli', 'Cauliflower', 'Kale', 'Brussels sprouts'],
  root_veg:       ['Carrot', 'Beetroot', 'Parsnip', 'Celeriac'],
  leafy_greens:   ['Spinach', 'Rocket', 'Swiss chard', 'Watercress'],
  fruit:          ['Banana', 'Apple', 'Blueberries', 'Orange', 'Strawberries'],
  fermented:      ['Kimchi', 'Sauerkraut', 'Miso', 'Kombucha'],
  mushrooms:      ['Shiitake mushrooms', 'Portobello mushrooms', 'Oyster mushrooms'],
  hydration:      ['Water', 'Herbal tea', 'Coconut water'],
};

// ─── MACRO DEFINITIONS (unchanged) ───────────────────────────────────────────
const MACROS = [
  { key: 'protein',      label: 'Protein',       emoji: '💪', color: '#c4880a', bg: '#fdf8ed', border: '#d4af6a' },
  { key: 'healthy_fats', label: 'Healthy Fats',  emoji: '🥑', color: '#5a7a5a', bg: '#f0f7f0', border: '#8aad8a' },
  { key: 'complex_carbs',label: 'Complex Carbs', emoji: '🌾', color: '#7a6a9e', bg: '#f3f0f8', border: '#b0a0d0' },
  { key: 'diversity',    label: 'Diversity',     emoji: '🌈', color: '#c47a5a', bg: '#fdf3ed', border: '#d4a882' },
];

// ─── MEAL QUALITY (unchanged) ────────────────────────────────────────────────
const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙' },
];

// Meal options for tiered food logging — includes snack, since a food can be
// logged outside the three formal meals and still count toward variety.
const LOG_MEAL_OPTIONS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { key: 'snack',     label: 'Snack',     emoji: '🍎' },
];

function guessMeal() {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

const QUALITY_OPTIONS = [
  { key: 'whole',     emoji: '🌱', label: 'Whole & fresh',      color: '#5a7a5a', bg: '#f0f7f0', border: '#8aad8a', coins: 10 },
  { key: 'mixed',     emoji: '🟡', label: 'Mixed',               color: '#9a8a3a', bg: '#fdf8e0', border: '#c8b850', coins: 0  },
  { key: 'processed', emoji: '🔴', label: 'Processed / takeout', color: '#a04040', bg: '#fdf0f0', border: '#d08080', coins: 0  },
  { key: 'skipped',   emoji: '⏭', label: 'Skipped',             color: '#aaa',    bg: '#f7f7f7', border: '#ddd',    coins: 0  },
];

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'bloom-nourish';        // unchanged shape (TabCompanion reads this)
const FOODS_KEY = 'bloom-nourish-foods';    // new — specific logged foods per day
const SHOPPING_KEY = 'bloom-shopping-list';

function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}
function getTodayKey() { return new Date().toISOString().split('T')[0]; }
function getYesterdayKey() { return new Date(Date.now() - 86400000).toISOString().split('T')[0]; }

function countConsecutiveRed(allData, todayKey) {
  const days = [todayKey, getYesterdayKey()];
  const mealOrder = ['dinner', 'lunch', 'breakfast'];
  const flatRatings = [];
  for (const day of days) {
    const meals = (allData[day] || {}).meals || {};
    for (const slot of mealOrder) {
      if (meals[slot] && meals[slot] !== 'skipped') flatRatings.push(meals[slot]);
    }
  }
  let count = 0;
  for (const rating of flatRatings) { if (rating === 'processed') count++; else break; }
  return count;
}

const CARD = { background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 20 };
const LABEL = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 14 };

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function TabNourish({ userId, coins, setStats, toast }) {
  const today = getTodayKey();
  const allData = loadJSON(STORAGE_KEY, {});
  const todayData = allData[today] || { categories: [], meals: {} };

  const [selectedCategories, setSelectedCategories] = useState(todayData.categories || []);
  const [meals, setMeals] = useState(todayData.meals || {});

  // ── Tiered logging state ───────────────────────────────────────────────────
  const [pantry, setPantry] = useState([]);          // synced Notion pantry (may be empty pre-Make)
  const [recipes, setRecipes] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  // Region — drives the seasonal shelf, independent of Notion.
  const region = useStore(s => s.region);
  const setRegion = useStore(s => s.setRegion);

  const allFoods = loadJSON(FOODS_KEY, {});
  const [todayFoods, setTodayFoods] = useState(allFoods[today] || []);

  const [pickCategory, setPickCategory] = useState(null); // category key currently expanded
  const [search, setSearch] = useState('');
  const [pendingFood, setPendingFood] = useState(null);   // { name, category, defaultGrams }
  const [qty, setQty] = useState(1); // multiplier against the resolved natural serving
  const [mealSlot, setMealSlot] = useState('breakfast'); // which meal this food belongs to
  const [fetchingNutrients, setFetchingNutrients] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState(null); // id of logged food showing its bars
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);

  const [shoppingList, setShoppingList] = useState(() => loadJSON(SHOPPING_KEY, []));

  // Auto-detect region once, zero-permission (browser timezone) — overridable below.
  useEffect(() => {
    if (region) return;
    const detected = detectRegionFromTimezone();
    setRegion(detected);
    if (userId) { try { supabase.from('users').update({ region: detected }).eq('id', userId); } catch {} }
  }, [region]);

  const activeRegion = region || 'NL_EU';
  const inSeason = getInSeasonFoods(activeRegion); // sync, static — no fetch needed

  async function changeRegion(code) {
    setRegion(code);
    setRegionPickerOpen(false);
    if (userId) { try { await supabase.from('users').update({ region: code }).eq('id', userId); } catch {} }
  }

  useEffect(() => {
    (async () => {
      setLoadingLibrary(true);
      const [p, r] = await Promise.all([getPantryFoods(), getRecipeSuggestions(activeRegion, 4)]);
      setPantry(p); setRecipes(r); setLoadingLibrary(false);
    })();
  }, [activeRegion]);

  // Persist legacy shape (categories/meals) — unchanged, keeps TabCompanion in sync
  useEffect(() => {
    saveJSON(STORAGE_KEY, { ...allData, [today]: { categories: selectedCategories, meals } });
  }, [selectedCategories, meals]);

  // Persist the new specific-food log
  useEffect(() => {
    saveJSON(FOODS_KEY, { ...allFoods, [today]: todayFoods });
  }, [todayFoods]);

  useEffect(() => { saveJSON(SHOPPING_KEY, shoppingList); }, [shoppingList]);

  // ── Macro coverage — now requires 2+ distinct meals per food group ──────────
  // A single tap used to be enough to mark a group "covered." That rewarded a
  // token gesture as much as a real pattern. Now a group counts only once it's
  // shown up across at least two separate meals today (needs the per-food
  // `meal` tag captured at logging time — see beginLog/confirmLog below).
  function getMacroCoverage() {
    const mealsByMacro = {};
    for (const macro of MACROS) mealsByMacro[macro.key] = new Set();
    for (const food of todayFoods) {
      if (!food.category || !food.meal) continue;
      const cat = FOOD_CATEGORIES.find(c => c.key === food.category);
      if (!cat) continue;
      for (const m of cat.macros) mealsByMacro[m].add(food.meal);
    }
    const covered = {};
    for (const macro of MACROS) covered[macro.key] = mealsByMacro[macro.key].size >= 2;
    return covered;
  }
  const macroCoverage = getMacroCoverage();
  const coveredCount = Object.values(macroCoverage).filter(Boolean).length;
  const allCovered = coveredCount === MACROS.length;

  // ── Full-day nutrient coverage (new — general estimate) ────────────────────
  const dayCoverage = aggregateDayCoverage(todayFoods);

  // ── Tiered logging: pick food → serving → log ──────────────────────────────
  const pantryByCategory = groupByCategory(pantry.filter(f => f.name));

  function foodsForCategory(catKey) {
    const real = (pantryByCategory[catKey] || []).map(f => ({ name: f.name, pantryGrams: f.serving_grams, pantryLabel: f.serving_other }));
    if (real.length > 0) return real;
    return (FALLBACK_FOODS[catKey] || []).map(name => ({ name }));
  }

  const searchResults = search.trim().length > 0
    ? pantry.filter(f => f.name.toLowerCase().includes(search.trim().toLowerCase())).map(f => ({ name: f.name, pantryGrams: f.serving_grams, pantryLabel: f.serving_other }))
    : null;

  function beginLog(food, categoryKey) {
    const serving = resolveServing(food.name, { grams: food.pantryGrams, label: food.pantryLabel });
    setPendingFood({ name: food.name, category: categoryKey, serving });
    setQty(1);
    setMealSlot(guessMeal());
  }

  async function confirmLog() {
    if (!pendingFood) return;
    setFetchingNutrients(true);
    const grams = Math.round(pendingFood.serving.grams * qty);
    const result = await getFoodNutrients(pendingFood.name, grams);
    setFetchingNutrients(false);

    const entry = {
      id: `${Date.now()}`,
      name: pendingFood.name,
      category: pendingFood.category,
      meal: mealSlot,
      grams,
      servingLabel: servingText(pendingFood.serving, qty),
      nutrients: result?.nutrients || [],
      source: result?.source || 'none',
    };
    setTodayFoods(prev => [...prev, entry]);

    // Keep legacy category coverage in sync (also drives TabCompanion hunger meter)
    if (pendingFood.category && !selectedCategories.includes(pendingFood.category)) {
      setSelectedCategories(prev => [...prev, pendingFood.category]);
    }

    toast(`🍽️ ${pendingFood.name} logged`);
    setExpandedEntry(entry.id);
    setPendingFood(null);
    setSearch('');
    setPickCategory(null);
  }

  function removeFood(id) {
    setTodayFoods(prev => prev.filter(f => f.id !== id));
  }

  // ── Meal quality (unchanged) ────────────────────────────────────────────────
  async function logMeal(slot, quality) {
    const prev = meals[slot];
    const updated = { ...meals, [slot]: quality };
    setMeals(updated);

    const opt = QUALITY_OPTIONS.find(o => o.key === quality);
    if (opt?.coins > 0 && prev !== quality) {
      const nc = coins + opt.coins;
      if (userId) { try { await supabase.from('user_stats').update({ coins: nc }).eq('user_id', userId); } catch {} }
      setStats({ coins: nc });
      toast(`🌱 +${opt.coins} 🪙 wholesome meal logged!`);
    }

    const allUpdated = { ...allData, [today]: { categories: selectedCategories, meals: updated } };
    const consecutive = countConsecutiveRed(allUpdated, today);
    if (consecutive >= 3) {
      const alreadyTriggered = allUpdated[today]?.redDecayTriggered;
      if (!alreadyTriggered) {
        allUpdated[today].redDecayTriggered = true;
        saveJSON(STORAGE_KEY, allUpdated);
        const currentHealth = useStore.getState?.().health ?? 50;
        const newHealth = Math.max(10, currentHealth - 3);
        if (userId) { try { await supabase.from('user_stats').update({ health: newHealth }).eq('user_id', userId); } catch {} }
        setStats({ health: newHealth });
        toast('🔴 3 processed meals in a row — small health dip (-3 ❤️)');
      }
    }
  }
  const consecutiveRed = countConsecutiveRed({ ...allData, [today]: { categories: selectedCategories, meals } }, today);

  // ── Shopping list ───────────────────────────────────────────────────────────
  function addRecipeToShoppingList(recipe) {
    const loggedNames = new Set(todayFoods.map(f => f.name.toLowerCase()));
    const missing = (recipe.ingredient_names || []).filter(ing => !loggedNames.has(ing.toLowerCase()));
    if (missing.length === 0) { toast('You already have everything logged today 🌿'); return; }
    setShoppingList(prev => {
      const existing = new Set(prev.map(i => i.name.toLowerCase()));
      const additions = missing.filter(m => !existing.has(m.toLowerCase())).map(m => ({ id: `${Date.now()}-${m}`, name: m, checked: false }));
      return [...prev, ...additions];
    });
    toast(`🛒 Added ${missing.length} item${missing.length > 1 ? 's' : ''} to your shopping list`);
  }
  function toggleShoppingItem(id) {
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }
  function clearCheckedItems() {
    setShoppingList(prev => prev.filter(i => !i.checked));
  }

  return (
    <div style={{ padding: '22px 26px', maxWidth: 800, fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, fontWeight: 400, color: '#1a1a16', marginBottom: 4 }}>Nourish 🥗</h2>
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>Log what you ate today — a handful, a cup, an egg. No macros to track, no guilt.</p>
      </div>

      {/* ── In Season Now — region-based, independent of Notion ────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ ...LABEL, marginBottom: 3 }}>In Season Now · {currentMonthName()}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{regionLabel(activeRegion)}</div>
          </div>
          <button onClick={() => setRegionPickerOpen(o => !o)}
            style={{ fontSize: 11, color: '#5a7a5a', background: '#f0f7f0', border: '1px solid #b5ceb5', borderRadius: 99, padding: '5px 11px', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, flexShrink: 0 }}>
            📍 Change
          </button>
        </div>

        {regionPickerOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {REGIONS.map(r => (
              <button key={r.code} onClick={() => changeRegion(r.code)}
                style={{ padding: '7px 12px', borderRadius: 99, border: `1.5px solid ${activeRegion === r.code ? '#8aad8a' : '#e8e4de'}`, background: activeRegion === r.code ? '#f0f7f0' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: activeRegion === r.code ? '#3a6a3a' : '#555', fontFamily: 'DM Sans,sans-serif' }}>
                {r.label}
              </button>
            ))}
          </div>
        )}

        {inSeason.length === 0 ? (
          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>Nothing on the seasonal calendar for this region yet.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {inSeason.map(f => (
              <button key={f.name} onClick={() => beginLog({ name: f.name, serving: 100 }, f.category)}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f0f7f0', border: '1.5px solid #b5ceb5', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#3a6a3a', fontFamily: 'DM Sans,sans-serif' }}>
                🌱 {f.name}
              </button>
            ))}
          </div>
        )}
        <p style={{ fontSize: 10, color: '#ccc', marginTop: 10, marginBottom: 0 }}>General regional guide, not a precise local almanac.</p>
      </div>

      {/* ── Tiered Food Logging ────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={LABEL}>Log a food</div>

        {/* Search — works across all categories, falls back to custom entry */}
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPickCategory(null); }}
          placeholder="Search any food… or type your own"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e8e4de', fontSize: 13, fontFamily: 'DM Sans,sans-serif', marginBottom: 14, boxSizing: 'border-box' }}
        />

        {search.trim().length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(searchResults || []).slice(0, 8).map(f => (
              <button key={f.name} onClick={() => beginLog(f, null)}
                style={{ textAlign: 'left', padding: '10px 13px', background: 'white', border: '1.5px solid #e8e4de', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans,sans-serif' }}>
                {f.name}
              </button>
            ))}
            <button onClick={() => beginLog({ name: search.trim(), serving: 100 }, null)}
              style={{ textAlign: 'left', padding: '10px 13px', background: '#fdf8ed', border: '1.5px dashed #d4af6a', borderRadius: 12, cursor: 'pointer', fontSize: 13, color: '#9a7a2a', fontFamily: 'DM Sans,sans-serif' }}>
              ➕ Log "{search.trim()}" as a custom food
            </button>
          </div>
        ) : (
          <>
            {/* Category chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: pickCategory ? 14 : 0 }}>
              {FOOD_CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setPickCategory(pickCategory === cat.key ? null : cat.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 99, border: `1.5px solid ${pickCategory === cat.key ? '#8aad8a' : '#e8e4de'}`, background: pickCategory === cat.key ? '#f0f7f0' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: pickCategory === cat.key ? '#3a6a3a' : '#555', fontFamily: 'DM Sans,sans-serif' }}>
                  <span>{cat.emoji}</span>{cat.name}
                </button>
              ))}
            </div>

            {pickCategory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {foodsForCategory(pickCategory).map(f => (
                  <button key={f.name} onClick={() => beginLog(f, pickCategory)}
                    style={{ textAlign: 'left', padding: '10px 13px', background: 'white', border: '1.5px solid #e8e4de', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans,sans-serif' }}>
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Serving picker → confirm → nutrition reveal */}
        {pendingFood && (
          <div style={{ marginTop: 14, padding: '14px 16px', background: '#f7f3ed', border: '1.5px solid #e8c8a0', borderRadius: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{pendingFood.name}</div>
            <div style={{ fontSize: 13, color: '#9a7a2a', marginBottom: 12 }}>{servingText(pendingFood.serving, qty)}</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {QTY_STEPS.map(q => (
                <button key={q} onClick={() => setQty(q)}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: `1.5px solid ${qty === q ? '#d4af6a' : '#e8e4de'}`, background: qty === q ? '#fdf3e0' : 'white', color: qty === q ? '#9a7a2a' : '#888', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                  {qtyLabel(q)}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {LOG_MEAL_OPTIONS.map(m => (
                <button key={m.key} onClick={() => setMealSlot(m.key)}
                  style={{ flex: 1, padding: '7px 4px', borderRadius: 9, border: `1.5px solid ${mealSlot === m.key ? '#8aad8a' : '#e8e4de'}`, background: mealSlot === m.key ? '#f0f7f0' : 'white', color: mealSlot === m.key ? '#3a6a3a' : '#888', fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmLog} disabled={fetchingNutrients}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#5a7a5a', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                {fetchingNutrients ? 'Logging…' : '✓ Log it'}
              </button>
              <button onClick={() => setPendingFood(null)}
                style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e8e4de', background: 'white', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Logged today */}
        {todayFoods.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>Logged today</div>
            {todayFoods.map(f => (
              <div key={f.id} style={{ border: '1px solid #e8e4de', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px' }}>
                  <button onClick={() => setExpandedEntry(expandedEntry === f.id ? null : f.id)} style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans,sans-serif', flex: 1 }}>
                    {LOG_MEAL_OPTIONS.find(m => m.key === f.meal)?.emoji || ''} {f.name} <span style={{ color: '#aaa', fontSize: 11 }}>· {f.servingLabel || `${f.grams} g`} {f.nutrients?.length ? '· view nutrients ▾' : ''}</span>
                  </button>
                  <button onClick={() => removeFood(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 14 }}>✕</button>
                </div>
                {expandedEntry === f.id && f.nutrients?.length > 0 && (
                  <div style={{ padding: '4px 14px 14px', borderTop: '1px solid #f0ede8' }}>
                    <div style={{ fontSize: 10, color: '#aaa', margin: '8px 0' }}>Strong source of · USDA FoodData Central</div>
                    {f.nutrients.slice(0, 5).map(n => (
                      <div key={n.key} style={{ marginBottom: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}><span>{n.label}</span><span style={{ color: '#888' }}>{n.percent_dv}% DV</span></div>
                        <div style={{ height: 6, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, n.percent_dv)}%`, background: '#8aad8a', borderRadius: 99 }} /></div>
                      </div>
                    ))}
                  </div>
                )}
                {expandedEntry === f.id && (!f.nutrients || f.nutrients.length === 0) && (
                  <div style={{ padding: '4px 14px 12px', fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>No USDA match found for this food yet.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Today's Coverage — full-day estimate ───────────────────────────── */}
      <div style={CARD}>
        <div style={LABEL}>Today's Coverage</div>
        {!dayCoverage.anyData ? (
          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', textAlign: 'center', margin: '4px 0' }}>Log a few foods above to see your day take shape.</p>
        ) : (
          <>
            {/* Water-soluble vitamins — always shown, framed as needing daily management */}
            <div style={{ marginBottom: 18, padding: '12px 14px', background: '#fdf8ed', border: '1px solid #e8c8a0', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9a7a2a', marginBottom: 2 }}>Water-soluble vitamins</div>
              <div style={{ fontSize: 10.5, color: '#b8935a', marginBottom: 10, lineHeight: 1.5 }}>Your body doesn't store these — they need topping up daily, not just when they're low.</div>
              {dayCoverage.waterSoluble.map(n => (
                <div key={n.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}><span>{n.label}</span><span style={{ color: '#9a7a2a', fontWeight: 600 }}>{n.percent}% DV</span></div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.7)', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, n.percent)}%`, background: 'linear-gradient(90deg,#e8b06a,#c47a2a)', borderRadius: 99 }} /></div>
                  {n.percent < 50 && (NUTRIENT_FOOD_SUGGESTIONS[n.key] || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: '#b8935a', marginRight: 2 }}>Try:</span>
                      {NUTRIENT_FOOD_SUGGESTIONS[n.key].map(s => (
                        <button key={s.name} onClick={() => beginLog({ name: s.name }, s.category)}
                          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '1px solid #e8c8a0', background: 'white', color: '#9a7a2a', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#5a7a5a', marginBottom: 8 }}>Well covered today</div>
              {dayCoverage.covered.length === 0 ? (
                <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>Still building — keep logging.</p>
              ) : dayCoverage.covered.map(n => (
                <div key={n.key} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}><span>{n.label}</span><span style={{ color: '#5a7a5a', fontWeight: 600 }}>{n.percent}% DV</span></div>
                  <div style={{ height: 7, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, n.percent)}%`, background: 'linear-gradient(90deg,#8aad8a,#5a7a5a)', borderRadius: 99 }} /></div>
                </div>
              ))}
            </div>
            {dayCoverage.opportunities.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#c47a2a', marginBottom: 8 }}>Biggest opportunity</div>
                {dayCoverage.opportunities.map(n => (
                  <div key={n.key} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}><span>{n.label}</span><span style={{ color: '#c47a2a', fontWeight: 600 }}>{n.percent}% DV</span></div>
                    <div style={{ height: 7, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, n.percent)}%`, background: 'linear-gradient(90deg,#e8b06a,#c47a2a)', borderRadius: 99 }} /></div>
                    {(NUTRIENT_FOOD_SUGGESTIONS[n.key] || []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: '#c47a2a', marginRight: 2 }}>Try:</span>
                        {NUTRIENT_FOOD_SUGGESTIONS[n.key].map(s => (
                          <button key={s.name} onClick={() => beginLog({ name: s.name }, s.category)}
                            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '1px solid #e8c8a0', background: 'white', color: '#c47a2a', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <div style={{ marginTop: 14, fontSize: 10.5, color: '#aaa', lineHeight: 1.5, borderTop: '1px solid #f0ede8', paddingTop: 10 }}>
          General estimate from typical servings, not exact tracking — precision tracking is a future upgrade.
        </div>
      </div>

      {/* ── Category coverage snapshot (kept — quick visual, unchanged logic) ─ */}
      <div style={CARD}>
        <div style={LABEL}>Food group variety</div>
        <p style={{ fontSize: 11, color: '#bbb', marginTop: -6, marginBottom: 12 }}>Counts once a group shows up across two different meals today — one bite doesn't quite make a pattern.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {MACROS.map(macro => {
            const covered = macroCoverage[macro.key];
            return (
              <div key={macro.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', background: covered ? macro.bg : '#f7f3ed', border: `1.5px solid ${covered ? macro.border : '#e8e4de'}`, borderRadius: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: covered ? `linear-gradient(135deg, ${macro.border}, ${macro.color})` : '#e8e4de', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{covered ? '✓' : macro.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: covered ? macro.color : '#bbb', textAlign: 'center' }}>{macro.label}</div>
              </div>
            );
          })}
        </div>
        {allCovered && <div style={{ marginTop: 14, padding: '10px 14px', background: 'linear-gradient(135deg, #f0f7f0, #e8f0e8)', border: '1px solid #8aad8a', borderRadius: 12, fontSize: 12, color: '#5a7a5a', fontWeight: 600, textAlign: 'center' }}>🌟 Full coverage today — beautifully balanced!</div>}
      </div>

      {/* ── Meal Quality (UNCHANGED) ──────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={LABEL}>Meal Quality</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>🌱 earns +10 🪙</div>
        </div>
        <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, lineHeight: 1.5 }}>No judgment — just noticing. Three processed meals in a row has a small health impact.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MEAL_SLOTS.map(slot => {
            const current = meals[slot.key];
            return (
              <div key={slot.key}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><span>{slot.emoji}</span> {slot.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {QUALITY_OPTIONS.map(opt => {
                    const active = current === opt.key;
                    return (
                      <button key={opt.key} onClick={() => logMeal(slot.key, opt.key)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px', background: active ? opt.bg : 'white', border: `1.5px solid ${active ? opt.border : '#e8e4de'}`, borderRadius: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: active ? opt.color : '#bbb', textAlign: 'center' }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {consecutiveRed >= 2 && consecutiveRed < 3 && <div style={{ marginTop: 14, padding: '10px 14px', background: '#fdf8ed', border: '1px solid #d4af6a', borderRadius: 12, fontSize: 12, color: '#9a7a2a' }}>⚠️ {consecutiveRed} processed meals in a row — one more affects your health score.</div>}
        {consecutiveRed >= 3 && <div style={{ marginTop: 14, padding: '10px 14px', background: '#fdf0f0', border: '1px solid #d08080', borderRadius: 12, fontSize: 12, color: '#a04040' }}>🔴 3+ processed meals in a row — small health dip applied. A nourishing meal resets the streak.</div>}
      </div>

      {/* ── Recipe Suggestions ─────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={LABEL}>Recipe Suggestions</div>
        {loadingLibrary ? (
          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>Loading recipes…</p>
        ) : recipes.length === 0 ? (
          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>Your recipe library will appear here once it's synced from Notion.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recipes.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', border: '1.5px solid #e8e4de', borderRadius: 13 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                    {(r.meal_type || []).join(', ')}{r.cook_time_minutes ? ` · ${r.cook_time_minutes} min` : ''}
                  </div>
                </div>
                <button onClick={() => addRecipeToShoppingList(r)}
                  style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#5a7a5a', background: '#f0f7f0', border: '1px solid #b5ceb5', borderRadius: 99, padding: '6px 12px', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                  🛒 Add missing
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Shopping List ──────────────────────────────────────────────────── */}
      {shoppingList.length > 0 && (
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={LABEL}>Shopping List</div>
            <button onClick={clearCheckedItems} style={{ background: 'none', border: 'none', fontSize: 11, color: '#aaa', cursor: 'pointer' }}>Clear checked</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {shoppingList.map(item => (
              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #e8e4de', borderRadius: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={item.checked} onChange={() => toggleShoppingItem(item.id)} />
                <span style={{ fontSize: 13, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? '#bbb' : '#333' }}>{item.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
