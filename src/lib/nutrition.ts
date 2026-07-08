// ============================================================================
// lib/nutrition.ts   →   src/lib/nutrition.ts
//
// The single interface the Nourish UI uses. Three sources behind it:
//   • getFoodNutrients()  → USDA numbers (via /api/food-nutrients, cached)
//   • getPantryFoods()    → your Notion curation (eat-for, serving, recipe, tags)
//   • getInSeasonFoods()  → seasonalProduce.ts — a static, region-based
//                           calendar, fully INDEPENDENT of Notion
// The component never talks to USDA or Notion directly — just these helpers.
// ============================================================================

import { supabase } from './supabase';
import { getSeasonalFoods, currentMonthName as _currentMonthName } from './seasonalProduce';

export { regionLabel, detectRegionFromTimezone, REGIONS } from './seasonalProduce';
export const currentMonthName = _currentMonthName;

export type Nutrient = {
  key: string;
  label: string;
  amount: number;
  unit: string;
  percent_dv: number;
};

export type FoodNutrients = {
  food_key: string;
  display_name: string;
  fdc_id: string | null;
  serving_grams: number;
  nutrients: Nutrient[];
  source: 'usda_fdc' | 'estimate' | 'none';
};

export type PantryFood = {
  id: string;
  name: string;
  category: string[];
  eat_for: string[];
  nutrition_tags: string[];
  serving_grams: number | null;
  serving_other: string | null;
  recipe_slug: string | null;
  usda_query: string | null;
};

