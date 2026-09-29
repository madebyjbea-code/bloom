// ============================================================================
// lib/nutrientModel.ts   →   src/lib/nutrientModel.ts
//
// Everything the v4 Nourish views compute from logged foods:
//   • the full vitamin + mineral catalogue, grouped, with how long the body
//     holds each one (drives the weekly "stores" bars)
//   • free vs natural sugar (WHO / UK SACN definitions)
//   • daily macros against simple, editable targets
//   • a per-day summary for the "your week, day by day" grid
//
// All numbers are ESTIMATES for everyday awareness — never diagnoses.
// ============================================================================

export type Nutrient = { key: string; label: string; amount: number; unit: string; percent_dv: number };
export type FoodEntry = {
  id?: string;
  name: string;
  meal?: string;
  grams?: number;
  nutrients?: Nutrient[];
  category?: string | null;
  isTakeout?: boolean;
  takeoutQuality?: string | null;
  sugarForm?: SugarForm;
  prep?: string[];
};

// ── 1. Vitamin & mineral catalogue ──────────────────────────────────────────
//
// halfLifeDays = roughly how long the body takes to lose half of what it holds
// (whole-body pool or the main functional store). These are literature-based
// approximations; real values vary a lot with intake, body size and health.
// They are used ONLY to weight recent days more than older ones — see
// computeStores() below.
//
//   Vitamin C     10–20 d body pool (Kallner et al. 1979). Excess from one big
//                 dose is excreted within hours, but tissue stores last weeks.
//   Thiamin (B1)  9–18 d — the smallest reserve of any vitamin.
//   B2, B3, B5    limited stores, ~2–3 weeks (limited human data).
//   B6            25–33 d, mostly bound in muscle.
//   Biotin        ~2 weeks (limited data; rarely listed in food databases).
//   Folate        whole-body ~100 d; deficiency takes ~4 months to develop.
//   B12           > 1 year (liver holds 2–5 mg, loses ~0.1–0.2 %/day).
//   Vitamin A     ~130–150 d in liver.
//   Vitamin D     25(OH)D ~2–3 weeks; some extra held in fat tissue.
//   Vitamin E     plasma turns over in days, fat tissue over months — ~30 d used.
//   Vitamin K     K1: small liver pool, turns over in ~1–3 days.
//   Calcium       blood is buffered by bone, but intake is a DAILY balance.
//   Potassium, phosphorus   no real store — cleared daily by the kidneys.
//   Zinc          small exchangeable pool, turns over in days.
//   Magnesium     bone + muscle exchange over weeks.
//   Iron          ferritin stores last months (loss ~1–2 mg/day).
//   Selenium      whole-body ~100 d.
//   Copper        ~4 weeks.  Manganese  ~2–5 weeks.
//   Iodine        thyroid holds ~2 months (rarely in food databases).
// ----------------------------------------------------------------------------

export type NutrientGroup = 'water_soluble' | 'fat_soluble' | 'mineral';
export type Speed = 'days' | 'weeks' | 'months';
export type MicroDef = {
  key: string;
  label: string;
  group: NutrientGroup;
  halfLifeDays: number;
  note?: string;          // shown under the bar when useful
  limitedData?: boolean;  // food databases often don't list it
};

