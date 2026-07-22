'use client';

// TabNourish.jsx  v3
// Logging flow: meal type → quality → what you ate (multi-select) → nutrients
// Recipe cards: show ingredient_amounts (name + amount), USDA coverage fixed

import { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  getPantryFoods, getFoodNutrients, getRecipeSuggestions,
  aggregateDayCoverage, groupByCategory, currentMonthName,
  getInSeasonFoods, regionLabel, detectRegionFromTimezone, REGIONS,
  NUTRIENT_FOOD_SUGGESTIONS,
} from '../lib/nutrition';
import { resolveServing, servingText, qtyLabel, QTY_STEPS } from '../lib/servingSizes';

// ── Food categories (unchanged) ─────────────────────────────────────────────
const FOOD_CATEGORIES = [
  { key: 'meat_fish_eggs', emoji: '🥩', name: 'Meat, Fish & Eggs',      macros: ['protein'] },
  { key: 'oily_fish',      emoji: '🐟', name: 'Oily Fish',              macros: ['protein', 'healthy_fats'] },
  { key: 'dairy',          emoji: '🥛', name: 'Dairy & Alternatives',   macros: ['protein', 'healthy_fats'] },
  { key: 'legumes',        emoji: '🫘', name: 'Legumes',                macros: ['protein', 'complex_carbs'] },
  { key: 'nuts_seeds',     emoji: '🌰', name: 'Nuts & Seeds',           macros: ['healthy_fats', 'protein'] },
  { key: 'healthy_fats',   emoji: '🥑', name: 'Healthy Fats',           macros: ['healthy_fats'] },
  { key: 'grains_starchy', emoji: '🌾', name: 'Grains & Starchy Carbs', macros: ['complex_carbs'] },
  { key: 'cruciferous',    emoji: '🥦', name: 'Cruciferous Veg',        macros: ['complex_carbs'] },
  { key: 'root_veg',       emoji: '🥕', name: 'Root Veg',               macros: ['complex_carbs'] },
  { key: 'leafy_greens',   emoji: '🌿', name: 'Leafy Greens',           macros: ['diversity'] },
  { key: 'fruit',          emoji: '🍓', name: 'Fruit',                  macros: ['complex_carbs'] },
  { key: 'fermented',      emoji: '🫙', name: 'Fermented Foods',        macros: ['diversity'] },
  { key: 'mushrooms',      emoji: '🍄', name: 'Mushrooms & Fungi',      macros: ['diversity'] },
  { key: 'hydration',      emoji: '💧', name: 'Hydration',              macros: ['diversity'] },
];

const FALLBACK_FOODS = {
  meat_fish_eggs: ['Chicken breast','Eggs','Salmon','Tuna','Ground beef'],
  oily_fish:      ['Salmon','Mackerel','Sardines','Herring'],
  dairy:          ['Greek yoghurt','Kefir','Cheddar cheese','Cottage cheese','Milk'],
  legumes:        ['Lentils','Chickpeas','Black beans','Edamame','Kidney beans'],
  nuts_seeds:     ['Almonds','Walnuts','Chia seeds','Flaxseed','Pumpkin seeds'],
  healthy_fats:   ['Avocado','Olive oil','Coconut oil'],
  grains_starchy: ['Rice','Quinoa','Potato','Sweet potato','Oats','Whole grain bread'],
  cruciferous:    ['Broccoli','Cauliflower','Kale','Brussels sprouts'],
  root_veg:       ['Carrot','Beetroot','Parsnip','Celeriac'],
  leafy_greens:   ['Spinach','Rocket','Swiss chard','Watercress'],
  fruit:          ['Banana','Apple','Blueberries','Orange','Strawberries'],
  fermented:      ['Kimchi','Sauerkraut','Miso','Kombucha'],
  mushrooms:      ['Shiitake mushrooms','Portobello mushrooms','Oyster mushrooms'],
  hydration:      ['Water','Herbal tea','Coconut water'],
};

const MACROS = [
  { key: 'protein',       label: 'Protein',       emoji: '💪', color: '#c4880a', bg: '#fdf8ed', border: '#d4af6a' },
  { key: 'healthy_fats',  label: 'Healthy Fats',  emoji: '🥑', color: '#5a7a5a', bg: '#f0f7f0', border: '#8aad8a' },
  { key: 'complex_carbs', label: 'Complex Carbs', emoji: '🌾', color: '#7a6a9e', bg: '#f3f0f8', border: '#b0a0d0' },
  { key: 'diversity',     label: 'Diversity',     emoji: '🌈', color: '#c47a5a', bg: '#fdf3ed', border: '#d4a882' },
];

const LOG_MEAL_OPTIONS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { key: 'snack',     label: 'Snack',     emoji: '🍎' },
];

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙' },
];

