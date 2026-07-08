// ============================================================================
// lib/seasonalProduce.ts   →   src/lib/seasonalProduce.ts
//
// "In Season Now" data — INDEPENDENT of Notion. This is a static, curated
// calendar you (Claude/J) maintain directly in code, not something that syncs
// from the pantry. Region drives it, not the app's food library.
//
// Design: rather than hand-author a full calendar per country (a lot of
// upkeep for marginal accuracy — the US alone spans several climate zones),
// we author ONE Northern-temperate calendar and mirror it for the Southern
// hemisphere by shifting 6 months. This is an approximation, not a per-country
// almanac — good enough for "in season now" inspiration, not a farming guide.
// Flagged clearly so nobody mistakes it for more precise than it is.
// ============================================================================

export type SeasonalItem = { name: string; category: string | null };

export const REGIONS: { code: string; label: string; hemisphere: 'N' | 'S' }[] = [
  { code: 'NL_EU', label: 'Netherlands & Central Europe', hemisphere: 'N' },
  { code: 'UK',    label: 'United Kingdom',                hemisphere: 'N' },
  { code: 'US',    label: 'United States (general)',       hemisphere: 'N' },
  { code: 'AU_NZ', label: 'Australia & New Zealand',       hemisphere: 'S' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// One authored Northern-temperate calendar. Category keys match FOOD_CATEGORIES
// in TabNourish.jsx where sensible, so logging from the shelf tags a real
// food group; null where it doesn't map cleanly.
const NORTHERN_TEMPERATE: Record<string, SeasonalItem[]> = {
  January:   [{ name: 'Leeks', category: 'root_veg' }, { name: 'Kale', category: 'leafy_greens' }, { name: 'Parsnip', category: 'root_veg' }, { name: 'Celeriac', category: 'root_veg' }, { name: 'Brussels sprouts', category: 'cruciferous' }, { name: 'Red cabbage', category: 'cruciferous' }, { name: 'Clementine', category: 'fruit' }, { name: 'Pear', category: 'fruit' }],
  February:  [{ name: 'Leeks', category: 'root_veg' }, { name: 'Kale', category: 'leafy_greens' }, { name: 'Swede', category: 'root_veg' }, { name: 'Parsnip', category: 'root_veg' }, { name: 'Purple sprouting broccoli', category: 'cruciferous' }, { name: 'Blood orange', category: 'fruit' }, { name: 'Pear', category: 'fruit' }],
  March:     [{ name: 'Spinach', category: 'leafy_greens' }, { name: 'Spring onion', category: 'root_veg' }, { name: 'Rhubarb', category: 'fruit' }, { name: 'Purple sprouting broccoli', category: 'cruciferous' }, { name: 'Watercress', category: 'leafy_greens' }, { name: 'Radish', category: 'root_veg' }],
  April:     [{ name: 'Asparagus', category: 'leafy_greens' }, { name: 'Spinach', category: 'leafy_greens' }, { name: 'Radish', category: 'root_veg' }, { name: 'Rhubarb', category: 'fruit' }, { name: 'Spring greens', category: 'leafy_greens' }, { name: 'New potatoes', category: 'grains_starchy' }],
  May:       [{ name: 'Asparagus', category: 'leafy_greens' }, { name: 'Peas', category: 'legumes' }, { name: 'Broad beans', category: 'legumes' }, { name: 'Radish', category: 'root_veg' }, { name: 'Strawberries', category: 'fruit' }, { name: 'New potatoes', category: 'grains_starchy' }],
  June:      [{ name: 'Peas', category: 'legumes' }, { name: 'Broad beans', category: 'legumes' }, { name: 'Courgette', category: 'cruciferous' }, { name: 'Strawberries', category: 'fruit' }, { name: 'Cherries', category: 'fruit' }, { name: 'Broccoli', category: 'cruciferous' }, { name: 'Lettuce', category: 'leafy_greens' }],
  July:      [{ name: 'Tomatoes', category: 'cruciferous' }, { name: 'Courgette', category: 'cruciferous' }, { name: 'Green beans', category: 'legumes' }, { name: 'Blueberries', category: 'fruit' }, { name: 'Raspberries', category: 'fruit' }, { name: 'Cherries', category: 'fruit' }, { name: 'Cucumber', category: 'cruciferous' }, { name: 'Sweetcorn', category: 'grains_starchy' }],
  August:    [{ name: 'Tomatoes', category: 'cruciferous' }, { name: 'Sweetcorn', category: 'grains_starchy' }, { name: 'Green beans', category: 'legumes' }, { name: 'Plums', category: 'fruit' }, { name: 'Blackberries', category: 'fruit' }, { name: 'Aubergine', category: 'cruciferous' }, { name: 'Peaches', category: 'fruit' }],
  September: [{ name: 'Pumpkin', category: 'root_veg' }, { name: 'Sweetcorn', category: 'grains_starchy' }, { name: 'Apples', category: 'fruit' }, { name: 'Plums', category: 'fruit' }, { name: 'Blackberries', category: 'fruit' }, { name: 'Beetroot', category: 'root_veg' }, { name: 'Mushrooms', category: 'mushrooms' }],
  October:   [{ name: 'Pumpkin', category: 'root_veg' }, { name: 'Squash', category: 'root_veg' }, { name: 'Apples', category: 'fruit' }, { name: 'Pear', category: 'fruit' }, { name: 'Beetroot', category: 'root_veg' }, { name: 'Mushrooms', category: 'mushrooms' }, { name: 'Kale', category: 'leafy_greens' }],
  November:  [{ name: 'Leeks', category: 'root_veg' }, { name: 'Squash', category: 'root_veg' }, { name: 'Kale', category: 'leafy_greens' }, { name: 'Brussels sprouts', category: 'cruciferous' }, { name: 'Parsnip', category: 'root_veg' }, { name: 'Pear', category: 'fruit' }, { name: 'Mushrooms', category: 'mushrooms' }],
  December:  [{ name: 'Leeks', category: 'root_veg' }, { name: 'Brussels sprouts', category: 'cruciferous' }, { name: 'Red cabbage', category: 'cruciferous' }, { name: 'Parsnip', category: 'root_veg' }, { name: 'Celeriac', category: 'root_veg' }, { name: 'Clementine', category: 'fruit' }, { name: 'Pomegranate', category: 'fruit' }],
};

export function currentMonthName(d: Date = new Date()): string {
  return MONTHS[d.getMonth()];
}

function regionMeta(region: string) {
  return REGIONS.find((r) => r.code === region) || REGIONS[0];
}

// The core lookup — region + date → today's seasonal shelf.
export function getSeasonalFoods(region: string = 'NL_EU', d: Date = new Date()): SeasonalItem[] {
  const meta = regionMeta(region);
  const monthIndex = meta.hemisphere === 'S' ? (d.getMonth() + 6) % 12 : d.getMonth();
  return NORTHERN_TEMPERATE[MONTHS[monthIndex]] || [];
}

export function regionLabel(region: string): string {
  return regionMeta(region).label;
}

// Best-effort, zero-permission region guess from the browser's IANA timezone.
// Deliberately coarse (a handful of prefix rules) — it's a sensible default,
// not a claim of precision. Always overridable by the person.
export function detectRegionFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('Australia/') || tz === 'Pacific/Auckland') return 'AU_NZ';
    if (tz === 'Europe/London' || tz === 'Europe/Dublin') return 'UK';
    if (tz.startsWith('America/')) return 'US';
    if (tz.startsWith('Europe/')) return 'NL_EU';
  } catch { /* Intl unsupported — fall through to default */ }
  return 'NL_EU';
}