export const MICROS: MicroDef[] = [
  // Water-soluble vitamins
  { key: 'vit_c',      label: 'Vitamin C',        group: 'water_soluble', halfLifeDays: 14 },
  { key: 'thiamin',    label: 'B1 · Thiamin',     group: 'water_soluble', halfLifeDays: 12, note: 'smallest reserve of any vitamin' },
  { key: 'riboflavin', label: 'B2 · Riboflavin',  group: 'water_soluble', halfLifeDays: 14 },
  { key: 'niacin',     label: 'B3 · Niacin',      group: 'water_soluble', halfLifeDays: 14 },
  { key: 'vit_b5',     label: 'B5 · Pantothenic', group: 'water_soluble', halfLifeDays: 14 },
  { key: 'vit_b6',     label: 'B6',               group: 'water_soluble', halfLifeDays: 30 },
  { key: 'biotin',     label: 'B7 · Biotin',      group: 'water_soluble', halfLifeDays: 14, limitedData: true },
  { key: 'folate',     label: 'B9 · Folate',      group: 'water_soluble', halfLifeDays: 90 },
  { key: 'vit_b12',    label: 'B12',              group: 'water_soluble', halfLifeDays: 365, note: 'the exception — the liver stores years’ worth' },
  // Fat-soluble vitamins
  { key: 'vit_a',      label: 'Vitamin A',        group: 'fat_soluble',   halfLifeDays: 140 },
  { key: 'vit_d',      label: 'Vitamin D',        group: 'fat_soluble',   halfLifeDays: 21, note: 'sunlight is the main source; Oct–Mar sun in NL is too weak' },
  { key: 'vit_e',      label: 'Vitamin E',        group: 'fat_soluble',   halfLifeDays: 30 },
  { key: 'vit_k',      label: 'Vitamin K',        group: 'fat_soluble',   halfLifeDays: 2, note: 'the fat-soluble exception — tiny store' },
  // Minerals
  { key: 'calcium',    label: 'Calcium',          group: 'mineral',       halfLifeDays: 2, note: 'bones buffer your blood, but intake is a daily balance' },
  { key: 'iron',       label: 'Iron',             group: 'mineral',       halfLifeDays: 180 },
  { key: 'magnesium',  label: 'Magnesium',        group: 'mineral',       halfLifeDays: 30 },
  { key: 'zinc',       label: 'Zinc',             group: 'mineral',       halfLifeDays: 7 },
  { key: 'potassium',  label: 'Potassium',        group: 'mineral',       halfLifeDays: 1 },
  { key: 'phosphorus', label: 'Phosphorus',       group: 'mineral',       halfLifeDays: 2 },
  { key: 'selenium',   label: 'Selenium',         group: 'mineral',       halfLifeDays: 90 },
  { key: 'copper',     label: 'Copper',           group: 'mineral',       halfLifeDays: 30 },
  { key: 'manganese',  label: 'Manganese',        group: 'mineral',       halfLifeDays: 30 },
  { key: 'iodine',     label: 'Iodine',           group: 'mineral',       halfLifeDays: 60, limitedData: true, note: 'in NL mostly from bread (iodised baker’s salt), fish and dairy' },
];

export const GROUP_LABELS: Record<NutrientGroup, string> = {
  water_soluble: 'Water-soluble vitamins',
  fat_soluble: 'Fat-soluble vitamins',
  mineral: 'Minerals',
};

export function speedOf(m: MicroDef): Speed {
  if (m.halfLifeDays <= 7) return 'days';
  if (m.halfLifeDays <= 45) return 'weeks';
  return 'months';
}
export const SPEED_LABEL: Record<Speed, string> = { days: 'fades in days', weeks: 'fades over weeks', months: 'stored for months' };

// ── 2. Free vs natural sugar ────────────────────────────────────────────────
// WHO: free sugars = sugars added to foods + sugars naturally in honey,
// syrups, fruit juices and juice concentrates. Sugars inside intact fruit,
// vegetables and milk are NOT free.
// UK SACN / NHS go one step further: sugars in puréed or blended fruit
// (smoothies, purées, pastes) also count as free, because breaking the cell
// walls releases them. Bloom follows the stricter UK rule — so "mashed dates"
// or "date paste" counts as free sugar, while whole or chopped dates don't.

export type SugarForm = 'intact' | 'free';