const QUALITY_OPTIONS = [
  { key: 'whole',     emoji: '🌱', label: 'Whole & fresh',      color: '#5a7a5a', bg: '#f0f7f0', border: '#8aad8a', coins: 10 },
  { key: 'mixed',     emoji: '🟡', label: 'Mixed',               color: '#9a8a3a', bg: '#fdf8e0', border: '#c8b850', coins: 0  },
  { key: 'processed', emoji: '🔴', label: 'Processed',           color: '#a04040', bg: '#fdf0f0', border: '#d08080', coins: 0  },
  { key: 'skipped',   emoji: '⏭',  label: 'Skipped',            color: '#aaa',    bg: '#f7f7f7', border: '#ddd',    coins: 0  },
];

const STORAGE_KEY  = 'bloom-nourish';
const FOODS_KEY    = 'bloom-nourish-foods';
const SHOPPING_KEY = 'bloom-shopping-list';

function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }
function getTodayKey() { return new Date().toISOString().split('T')[0]; }
function getYesterdayKey() { return new Date(Date.now() - 86400000).toISOString().split('T')[0]; }
function guessMeal() {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

function countConsecutiveRed(allData, todayKey) {
  const days = [todayKey, getYesterdayKey()];
  const mealOrder = ['dinner','lunch','breakfast'];
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

const CARD  = { background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 20 };
const LABEL = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 14 };

// ── Log flow steps ───────────────────────────────────────────────────────────
// STEP 1: meal type  (breakfast / lunch / dinner / snack)
// STEP 2: quality    (whole / mixed / processed / skipped)
// STEP 3: what       (multi-select foods → optional per-food serving adjust)
// STEP 4: nutrients  (shown inline after logging, in Today's Coverage)

function StepDot({ n, active, done }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      background: done ? '#8aad8a' : active ? '#5a7a5a' : '#e8e4de',
      color: done || active ? 'white' : '#aaa',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700,
    }}>{done ? '✓' : n}</div>
  );
}