// ── USDA numbers (cached server-side) ───────────────────────────────────────
export async function getFoodNutrients(name: string, grams?: number): Promise<FoodNutrients | null> {
  try {
    const q = new URLSearchParams({ name });
    if (grams) q.set('grams', String(Math.round(grams)));
    const res = await fetch(`/api/food-nutrients?${q.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as FoodNutrients;
  } catch {
    return null;
  }
}

// ── Notion curation (synced into pantry_foods by Make) ──────────────────────
export async function getPantryFoods(): Promise<PantryFood[]> {
  try {
    const { data } = await supabase
      .from('pantry_foods')
      .select('*')
      .eq('in_app', true)
      .order('name');
    return (data as PantryFood[]) || [];
  } catch {
    return [];
  }
}

export async function getPantryFood(name: string): Promise<PantryFood | null> {
  try {
    const { data } = await supabase
      .from('pantry_foods')
      .select('*')
      .ilike('name', name)
      .maybeSingle();
    return (data as PantryFood) || null;
  } catch {
    return null;
  }
}

// Foods in season this month, for the "in season now" shelf.
// INDEPENDENT of Notion — driven by the person's region (seasonalProduce.ts),
// not by any pantry_foods field. `region` should come from the store
// (defaults to 'NL_EU' if the person hasn't set one yet).
export function getInSeasonFoods(region: string = 'NL_EU', d = new Date()) {
  return getSeasonalFoods(region, d);
}

// Group the pantry by category for tiered logging (category → food → serving).
export function groupByCategory(foods: PantryFood[]): Record<string, PantryFood[]> {
  const groups: Record<string, PantryFood[]> = {};
  for (const f of foods) {
    const cats = f.category && f.category.length ? f.category : ['other'];
    for (const c of cats) {
      (groups[c] ||= []).push(f);
    }
  }
  return groups;
}

// ── Recipes (synced into `recipes` by Make, from your Notion Recipe Book) ──
export type Recipe = {
  id: string;
  name: string;
  meal_type: string[];
  category: string[];
  cook_time_minutes: number | null;
  ingredient_names: string[];
  notion_url: string | null;
};

export async function getRecipes(): Promise<Recipe[]> {
  try {
    const { data } = await supabase.from('recipes').select('*').eq('in_app', true).order('name');
    return (data as Recipe[]) || [];
  } catch {
    return [];
  }
}

// Naive relevance score: how many of a recipe's ingredients are in season right now
// (region-based, independent of Notion). Degrades gracefully to "first N recipes"
// if ingredient_names isn't populated yet.
export async function getRecipeSuggestions(region: string = 'NL_EU', limit = 4): Promise<Recipe[]> {
  const recipes = await getRecipes();
  if (recipes.length === 0) return [];
  const inSeason = getInSeasonFoods(region);
  const seasonNames = new Set(inSeason.map((f) => f.name.toLowerCase()));
  const scored = recipes.map((r) => {
    const matches = (r.ingredient_names || []).filter((ing) => seasonNames.has(ing.toLowerCase())).length;
    return { r, score: matches };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.r);
}

// ── Full-day nutrient coverage (general estimate, not exact tracking) ──────
// Mirrors the DV key/label list in app/api/food-nutrients/route.ts so the UI
// can show "opportunity" nutrients even when a food contributed 0% of them.
//
// `type` matters biologically: water-soluble vitamins (all the Bs + C) aren't
// stored by the body in any meaningful reserve — what isn't used today is
// largely excreted, so they need topping up daily regardless of yesterday's
// intake. Fat-soluble vitamins (A, D, E, K) and minerals CAN be drawn from
// body stores, so a single low day matters less. This is why water-soluble
// vitamins get their own always-visible section below, rather than folding
// into the generic "opportunity" list (opportunity framing still applies —
// low is never called "deficient" — but these get surfaced every day, not
// just when they happen to be low).
type NutrientType = 'water_soluble_vitamin' | 'fat_soluble_vitamin' | 'mineral' | 'macronutrient';

export const NUTRIENT_META: { key: string; label: string; type: NutrientType }[] = [
  { key: 'protein',    label: 'Protein',              type: 'macronutrient' },
  { key: 'fiber',      label: 'Fiber',                type: 'macronutrient' },
  { key: 'vit_c',      label: 'Vitamin C',            type: 'water_soluble_vitamin' },
  { key: 'thiamin',    label: 'Thiamin (B1)',         type: 'water_soluble_vitamin' },
  { key: 'riboflavin', label: 'Riboflavin (B2)',      type: 'water_soluble_vitamin' },
  { key: 'niacin',     label: 'Niacin (B3)',          type: 'water_soluble_vitamin' },
  { key: 'vit_b5',     label: 'Pantothenic Acid (B5)',type: 'water_soluble_vitamin' },
  { key: 'vit_b6',     label: 'Vitamin B6',           type: 'water_soluble_vitamin' },
  { key: 'folate',     label: 'Folate (B9)',          type: 'water_soluble_vitamin' },
  { key: 'vit_b12',    label: 'Vitamin B12',          type: 'water_soluble_vitamin' },
  { key: 'vit_k',      label: 'Vitamin K',            type: 'fat_soluble_vitamin' },
  { key: 'vit_a',      label: 'Vitamin A',            type: 'fat_soluble_vitamin' },
  { key: 'vit_d',      label: 'Vitamin D',            type: 'fat_soluble_vitamin' },
  { key: 'iron',       label: 'Iron',                 type: 'mineral' },
  { key: 'calcium',    label: 'Calcium',              type: 'mineral' },
  { key: 'potassium',  label: 'Potassium',            type: 'mineral' },
  { key: 'magnesium',  label: 'Magnesium',            type: 'mineral' },
];

// Back-compat alias — same list, old shape, in case anything still imports it.
export const KEY_NUTRIENTS = NUTRIENT_META.map(({ key, label }) => ({ key, label }));

// Food suggestions per nutrient — shown next to any low-coverage bar so "you're
// low on X" always comes with "here's what covers it," one tap away. Names
// are deliberately drawn from the servingSizes.ts dictionary (and the seasonal
// calendar) so every suggestion resolves to a real natural serving immediately,
// with no "food not found" dead end. `category` matches FOOD_CATEGORIES keys
// in TabNourish.jsx, so tapping a suggestion also counts toward food-group variety.
export const NUTRIENT_FOOD_SUGGESTIONS: Record<string, { name: string; category: string | null }[]> = {
  vit_c:       [{ name: 'Bell pepper', category: 'cruciferous' }, { name: 'Orange', category: 'fruit' }, { name: 'Strawberries', category: 'fruit' }, { name: 'Broccoli', category: 'cruciferous' }],
  thiamin:     [{ name: 'Oats', category: 'grains_starchy' }, { name: 'Lentils', category: 'legumes' }, { name: 'Chickpeas', category: 'legumes' }, { name: 'Pumpkin seeds', category: 'nuts_seeds' }],
  riboflavin:  [{ name: 'Milk', category: 'dairy' }, { name: 'Greek yoghurt', category: 'dairy' }, { name: 'Almonds', category: 'nuts_seeds' }, { name: 'Mushrooms', category: 'mushrooms' }],
  niacin:      [{ name: 'Chicken breast', category: 'meat_fish_eggs' }, { name: 'Tuna', category: 'meat_fish_eggs' }, { name: 'Salmon', category: 'oily_fish' }, { name: 'Mushrooms', category: 'mushrooms' }],
  vit_b5:      [{ name: 'Avocado', category: 'healthy_fats' }, { name: 'Greek yoghurt', category: 'dairy' }, { name: 'Mushrooms', category: 'mushrooms' }, { name: 'Sweet potato', category: 'grains_starchy' }],
  vit_b6:      [{ name: 'Chicken breast', category: 'meat_fish_eggs' }, { name: 'Salmon', category: 'oily_fish' }, { name: 'Potato', category: 'grains_starchy' }, { name: 'Chickpeas', category: 'legumes' }],
  folate:      [{ name: 'Spinach', category: 'leafy_greens' }, { name: 'Lentils', category: 'legumes' }, { name: 'Chickpeas', category: 'legumes' }, { name: 'Asparagus', category: 'leafy_greens' }],
  vit_b12:     [{ name: 'Salmon', category: 'oily_fish' }, { name: 'Egg', category: 'meat_fish_eggs' }, { name: 'Greek yoghurt', category: 'dairy' }, { name: 'Sardines', category: 'oily_fish' }],
  vit_k:       [{ name: 'Kale', category: 'leafy_greens' }, { name: 'Spinach', category: 'leafy_greens' }, { name: 'Broccoli', category: 'cruciferous' }, { name: 'Brussels sprouts', category: 'cruciferous' }],
  vit_a:       [{ name: 'Sweet potato', category: 'grains_starchy' }, { name: 'Carrot', category: 'root_veg' }, { name: 'Kale', category: 'leafy_greens' }, { name: 'Spinach', category: 'leafy_greens' }],
  vit_d:       [{ name: 'Salmon', category: 'oily_fish' }, { name: 'Mackerel', category: 'oily_fish' }, { name: 'Egg', category: 'meat_fish_eggs' }, { name: 'Milk', category: 'dairy' }],
  iron:        [{ name: 'Lentils', category: 'legumes' }, { name: 'Spinach', category: 'leafy_greens' }, { name: 'Chickpeas', category: 'legumes' }, { name: 'Ground beef', category: 'meat_fish_eggs' }],
  calcium:     [{ name: 'Milk', category: 'dairy' }, { name: 'Greek yoghurt', category: 'dairy' }, { name: 'Cheddar cheese', category: 'dairy' }, { name: 'Kale', category: 'leafy_greens' }],
  potassium:   [{ name: 'Sweet potato', category: 'grains_starchy' }, { name: 'Banana', category: 'fruit' }, { name: 'Potato', category: 'grains_starchy' }, { name: 'Spinach', category: 'leafy_greens' }],
  magnesium:   [{ name: 'Almonds', category: 'nuts_seeds' }, { name: 'Spinach', category: 'leafy_greens' }, { name: 'Black beans', category: 'legumes' }, { name: 'Pumpkin seeds', category: 'nuts_seeds' }],
  protein:     [{ name: 'Chicken breast', category: 'meat_fish_eggs' }, { name: 'Greek yoghurt', category: 'dairy' }, { name: 'Lentils', category: 'legumes' }, { name: 'Egg', category: 'meat_fish_eggs' }],
  fiber:       [{ name: 'Lentils', category: 'legumes' }, { name: 'Chickpeas', category: 'legumes' }, { name: 'Oats', category: 'grains_starchy' }, { name: 'Broccoli', category: 'cruciferous' }],
};

export type DayCoverage = {
  waterSoluble: { key: string; label: string; percent: number }[]; // always shown, all of them
  covered: { key: string; label: string; percent: number }[];       // non-water-soluble, well covered
  opportunities: { key: string; label: string; percent: number }[]; // non-water-soluble, biggest opportunity
  anyData: boolean;
};

// entries: the day's logged foods, each carrying the `nutrients` array returned
// by getFoodNutrients() at the time it was logged (cached on the entry so we
// don't refetch USDA just to render the day summary).
export function aggregateDayCoverage(entries: { nutrients?: Nutrient[] }[]): DayCoverage {
  const totals: Record<string, number> = {};
  for (const n of NUTRIENT_META) totals[n.key] = 0;
  for (const entry of entries) {
    for (const n of entry.nutrients || []) {
      if (totals[n.key] == null) continue; // only track the key set above
      totals[n.key] = Math.min(100, totals[n.key] + n.percent_dv);
    }
  }
  const rows = NUTRIENT_META.map((n) => ({ ...n, percent: Math.round(totals[n.key]) }));

  const waterSoluble = rows
    .filter((r) => r.type === 'water_soluble_vitamin')
    .sort((a, b) => a.percent - b.percent); // lowest (needs attention) first

  const rest = rows.filter((r) => r.type !== 'water_soluble_vitamin');
  const covered = rest.filter((r) => r.percent >= 40).sort((a, b) => b.percent - a.percent).slice(0, 6);
  const opportunities = rest.filter((r) => r.percent < 40).sort((a, b) => a.percent - b.percent).slice(0, 3);

  return { waterSoluble, covered, opportunities, anyData: entries.length > 0 };
}