const FREE_PREP_RE = /\b(mash(ed)?|pur[eé]e(d)?|blend(ed)?|juic(e|ed)|smoothie|paste|syrup|concentrate|nectar|coulis|compote)\b/i;
const ADDED_RE = /\b(sugar|honey|syrup|agave|jam|marmalade|treacle|molasses|chocolate|candy|sweets|cake|cookies?|biscuits?|brownies?|muffins?|pastry|pastries|croissant|doughnut|donut|ice cream|soda|cola|lemonade|energy drink|ketchup|granola|cereal|flavou?red|sweetened|dessert|pudding|custard|nutella|spread|sauce|juice|smoothie|stroopwafel|hagelslag|speculaas|pancake syrup)\b/i;
const UNSWEETENED_RE = /\b(unsweetened|no added sugar|plain|natural)\b/i;

export function classifySugar(name: string, prep: string[] = [], quality?: string | null): { form: SugarForm; reason: string } {
  const text = `${name} ${prep.join(' ')}`.toLowerCase();
  if (FREE_PREP_RE.test(text)) return { form: 'free', reason: 'puréed, blended or juiced — sugars are released from the fruit' };
  if (ADDED_RE.test(text) && !UNSWEETENED_RE.test(text)) return { form: 'free', reason: 'added or free sugar' };
  if (quality === 'processed') return { form: 'free', reason: 'processed foods usually contain added sugar' };
  return { form: 'intact', reason: 'inside whole fruit, veg, grains or plain dairy' };
}

// ── 3. Macros ───────────────────────────────────────────────────────────────
export type Macros = {
  protein: number; fiber: number; carbs: number;
  fat: number; satFat: number; unsatFat: number; omega3: number;
  sugar: number; freeSugar: number; naturalSugar: number;
  sodium: number; // mg
};
export const ZERO_MACROS: Macros = { protein: 0, fiber: 0, carbs: 0, fat: 0, satFat: 0, unsatFat: 0, omega3: 0, sugar: 0, freeSugar: 0, naturalSugar: 0, sodium: 0 };

function amountOf(nutrients: Nutrient[] | undefined, key: string): number {
  const n = (nutrients || []).find((x) => x.key === key);
  if (!n) return 0;
  if (key === 'sugar' && n.unit !== 'g') return (n.percent_dv / 100) * 25; // legacy entries
  return Number(n.amount) || 0;
}

export function entryMacros(e: FoodEntry, quality?: string | null): Macros {
  const sugar = amountOf(e.nutrients, 'sugar');
  const form: SugarForm = e.sugarForm || classifySugar(e.name, e.prep || [], quality ?? e.takeoutQuality).form;
  const fat = amountOf(e.nutrients, 'fat');
  const satFat = amountOf(e.nutrients, 'sat_fat');
  return {
    protein: amountOf(e.nutrients, 'protein'),
    fiber: amountOf(e.nutrients, 'fiber'),
    carbs: amountOf(e.nutrients, 'carbs'),
    fat, satFat, unsatFat: Math.max(0, fat - satFat),
    omega3: amountOf(e.nutrients, 'omega3'),
    sugar,
    freeSugar: form === 'free' ? sugar : 0,
    naturalSugar: form === 'free' ? 0 : sugar,
    sodium: amountOf(e.nutrients, 'sodium'),
  };
}

export function sumMacros(entries: FoodEntry[], mealQualities: Record<string, string> = {}): Macros {
  const t: Macros = { ...ZERO_MACROS };
  for (const e of entries) {
    const m = entryMacros(e, e.meal ? mealQualities[e.meal] : null);
    (Object.keys(t) as (keyof Macros)[]).forEach((k) => { t[k] += m[k]; });
  }
  return t;
}

export type Targets = { protein: number; fiber: number; freeSugar: number; satFat: number; sodium: number };
// Defaults: protein ≈ 0.83–1 g/kg for a ~65–70 kg adult (EFSA PRI, rounded up
// for active people); fibre 30 g (Dutch Health Council: 30–40 g); free sugar
// 25 g (WHO conditional recommendation, <5 % energy); saturated fat 20 g
// (UK reference for women, ≈10 % energy); sodium 2 000 mg = 5 g salt (WHO).
export const DEFAULT_TARGETS: Targets = { protein: 60, fiber: 30, freeSugar: 25, satFat: 20, sodium: 2000 };
const TARGETS_KEY = 'bloom-nourish-targets';
export function loadTargets(): Targets {
  try { return { ...DEFAULT_TARGETS, ...(JSON.parse(localStorage.getItem(TARGETS_KEY) || '{}')) }; } catch { return DEFAULT_TARGETS; }
}
export function saveTargets(t: Targets) { try { localStorage.setItem(TARGETS_KEY, JSON.stringify(t)); } catch {} }