export default function TabNourish({ userId, coins, setStats, toast }) {
  const today = getTodayKey();
  const allData = loadJSON(STORAGE_KEY, {});
  const todayData = allData[today] || { categories: [], meals: {} };

  const [selectedCategories, setSelectedCategories] = useState(todayData.categories || []);
  const [meals, setMeals] = useState(todayData.meals || {});

  const [pantry, setPantry]                 = useState([]);
  const [recipes, setRecipes]               = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  const region    = useStore(s => s.region);
  const setRegion = useStore(s => s.setRegion);

  const allFoodsStore = loadJSON(FOODS_KEY, {});
  const [todayFoods, setTodayFoods]       = useState(allFoodsStore[today] || []);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [expandedRecipe, setExpandedRecipe]   = useState(null);
  const [recipeCoverage, setRecipeCoverage]   = useState({});
  const [loadingCoverage, setLoadingCoverage] = useState(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [shoppingList, setShoppingList] = useState(() => loadJSON(SHOPPING_KEY, []));

  // ── New log flow state ───────────────────────────────────────────────────
  // null = no log in progress; 'meal'|'quality'|'foods'|'serving' = active step
  const [logStep, setLogStep]           = useState(null);
  const [logMealSlot, setLogMealSlot]   = useState(guessMeal());
  const [logQuality, setLogQuality]     = useState(null);
  // Multi-select: array of { name, category, serving }
  const [selected, setSelected]         = useState([]);
  // Food picker within step 3
  const [pickCategory, setPickCategory] = useState(null);
  const [search, setSearch]             = useState('');
  // Per-food serving adjustment in step 3
  const [servingEditing, setServingEditing] = useState(null); // { name, serving, qty } or null
  const [fetchingNutrients, setFetchingNutrients] = useState(false);

  const searchRef = useRef(null);

  useEffect(() => { if (logStep === 'foods') searchRef.current?.focus(); }, [logStep]);

  useEffect(() => {
    if (region) return;
    const detected = detectRegionFromTimezone();
    setRegion(detected);
    if (userId) { try { supabase.from('users').update({ region: detected }).eq('id', userId); } catch {} }
  }, [region]);

  const activeRegion = region || 'NL_EU';
  const inSeason = getInSeasonFoods(activeRegion);

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

  useEffect(() => {
    saveJSON(STORAGE_KEY, { ...allData, [today]: { categories: selectedCategories, meals } });
  }, [selectedCategories, meals]);

  useEffect(() => {
    saveJSON(FOODS_KEY, { ...allFoodsStore, [today]: todayFoods });
  }, [todayFoods]);

  useEffect(() => { saveJSON(SHOPPING_KEY, shoppingList); }, [shoppingList]);

  // ── Macro coverage ───────────────────────────────────────────────────────
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
  const coveredCount  = Object.values(macroCoverage).filter(Boolean).length;
  const allCovered    = coveredCount === MACROS.length;
  const dayCoverage   = aggregateDayCoverage(todayFoods);

  // ── Pantry helpers ───────────────────────────────────────────────────────
  const pantryByCategory = groupByCategory(pantry.filter(f => f.name));
  function foodsForCategory(catKey) {
    const real = (pantryByCategory[catKey] || []).map(f => ({ name: f.name, pantryGrams: f.serving_grams, pantryLabel: f.serving_other }));
    if (real.length > 0) return real;
    return (FALLBACK_FOODS[catKey] || []).map(name => ({ name }));
  }
  const searchResults = search.trim().length > 0
    ? pantry.filter(f => f.name.toLowerCase().includes(search.trim().toLowerCase()))
        .map(f => ({ name: f.name, pantryGrams: f.serving_grams, pantryLabel: f.serving_other }))
    : null;

  // ── Log flow actions ─────────────────────────────────────────────────────
  function startLog() {
    setLogStep('meal');
    setLogMealSlot(guessMeal());
    setLogQuality(null);
    setSelected([]);
    setPickCategory(null);
    setSearch('');
    setServingEditing(null);
  }

  function cancelLog() {
    setLogStep(null);
    setSelected([]);
    setServingEditing(null);
    setSearch('');
    setPickCategory(null);
  }

  function pickMeal(key) {
    setLogMealSlot(key);
    setLogStep('quality');
  }

  async function pickQuality(opt) {
    // Award coins for whole meal
    if (opt.coins > 0 && meals[logMealSlot] !== opt.key) {
      const nc = coins + opt.coins;
      if (userId) { try { await supabase.from('user_stats').update({ coins: nc }).eq('user_id', userId); } catch {} }
      setStats({ coins: nc });
      toast(`🌱 +${opt.coins} 🪙 wholesome meal!`);
    }
    // Update meal quality log
    const updatedMeals = { ...meals, [logMealSlot]: opt.key };
    setMeals(updatedMeals);
    // Check processed streak
    const allUpdated = { ...allData, [today]: { categories: selectedCategories, meals: updatedMeals } };
    const consecutive = countConsecutiveRed(allUpdated, today);
    if (consecutive >= 3 && !allUpdated[today]?.redDecayTriggered) {
      allUpdated[today].redDecayTriggered = true;
      saveJSON(STORAGE_KEY, allUpdated);
      const currentHealth = useStore.getState?.().health ?? 50;
      const newHealth = Math.max(10, currentHealth - 3);
      if (userId) { try { await supabase.from('user_stats').update({ health: newHealth }).eq('user_id', userId); } catch {} }
      setStats({ health: newHealth });
      toast('🔴 3 processed meals in a row — small health dip (-3 ❤️)');
    }

    setLogQuality(opt.key);
    // Skipped = nothing to log, close flow
    if (opt.key === 'skipped') { setLogStep(null); toast(`⏭ ${logMealSlot} skipped`); return; }
    setLogStep('foods');
  }

  function toggleFoodSelection(food, catKey) {
    const existing = selected.find(s => s.name === food.name);
    if (existing) {
      setSelected(prev => prev.filter(s => s.name !== food.name));
    } else {
      const serving = resolveServing(food.name, { grams: food.pantryGrams, label: food.pantryLabel });
      setSelected(prev => [...prev, { name: food.name, category: catKey, serving, qty: 1 }]);
    }
  }

  function addCustomFood(name) {
    if (!name.trim()) return;
    const serving = resolveServing(name.trim(), {});
    setSelected(prev => [...prev, { name: name.trim(), category: null, serving, qty: 1 }]);
    setSearch('');
  }

  function updateQty(foodName, qty) {
    setSelected(prev => prev.map(s => s.name === foodName ? { ...s, qty } : s));
  }

  async function confirmLog() {
    if (selected.length === 0) { toast('Pick at least one food first'); return; }
    setFetchingNutrients(true);
    const newEntries = [];
    for (const sel of selected) {
      const grams = Math.round(sel.serving.grams * sel.qty);
      const result = await getFoodNutrients(sel.name, grams);
      newEntries.push({
        id: `${Date.now()}-${sel.name}`,
        name: sel.name,
        category: sel.category,
        meal: logMealSlot,
        grams,
        servingLabel: servingText(sel.serving, sel.qty),
        nutrients: result?.nutrients || [],
        source: result?.source || 'none',
      });
    }
    setFetchingNutrients(false);
    setTodayFoods(prev => [...prev, ...newEntries]);
    // Update category coverage
    const newCats = newEntries.map(e => e.category).filter(Boolean);
    setSelectedCategories(prev => [...new Set([...prev, ...newCats])]);
    // Expand first entry's nutrients
    if (newEntries.length > 0) setExpandedEntry(newEntries[0].id);
    toast(`🍽️ ${newEntries.length} food${newEntries.length > 1 ? 's' : ''} logged`);
    cancelLog();
  }

  function editFood(entry) {
    // Edit: re-open as single-food selection in step foods
    const serving = resolveServing(entry.name, {});
    const ratio = entry.grams / (serving.grams || entry.grams || 1);
    const nearestQty = QTY_STEPS.reduce((best, q) => (Math.abs(q - ratio) < Math.abs(best - ratio) ? q : best), QTY_STEPS[0]);
    setLogMealSlot(entry.meal || guessMeal());
    setLogQuality(null);
    setSelected([{ name: entry.name, category: entry.category, serving, qty: nearestQty }]);
    setLogStep('foods');
    // Remove old entry
    setTodayFoods(prev => prev.filter(f => f.id !== entry.id));
    if (expandedEntry === entry.id) setExpandedEntry(null);
  }

  function removeFood(id) {
    setTodayFoods(prev => prev.filter(f => f.id !== id));
    if (expandedEntry === id) setExpandedEntry(null);
  }

  // ── Meal quality (legacy — kept for the separate quality card below) ──────
  async function logMealQualityDirect(slot, quality) {
    const prev = meals[slot];
    const updated = { ...meals, [slot]: quality };
    setMeals(updated);
    const opt = QUALITY_OPTIONS.find(o => o.key === quality);
    if (opt?.coins > 0 && prev !== quality) {
      const nc = coins + opt.coins;
      if (userId) { try { await supabase.from('user_stats').update({ coins: nc }).eq('user_id', userId); } catch {} }
      setStats({ coins: nc });
      toast(`🌱 +${opt.coins} 🪙 wholesome meal!`);
    }
    const allUpdated = { ...allData, [today]: { categories: selectedCategories, meals: updated } };
    const consecutive = countConsecutiveRed(allUpdated, today);
    if (consecutive >= 3 && !allUpdated[today]?.redDecayTriggered) {
      allUpdated[today].redDecayTriggered = true;
      saveJSON(STORAGE_KEY, allUpdated);
      const currentHealth = useStore.getState?.().health ?? 50;
      const newHealth = Math.max(10, currentHealth - 3);
      if (userId) { try { await supabase.from('user_stats').update({ health: newHealth }).eq('user_id', userId); } catch {} }
      setStats({ health: newHealth });
      toast('🔴 3 processed meals in a row — small health dip (-3 ❤️)');
    }
  }
  const consecutiveRed = countConsecutiveRed({ ...allData, [today]: { categories: selectedCategories, meals } }, today);

  // ── Recipe coverage ──────────────────────────────────────────────────────
  async function computeRecipeCoverage(recipe) {
    if (recipeCoverage[recipe.id] || loadingCoverage === recipe.id) return;
    setLoadingCoverage(recipe.id);

    // Use ingredient_amounts if available (new schema), fall back to ingredient_names
    const ingredientList = (recipe.ingredient_amounts && recipe.ingredient_amounts.length > 0)
      ? recipe.ingredient_amounts.map(i => ({ name: i.name || i, amount: i.amount || null }))
      : (recipe.ingredient_names || []).map(name => ({ name, amount: null }));

    const entries = [];
    for (const ing of ingredientList) {
      if (!ing.name) continue;
      // Use default serving — Tier 1 estimate
      const serving = resolveServing(ing.name, {});
      const result = await getFoodNutrients(ing.name, serving.grams);
      if (result?.nutrients?.length) entries.push({ nutrients: result.nutrients });
    }

    if (entries.length === 0) {
      // Mark as attempted but no data — prevents infinite retry
      setRecipeCoverage(prev => ({ ...prev, [recipe.id]: { anyData: false, waterSoluble: [], covered: [], opportunities: [] } }));
    } else {
      const coverage = aggregateDayCoverage(entries);
      setRecipeCoverage(prev => ({ ...prev, [recipe.id]: coverage }));
    }
    setLoadingCoverage(null);
  }

  function toggleRecipeExpand(recipe) {
    const opening = expandedRecipe !== recipe.id;
    setExpandedRecipe(opening ? recipe.id : null);
    if (opening) computeRecipeCoverage(recipe);
  }

  function addRecipeToShoppingList(recipe) {
    const loggedNames = new Set(todayFoods.map(f => f.name.toLowerCase()));
    const ingredientNames = (recipe.ingredient_amounts?.length > 0)
      ? recipe.ingredient_amounts.map(i => i.name || i)
      : (recipe.ingredient_names || []);
    const missing = ingredientNames.filter(ing => !loggedNames.has(ing.toLowerCase()));
    if (missing.length === 0) { toast('You already have everything logged today 🌿'); return; }
    setShoppingList(prev => {
      const existing = new Set(prev.map(i => i.name.toLowerCase()));
      const additions = missing.filter(m => !existing.has(m.toLowerCase())).map(m => ({ id: `${Date.now()}-${m}`, name: m, checked: false }));
      return [...prev, ...additions];
    });
    toast(`🛒 Added ${missing.length} ingredient${missing.length > 1 ? 's' : ''} to shopping list`);
  }

  function toggleShoppingItem(id) { setShoppingList(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i)); }
  function clearCheckedItems()    { setShoppingList(prev => prev.filter(i => !i.checked)); }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '22px 26px', maxWidth: 800, fontFamily: 'DM Sans, sans-serif' }}>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, fontWeight: 400, color: '#1a1a16', marginBottom: 4 }}>Nourish 🥗</h2>
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>Log what you ate — no macros to track, no guilt.</p>
      </div>

      {/* ── In Season ──────────────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ ...LABEL, marginBottom: 3 }}>In Season · {currentMonthName()}</div>
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
              <button key={f.name} onClick={() => {
                if (!logStep) startLog();
                // Jump to foods step pre-selecting this item
                setLogStep('foods');
                const serving = resolveServing(f.name, {});
                setSelected(prev => prev.some(s => s.name === f.name) ? prev : [...prev, { name: f.name, category: f.category, serving, qty: 1 }]);
              }}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f0f7f0', border: '1.5px solid #b5ceb5', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#3a6a3a', fontFamily: 'DM Sans,sans-serif' }}>
                🌱 {f.name}
              </button>
            ))}
          </div>
        )}
        <p style={{ fontSize: 10, color: '#ccc', marginTop: 10, marginBottom: 0 }}>General regional guide, not a precise local almanac.</p>
      </div>

      {/* ── Log a meal — stepped flow ───────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: logStep ? 18 : 0 }}>
          <div style={LABEL}>Log a meal</div>
          {!logStep ? (
            <button onClick={startLog}
              style={{ padding: '8px 18px', background: '#5a7a5a', color: 'white', border: 'none', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
              + Add meal
            </button>
          ) : (
            <button onClick={cancelLog}
              style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
              Cancel
            </button>
          )}
        </div>

        {logStep && (
          <>
            {/* Progress indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              {['meal','quality','foods'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StepDot n={i+1} active={logStep===s} done={['meal','quality','foods'].indexOf(logStep) > i} />
                  <span style={{ fontSize: 11, color: logStep===s ? '#2a2a2a' : '#bbb', fontWeight: logStep===s ? 600 : 400 }}>
                    {['Meal','Quality','What you ate'][i]}
                  </span>
                  {i < 2 && <div style={{ width: 20, height: 1, background: '#e8e4de' }}/>}
                </div>
              ))}
            </div>

            {/* STEP 1: Meal type */}
            {logStep === 'meal' && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>Which meal?</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {LOG_MEAL_OPTIONS.map(m => (
                    <button key={m.key} onClick={() => pickMeal(m.key)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '14px 8px', background: logMealSlot===m.key ? '#f0f7f0' : 'white', border: `1.5px solid ${logMealSlot===m.key ? '#8aad8a' : '#e8e4de'}`, borderRadius: 14, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                      <span style={{ fontSize: 22 }}>{m.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: logMealSlot===m.key ? '#3a6a3a' : '#888' }}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Quality */}
            {logStep === 'quality' && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
                  {LOG_MEAL_OPTIONS.find(m => m.key === logMealSlot)?.emoji} {logMealSlot.charAt(0).toUpperCase() + logMealSlot.slice(1)} — how was it?
                </div>
                <p style={{ fontSize: 11, color: '#aaa', marginBottom: 14 }}>No judgment — just noticing.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {QUALITY_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => pickQuality(opt)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: opt.bg, border: `1.5px solid ${opt.border}`, borderRadius: 14, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', textAlign: 'left' }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.emoji}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: opt.color }}>{opt.label}</div>
                        {opt.coins > 0 && <div style={{ fontSize: 10, color: '#8aad8a', marginTop: 1 }}>+{opt.coins} 🪙</div>}
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setLogStep('meal')} style={{ marginTop: 12, fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans,sans-serif' }}>← Back</button>
              </div>
            )}

            {/* STEP 3: What you ate — multi-select foods */}
            {logStep === 'foods' && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>
                  What did you eat? <span style={{ fontWeight: 400, color: '#aaa' }}>Select everything in this meal</span>
                </div>

                {/* Selected foods summary + serving adjustment */}
                {selected.length > 0 && (
                  <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selected.map(sel => (
                      <div key={sel.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#f0f7f0', border: '1.5px solid #8aad8a', borderRadius: 12 }}>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#2a2a2a' }}>{sel.name}</div>
                        {/* Serving qty stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button onClick={() => {
                            const idx = QTY_STEPS.indexOf(sel.qty);
                            if (idx > 0) updateQty(sel.name, QTY_STEPS[idx-1]);
                          }} style={{ width: 24, height: 24, borderRadius: 6, border: '1.5px solid #8aad8a', background: 'white', cursor: 'pointer', fontSize: 14, color: '#5a7a5a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#555', minWidth: 50, textAlign: 'center' }}>{servingText(sel.serving, sel.qty)}</span>
                          <button onClick={() => {
                            const idx = QTY_STEPS.indexOf(sel.qty);
                            if (idx < QTY_STEPS.length - 1) updateQty(sel.name, QTY_STEPS[idx+1]);
                          }} style={{ width: 24, height: 24, borderRadius: 6, border: '1.5px solid #8aad8a', background: 'white', cursor: 'pointer', fontSize: 14, color: '#5a7a5a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                        <button onClick={() => setSelected(prev => prev.filter(s => s.name !== sel.name))}
                          style={{ fontSize: 14, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search */}
                <input ref={searchRef}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPickCategory(null); }}
                  placeholder="Type a food, or pick a category below…"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e8e4de', fontSize: 13, fontFamily: 'DM Sans,sans-serif', marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter' && search.trim()) addCustomFood(search); }}
                />

                {search.trim().length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {(searchResults || []).slice(0, 6).map(f => {
                      const isIn = selected.some(s => s.name === f.name);
                      return (
                        <button key={f.name} onClick={() => { toggleFoodSelection(f, null); setSearch(''); }}
                          style={{ textAlign: 'left', padding: '10px 13px', background: isIn ? '#f0f7f0' : 'white', border: `1.5px solid ${isIn ? '#8aad8a' : '#e8e4de'}`, borderRadius: 12, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans,sans-serif', color: '#2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {f.name}
                          {isIn && <span style={{ color: '#8aad8a', fontWeight: 700, fontSize: 14 }}>✓</span>}
                        </button>
                      );
                    })}
                    <button onClick={() => addCustomFood(search)}
                      style={{ textAlign: 'left', padding: '10px 13px', background: '#fdf8ed', border: '1.5px dashed #d4af6a', borderRadius: 12, cursor: 'pointer', fontSize: 13, color: '#9a7a2a', fontFamily: 'DM Sans,sans-serif' }}>
                      ➕ Add "{search.trim()}"
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Category chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: pickCategory ? 12 : 0 }}>
                      {FOOD_CATEGORIES.map(cat => (
                        <button key={cat.key} onClick={() => setPickCategory(pickCategory === cat.key ? null : cat.key)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 99, border: `1.5px solid ${pickCategory===cat.key ? '#8aad8a' : '#e8e4de'}`, background: pickCategory===cat.key ? '#f0f7f0' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: pickCategory===cat.key ? '#3a6a3a' : '#555', fontFamily: 'DM Sans,sans-serif' }}>
                          {cat.emoji} {cat.name}
                        </button>
                      ))}
                    </div>
                    {pickCategory && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                        {foodsForCategory(pickCategory).map(f => {
                          const isIn = selected.some(s => s.name === f.name);
                          return (
                            <button key={f.name} onClick={() => toggleFoodSelection(f, pickCategory)}
                              style={{ textAlign: 'left', padding: '9px 12px', background: isIn ? '#f0f7f0' : 'white', border: `1.5px solid ${isIn ? '#8aad8a' : '#e8e4de'}`, borderRadius: 11, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans,sans-serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              {f.name}
                              {isIn && <span style={{ color: '#8aad8a', fontWeight: 700 }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={confirmLog} disabled={fetchingNutrients || selected.length === 0}
                    style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: selected.length > 0 ? '#5a7a5a' : '#e8e4de', color: 'white', fontWeight: 600, fontSize: 13, cursor: selected.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans,sans-serif' }}>
                    {fetchingNutrients ? 'Estimating nutrients…' : selected.length === 0 ? 'Select foods above' : `✓ Log ${selected.length} food${selected.length > 1 ? 's' : ''}`}
                  </button>
                  <button onClick={() => setLogStep('quality')} style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e8e4de', background: 'white', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', color: '#888' }}>← Back</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Logged today — grouped by meal */}
        {todayFoods.length > 0 && !logStep && (
          <div style={{ marginTop: 16 }}>
            {[...LOG_MEAL_OPTIONS, { key: '__other', label: 'Other', emoji: '🍽️' }].map(mealOpt => {
              const entries = todayFoods.filter(f => mealOpt.key === '__other'
                ? !LOG_MEAL_OPTIONS.some(m => m.key === f.meal)
                : f.meal === mealOpt.key);
              if (entries.length === 0) return null;
              return (
                <div key={mealOpt.key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>{mealOpt.emoji} {mealOpt.label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entries.map(f => (
                      <div key={f.id} style={{ border: '1px solid #e8e4de', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', gap: 6 }}>
                          <button onClick={() => setExpandedEntry(expandedEntry === f.id ? null : f.id)}
                            style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans,sans-serif', flex: 1, minWidth: 0, color: '#2a2a2a' }}>
                            {f.name} <span style={{ color: '#aaa', fontSize: 11 }}>· {f.servingLabel || `${f.grams}g`}{f.nutrients?.length ? ' · view ▾' : ''}</span>
                          </button>
                          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                            <button onClick={() => editFood(f)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8aad8a', fontSize: 13 }}>✏️</button>
                            <button onClick={() => removeFood(f.id)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 14 }}>✕</button>
                          </div>
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
                          <div style={{ padding: '4px 14px 12px', fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>No USDA match found yet.</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Today's Coverage ────────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={LABEL}>Today's Coverage</div>
        {!dayCoverage.anyData ? (
          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', textAlign: 'center', margin: '4px 0' }}>Log a few foods above to see your day take shape.</p>
        ) : (
          <>
            <div style={{ marginBottom: 18, padding: '12px 14px', background: '#fdf8ed', border: '1px solid #e8c8a0', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9a7a2a', marginBottom: 2 }}>Water-soluble vitamins</div>
              <div style={{ fontSize: 10.5, color: '#b8935a', marginBottom: 10, lineHeight: 1.5 }}>Your body doesn't store these — they need topping up daily.</div>
              {dayCoverage.waterSoluble.map(n => (
                <div key={n.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}><span>{n.label}</span><span style={{ color: '#9a7a2a', fontWeight: 600 }}>{n.percent}% DV</span></div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.7)', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, n.percent)}%`, background: 'linear-gradient(90deg,#e8b06a,#c47a2a)', borderRadius: 99 }} /></div>
                  {n.percent < 50 && (NUTRIENT_FOOD_SUGGESTIONS[n.key] || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: '#b8935a', marginRight: 2 }}>Try:</span>
                      {NUTRIENT_FOOD_SUGGESTIONS[n.key].map(s => (
                        <button key={s.name} onClick={() => { setSelected(prev => prev.some(x => x.name === s.name) ? prev : [...prev, { name: s.name, category: s.category, serving: resolveServing(s.name, {}), qty: 1 }]); setLogStep('foods'); }}
                          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '1px solid #e8c8a0', background: 'white', color: '#9a7a2a', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {dayCoverage.covered.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5a7a5a', marginBottom: 8 }}>Well covered today</div>
                {dayCoverage.covered.map(n => (
                  <div key={n.key} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}><span>{n.label}</span><span style={{ color: '#5a7a5a', fontWeight: 600 }}>{n.percent}% DV</span></div>
                    <div style={{ height: 7, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, n.percent)}%`, background: 'linear-gradient(90deg,#8aad8a,#5a7a5a)', borderRadius: 99 }} /></div>
                  </div>
                ))}
              </div>
            )}
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
                          <button key={s.name} onClick={() => { setSelected(prev => prev.some(x => x.name === s.name) ? prev : [...prev, { name: s.name, category: s.category, serving: resolveServing(s.name, {}), qty: 1 }]); setLogStep('foods'); }}
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
          General estimate from typical servings — not exact tracking.
        </div>
      </div>

      {/* ── Food group variety ──────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={LABEL}>Food group variety</div>
        <p style={{ fontSize: 11, color: '#bbb', marginTop: -6, marginBottom: 12 }}>Counts once a group shows up across two different meals today.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {MACROS.map(macro => {
            const covered = macroCoverage[macro.key];
            return (
              <div key={macro.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', background: covered ? macro.bg : '#f7f3ed', border: `1.5px solid ${covered ? macro.border : '#e8e4de'}`, borderRadius: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: covered ? `linear-gradient(135deg,${macro.border},${macro.color})` : '#e8e4de', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{covered ? '✓' : macro.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: covered ? macro.color : '#bbb', textAlign: 'center' }}>{macro.label}</div>
              </div>
            );
          })}
        </div>
        {allCovered && <div style={{ marginTop: 14, padding: '10px 14px', background: 'linear-gradient(135deg,#f0f7f0,#e8f0e8)', border: '1px solid #8aad8a', borderRadius: 12, fontSize: 12, color: '#5a7a5a', fontWeight: 600, textAlign: 'center' }}>🌟 Full coverage today — beautifully balanced!</div>}
      </div>

      {/* ── Meal Quality (standalone — for adjusting outside the log flow) ──── */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={LABEL}>Adjust meal quality</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>🌱 earns +10 🪙</div>
        </div>
        <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, lineHeight: 1.5 }}>Change a rating after the fact if something changed.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MEAL_SLOTS.map(slot => {
            const current = meals[slot.key];
            return (
              <div key={slot.key}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><span>{slot.emoji}</span>{slot.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {QUALITY_OPTIONS.map(opt => {
                    const active = current === opt.key;
                    return (
                      <button key={opt.key} onClick={() => logMealQualityDirect(slot.key, opt.key)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px', background: active ? opt.bg : 'white', border: `1.5px solid ${active ? opt.border : '#e8e4de'}`, borderRadius: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
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
        {consecutiveRed >= 2 && consecutiveRed < 3 && <div style={{ marginTop: 14, padding: '10px 14px', background: '#fdf8ed', border: '1px solid #d4af6a', borderRadius: 12, fontSize: 12, color: '#9a7a2a' }}>⚠️ {consecutiveRed} processed meals in a row — one more affects health.</div>}
        {consecutiveRed >= 3 && <div style={{ marginTop: 14, padding: '10px 14px', background: '#fdf0f0', border: '1px solid #d08080', borderRadius: 12, fontSize: 12, color: '#a04040' }}>🔴 3+ processed meals in a row — small health dip applied.</div>}
      </div>

      {/* ── Recipe Suggestions ──────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={LABEL}>Recipe Suggestions</div>
        {loadingLibrary ? (
          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>Loading recipes…</p>
        ) : recipes.length === 0 ? (
          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>Your recipe library will appear here once it's synced from Notion.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recipes.map(r => (
              <div key={r.id} style={{ border: '1.5px solid #e8e4de', borderRadius: 13, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px' }}>
                  <button onClick={() => toggleRecipeExpand(r)} style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', flex: 1, minWidth: 0, fontFamily: 'DM Sans,sans-serif' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      {(r.meal_type || []).join(', ')}{r.cook_time_minutes ? ` · ${r.cook_time_minutes} min` : ''} · view recipe ▾
                    </div>
                  </button>
                  <button onClick={() => addRecipeToShoppingList(r)}
                    style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#5a7a5a', background: '#f0f7f0', border: '1px solid #b5ceb5', borderRadius: 99, padding: '6px 12px', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                    🛒 Shopping list
                  </button>
                </div>

                {expandedRecipe === r.id && (
                  <div style={{ borderTop: '1px solid #f0ede8' }}>
                    {r.image_url && <img src={r.image_url} alt={r.name} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '14px 16px' }}>

                      {/* Ingredients — show amounts if available, plain list otherwise */}
                      {((r.ingredient_amounts?.length > 0) || (r.ingredient_names?.length > 0)) && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 8 }}>Ingredients</div>
                          {r.ingredient_amounts?.length > 0 ? (
                            // Rich list: amount + name
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {r.ingredient_amounts.map((ing, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13 }}>
                                  {ing.amount && (
                                    <span style={{ color: '#9a7a2a', fontWeight: 600, minWidth: 60, fontSize: 12 }}>{ing.amount}</span>
                                  )}
                                  <span style={{ color: '#444' }}>{ing.name || ing}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Fallback: chips
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {r.ingredient_names.map(ing => (
                                <span key={ing} style={{ fontSize: 12, padding: '4px 10px', background: '#f7f3ed', borderRadius: 99, color: '#5a5a50' }}>{ing}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Instructions */}
                      {r.instructions ? (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 6 }}>Instructions</div>
                          <p style={{ fontSize: 13, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{r.instructions}</p>
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', marginBottom: 14 }}>No instructions added yet.</p>
                      )}

                      {/* Nutrient coverage */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 6 }}>This recipe tends to cover</div>
                        {loadingCoverage === r.id ? (
                          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', margin: 0 }}>Estimating…</p>
                        ) : !recipeCoverage[r.id] ? (
                          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', margin: 0 }}>Expand to estimate nutrients.</p>
                        ) : !recipeCoverage[r.id].anyData ? (
                          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', margin: 0 }}>
                            No USDA matches yet — ingredient names may need to match common food names (e.g. "chickpeas" not "legumes").
                          </p>
                        ) : (
                          <>
                            {[...(recipeCoverage[r.id].waterSoluble || []).filter(n => n.percent >= 15), ...(recipeCoverage[r.id].covered || [])].slice(0, 6).map(n => (
                              <div key={n.key} style={{ marginBottom: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}><span>{n.label}</span><span style={{ color: '#888' }}>{n.percent}% DV</span></div>
                                <div style={{ height: 5, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, n.percent)}%`, background: '#8aad8a', borderRadius: 99 }} /></div>
                              </div>
                            ))}
                            <p style={{ fontSize: 10, color: '#ccc', marginTop: 8, marginBottom: 0 }}>Estimate based on typical serving sizes, not this recipe's exact quantities.</p>
                          </>
                        )}
                      </div>

                      {r.notion_url && (
                        <a href={r.notion_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 11, color: '#8aad8a' }}>Open in Notion ↗</a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Shopping List ───────────────────────────────────────────────────── */}
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