// "Macros met" for the weekly grid: protein, fibre, healthy fats, free sugar.
export function macrosMet(m: Macros, t: Targets) {
  const fats = m.fat > 0 && m.satFat <= t.satFat && m.unsatFat >= m.satFat;
  return {
    protein: m.protein >= t.protein * 0.9,
    fiber: m.fiber >= t.fiber * 0.9,
    fats,
    freeSugar: m.freeSugar <= t.freeSugar,
  };
}

// ── 4. Micronutrients per day and weekly stores ─────────────────────────────
export function dayMicroPercents(entries: FoodEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of MICROS) out[m.key] = 0;
  for (const e of entries) {
    for (const n of e.nutrients || []) {
      if (out[n.key] != null) out[n.key] += Number(n.percent_dv) || 0;
    }
  }
  return out;
}

export function dayMicroCoverage(entries: FoodEntry[]): number | null {
  if (!entries.some((e) => (e.nutrients || []).length)) return null;
  const p = dayMicroPercents(entries);
  const tracked = MICROS.filter((m) => !m.limitedData);
  return Math.round(tracked.reduce((a, m) => a + Math.min(100, p[m.key]), 0) / tracked.length);
}

// UTC date keys, matching how TabNourish / Dashboard key localStorage today.
export function dateKeysBack(todayKey: string, n: number): string[] {
  const base = new Date(`${todayKey}T12:00:00Z`).getTime();
  return Array.from({ length: n }, (_, i) => new Date(base - (n - 1 - i) * 86400000).toISOString().split('T')[0]);
}

export type Store = MicroDef & { level: number | null; speed: Speed; lastTopUp: string | null };

// Store level = a weighted average of your recent daily intake (%DV per day),
// where each older day counts less according to the nutrient's half-life:
//   weight(day) = 0.5 ^ (daysAgo / halfLife)
// • Steady intake at 100 %/day → bar sits at 100 %.
// • A mandarin on Sunday lifts vitamin C; each following day without a source
//   pulls it back down — slowly for long-lived nutrients (B12, iron, A),
//   quickly for short-lived ones (K, potassium, calcium).
// • Days you logged nothing are SKIPPED (unknown), not treated as zero — so
//   forgetting to log never drains your bars.
// • One day is capped at 150 % so a single mega-dose can't dominate.
export function computeStores(foodsByDate: Record<string, FoodEntry[]>, todayKey: string, windowDays = 60): { stores: Store[]; loggedDays: number } {
  const days = dateKeysBack(todayKey, windowDays).reverse(); // today first
  const logged = days
    .map((d, age) => ({ d, age, entries: (foodsByDate[d] || []).filter((e) => (e.nutrients || []).length) }))
    .filter((x) => x.entries.length > 0);
  const perDay = logged.map((x) => ({ ...x, p: dayMicroPercents(x.entries) }));
  const seen = new Set<string>();
  for (const x of perDay) for (const e of x.entries) for (const n of e.nutrients || []) seen.add(n.key);

  const stores = MICROS.map((m) => {
    if (!perDay.length || !seen.has(m.key)) return { ...m, level: null, speed: speedOf(m), lastTopUp: null };
    let wSum = 0, vSum = 0;
    for (const x of perDay) {
      const w = Math.pow(0.5, x.age / m.halfLifeDays);
      wSum += w;
      vSum += w * Math.min(150, x.p[m.key]);
    }
    const lastTopUp = perDay.find((x) => x.p[m.key] >= 50)?.d || null;
    return { ...m, level: Math.min(100, Math.round(vSum / wSum)), speed: speedOf(m), lastTopUp };
  });
  return { stores, loggedDays: perDay.length };
}

// ── 5. Day-by-day summary for the weekly grid ───────────────────────────────
export type SlotSummary = { quality: string | null; takeout: boolean; logged: boolean };
export type DaySummary = {
  date: string; label: string; isToday: boolean;
  slots: Record<'breakfast' | 'lunch' | 'dinner', SlotSummary>;
  snacks: number;
  macros: Macros | null;
  met: ReturnType<typeof macrosMet> | null;
  metCount: number | null;
  micro: number | null;
};

const SLOTS = ['breakfast', 'lunch', 'dinner'] as const;
export function weekSummary(
  foodsByDate: Record<string, FoodEntry[]>,
  mealsByDate: Record<string, { meals?: Record<string, string> }>,
  todayKey: string,
  targets: Targets,
): DaySummary[] {
  return dateKeysBack(todayKey, 7).map((d) => {
    const entries = foodsByDate[d] || [];
    const meals = mealsByDate[d]?.meals || {};
    const slots = {} as DaySummary['slots'];
    for (const s of SLOTS) {
      const slotEntries = entries.filter((e) => e.meal === s);
      slots[s] = {
        quality: meals[s] || slotEntries.find((e) => e.takeoutQuality)?.takeoutQuality || null,
        takeout: slotEntries.some((e) => e.isTakeout),
        logged: !!meals[s] || slotEntries.length > 0,
      };
    }
    const withData = entries.filter((e) => (e.nutrients || []).length);
    const macros = withData.length ? sumMacros(withData, meals) : null;
    const met = macros ? macrosMet(macros, targets) : null;
    const dt = new Date(`${d}T12:00:00Z`);
    return {
      date: d,
      label: d === todayKey ? 'Today' : dt.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
      isToday: d === todayKey,
      slots,
      snacks: entries.filter((e) => e.meal === 'snack').length,
      macros, met,
      metCount: met ? Object.values(met).filter(Boolean).length : null,
      micro: dayMicroCoverage(entries),
    };
  });
}

export function weekCounts(days: DaySummary[]) {
  const c = { whole: 0, mixed: 0, processed: 0, takeout: 0, skipped: 0 };
  for (const d of days) for (const s of SLOTS) {
    const q = d.slots[s].quality;
    if (q && q in c) (c as any)[q]++;
    if (d.slots[s].takeout) c.takeout++;
  }
  return c;
}

// One gentle, specific observation — or nothing.
export function weekPattern(days: DaySummary[]): string | null {
  const past = days.filter((d) => !d.isToday);
  const rough = past.filter((d) => SLOTS.some((s) => d.slots[s].quality === 'processed' || d.slots[s].takeout));
  const roughDinners = past.filter((d) => d.slots.dinner.quality === 'processed' || d.slots.dinner.takeout);
  if (roughDinners.length >= 2) {
    const names = roughDinners.map((d) => d.label).join(', ');
    return `Processed or takeout dinners showed up on ${names}. A batch-cooked meal the day before those nights could make them easier.`;
  }
  const skippedBreakfasts = past.filter((d) => d.slots.breakfast.quality === 'skipped').length;
  if (skippedBreakfasts >= 3) return `Breakfast was skipped ${skippedBreakfasts} times. Even something small, like yoghurt and fruit, counts.`;
  const lowFibre = past.filter((d) => d.met && !d.met.fiber).length;
  if (lowFibre >= 4) return 'Fibre came in under target on most days. Beans, lentils, oats and veg are the easiest wins.';
  const wholeDays = past.filter((d) => SLOTS.every((s) => d.slots[s].quality === 'whole')).length;
  if (wholeDays >= 3 && rough.length === 0) return `${wholeDays} fully whole-food days this week. That consistency is what moves the needle.`;
  return null;
}
