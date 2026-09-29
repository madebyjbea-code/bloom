// ============================================================================
// lib/mealParser.ts   →   src/lib/mealParser.ts
//
// Turns a typed meal into ingredient lines with gram estimates, e.g.
//   "Oatmeal with 2/3 cup dried oats, 1 cup of milk, 1 tbsp chia seeds,
//    2 dates, 1 tablespoon browned butter, three slices of apple chopped,
//    and a teaspoon of turmeric and black pepper"
// → Rolled oats ⅔ cup (53 g), Milk 1 cup (244 g), Chia seeds 1 tbsp (12 g) …
//
// Pure TypeScript, no network — runs in the browser and on the server
// (/api/parse-meal uses it as the fallback when no AI key is configured).
// ============================================================================

import { COMMON_SERVINGS, findServingKey } from './servingSizes';
import { classifySugar, SugarForm } from './nutrientModel';

export type ParsedItem = {
  name: string;          // clean food name, used for the USDA lookup
  display: string;       // what the person sees ("Rolled oats")
  qty: number;
  unit: string;          // normalised unit or '' for a count
  amountText: string;    // "⅔ cup", "2 dates", "a pinch"
  grams: number;
  prep: string[];        // chopped, mashed, browned…
  sugarForm: SugarForm;
  sugarReason: string;
  question?: { prompt: string; options: string[] }; // e.g. which milk?
};

const WORD_NUM: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, half: 0.5, quarter: 0.25, couple: 2, few: 3, some: 1, dozen: 12,
};
const UNICODE_FRAC: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125 };

// unit aliases → canonical
const UNIT_ALIASES: [RegExp, string][] = [
  [/^(cups?|c)$/, 'cup'],
  [/^(tablespoons?|tbsps?|tbs|tbl|tbls|el)$/, 'tbsp'],
  [/^(teaspoons?|tsps?|tl)$/, 'tsp'],
  [/^(grams?|gr|g)$/, 'g'],
  [/^(kilograms?|kilos?|kg)$/, 'kg'],
  [/^(millilit(re|er)s?|ml)$/, 'ml'],
  [/^(lit(re|er)s?|l)$/, 'l'],
  [/^(ounces?|oz)$/, 'oz'],
  [/^(pounds?|lbs?)$/, 'lb'],
  [/^(slices?)$/, 'slice'],
  [/^(pieces?|pcs?)$/, 'piece'],
  [/^(handfuls?)$/, 'handful'],
  [/^(pinch(es)?)$/, 'pinch'],
  [/^(dash(es)?)$/, 'dash'],
  [/^(cloves?)$/, 'clove'],
  [/^(cans?|tins?)$/, 'can'],
  [/^(scoops?)$/, 'scoop'],
  [/^(bowls?)$/, 'bowl'],
  [/^(glass(es)?)$/, 'glass'],
  [/^(mugs?)$/, 'cup'],
  [/^(squares?)$/, 'square'],
  [/^(bars?)$/, 'bar'],
  [/^(splash(es)?)$/, 'splash'],
  [/^(drizzles?)$/, 'drizzle'],
  [/^(knobs?)$/, 'knob'],
  [/^(sprinkles?)$/, 'sprinkle'],
  [/^(servings?|portions?)$/, 'serving'],
  [/^(fillets?)$/, 'piece'],
  [/^(pots?)$/, 'pot'],
];

const ML_PER: Record<string, number> = { cup: 240, tbsp: 15, tsp: 5, ml: 1, l: 1000, glass: 240, splash: 15 };
const FIXED_GRAMS: Record<string, number> = { g: 1, kg: 1000, oz: 28.35, lb: 453.6, pinch: 0.3, dash: 0.6, drizzle: 7, knob: 10, sprinkle: 1, scoop: 30, bowl: 250, can: 240, pot: 150 };

// grams per US cup for common foods (USDA household measures, rounded)
const G_PER_CUP: [RegExp, number][] = [
  [/oat/, 81], [/flour/, 125], [/\brice\b.*(dry|uncooked)|uncooked rice/, 185], [/cooked rice|\brice\b/, 158],
  [/quinoa/, 185], [/sugar/, 200], [/honey|syrup|molasses/, 340], [/milk|kefir|juice|water|tea|coffee|broth|stock/, 244],
  [/yog(h)?urt|skyr|quark/, 245], [/chia/, 170], [/flax|linseed/, 150], [/seed/, 140], [/almond|cashew|walnut|hazelnut|peanut|nut/, 140],
  [/butter|ghee/, 227], [/oil/, 218], [/cream/, 240], [/cheese/, 113], [/berr/, 148], [/spinach|rocket|lettuce|greens|kale/, 30],
  [/lentil|bean|chickpea/, 180], [/pasta|noodle/, 140], [/apple|pear|fruit/, 125], [/raisin|date|dried/, 150],
  [/granola|muesli/, 110], [/cocoa|cacao/, 86], [/turmeric|cinnamon|spice|pepper|cumin|paprika/, 110],
];

// grams per single item / slice when counted
const ITEM_GRAMS: [RegExp, { g: number; unit: string; plural: string }][] = [
  [/apple/, { g: 15, unit: 'slice', plural: 'slices' }],
  [/pear/, { g: 18, unit: 'slice', plural: 'slices' }],
  [/banana/, { g: 10, unit: 'slice', plural: 'slices' }],
  [/bread|toast|sourdough/, { g: 35, unit: 'slice', plural: 'slices' }],
  [/cheese|cheddar|gouda/, { g: 20, unit: 'slice', plural: 'slices' }],
  [/tomato/, { g: 20, unit: 'slice', plural: 'slices' }],
  [/cucumber/, { g: 7, unit: 'slice', plural: 'slices' }],
  [/lemon|lime/, { g: 8, unit: 'slice', plural: 'slices' }],
];

// words that describe preparation rather than the food
const PREP_WORDS = ['chopped', 'sliced', 'diced', 'grated', 'minced', 'fresh', 'raw', 'cooked', 'roasted', 'toasted', 'steamed',
  'boiled', 'fried', 'baked', 'grilled', 'browned', 'melted', 'mashed', 'pureed', 'puréed', 'blended', 'juiced', 'soaked',
  'frozen', 'ripe', 'large', 'small', 'medium', 'whole', 'halved', 'crushed', 'ground', 'shredded', 'peeled', 'warm', 'cold', 'hot', 'heaped', 'level', 'rounded'];

// names that need a nudge before they hit USDA
const NAME_ALIASES: [RegExp, string][] = [
  [/^(dried |rolled |porridge |old[- ]fashioned )?oats?( flakes)?$|^oatmeal$|^porridge oats$/, 'rolled oats'],
  [/^apples?$/, 'apple'], [/^bananas?$/, 'banana'], [/^eggs?$/, 'egg'], [/^dates?$/, 'dates'],
  [/^black pepper$|^pepper$/, 'black pepper'], [/^yogh?urt$/, 'yoghurt'],
];

// prep words worth keeping in the visible name (they change the food)
const SHOWN_PREP = ['browned', 'mashed', 'pureed', 'puréed', 'blended', 'roasted', 'toasted', 'fried', 'grilled', 'baked', 'steamed', 'boiled', 'juiced'];

const PROTECTED_AND = ['mac and cheese', 'fish and chips', 'bread and butter', 'sweet and sour', 'salt and vinegar'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function fmtQty(q: number): string {
  const whole = Math.floor(q + 1e-9);
  const frac = q - whole;
  const fracs: [number, string][] = [[0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']];
  const hit = fracs.find(([v]) => Math.abs(frac - v) < 0.02);
  if (frac < 0.02) return String(whole);
  if (hit) return whole ? `${whole}${hit[1]}` : hit[1];
  return String(Math.round(q * 10) / 10);
}

function parseQuantity(tokens: string[]): { qty: number | null; used: number } {
  let i = 0, qty: number | null = null;
  const t0 = tokens[0];
  if (!t0) return { qty: null, used: 0 };
  // "a couple of", "a few", "half a"
  if ((t0 === 'a' || t0 === 'an') && tokens[1] && ['couple', 'few', 'half', 'quarter', 'dozen'].includes(tokens[1])) {
    qty = WORD_NUM[tokens[1]]; i = 2;
    if (tokens[i] === 'of') i++;
    return { qty, used: i };
  }
  if (t0 === 'half' && (tokens[1] === 'a' || tokens[1] === 'an')) return { qty: 0.5, used: 2 };
  const num = (s: string): number | null => {
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    if (/^\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return b ? a / b : null; }
    if (/^\d+[½⅓⅔¼¾⅛]$/.test(s)) return parseInt(s, 10) + UNICODE_FRAC[s.slice(-1)];
    if (UNICODE_FRAC[s] != null) return UNICODE_FRAC[s];
    if (/^\d+(\.\d+)?-\d+(\.\d+)?$/.test(s)) { const [a, b] = s.split('-').map(Number); return (a + b) / 2; } // "2-3" → 2.5
    if (WORD_NUM[s] != null) return WORD_NUM[s];
    return null;
  };
  const first = num(t0);
  if (first == null) return { qty: null, used: 0 };
  qty = first; i = 1;
  // mixed number "1 1/2"
  if (tokens[1] && /^\d+\/\d+$/.test(tokens[1]) && Number.isInteger(first)) { qty += num(tokens[1]) || 0; i = 2; }
  return { qty, used: i };
}

function normaliseUnit(tok: string | undefined): string | null {
  if (!tok) return null;
  const t = tok.toLowerCase().replace(/\.$/, '');
  for (const [re, u] of UNIT_ALIASES) if (re.test(t)) return u;
  return null;
}

function cleanName(raw: string): { name: string; prep: string[] } {
  let words = raw.toLowerCase().replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
  const prep: string[] = [];
  words = words.filter((w) => {
    if (PREP_WORDS.includes(w)) { prep.push(w); return false; }
    return !['of', 'the', 'some', 'with'].includes(w);
  });
  let name = words.join(' ').trim();
  for (const [re, to] of NAME_ALIASES) if (re.test(name)) { name = to; break; }
  // simple singular: "apples" → "apple" when the singular is a known food
  if (!COMMON_SERVINGS[name] && name.endsWith('s') && COMMON_SERVINGS[name.slice(0, -1)]) name = name.slice(0, -1);
  return { name, prep };
}

function gramsFor(name: string, qty: number, unit: string): { grams: number; amountText: string } {
  const key = findServingKey(name);
  const serving = key ? COMMON_SERVINGS[key] : null;
  const servingUnit = serving?.unitLabel.split(',')[0].trim().toLowerCase() || '';
  const q = fmtQty(qty);

  if (FIXED_GRAMS[unit] != null) {
    const g = qty * FIXED_GRAMS[unit];
    const txt = unit === 'pinch' ? (qty === 1 ? 'a pinch' : `${q} pinches`) : `${q} ${unit}`;
    return { grams: g, amountText: txt };
  }
  if (ML_PER[unit] != null) {
    const ml = qty * ML_PER[unit];
    // the dictionary already knows grams for this exact volume unit
    if (serving && ML_PER[servingUnit] != null) {
      return { grams: (ml / ML_PER[servingUnit]) * serving.grams, amountText: `${q} ${unit}${unit === 'cup' && qty > 1 ? 's' : ''}` };
    }
    const perCup = G_PER_CUP.find(([re]) => re.test(name))?.[1] ?? 200;
    return { grams: (ml / 240) * perCup, amountText: `${q} ${unit}${unit === 'cup' && qty > 1 ? 's' : ''}` };
  }
  if (unit === 'slice' || unit === 'piece' || unit === 'square') {
    const item = ITEM_GRAMS.find(([re]) => re.test(name))?.[1];
    const g = item ? item.g : serving && /slice|square|fillet|piece/.test(servingUnit) ? serving.grams : 30;
    return { grams: qty * g, amountText: `${q} ${unit}${qty > 1 ? 's' : ''}` };
  }
  if (unit === 'handful') {
    const g = serving && servingUnit === 'handful' ? serving.grams : 30;
    return { grams: qty * g, amountText: qty === 1 ? 'a handful' : `${q} handfuls` };
  }
  if (unit === 'clove') return { grams: qty * 3, amountText: `${q} clove${qty > 1 ? 's' : ''}` };
  if (unit === 'serving') return { grams: qty * (serving?.grams || 100), amountText: `${q} serving${qty > 1 ? 's' : ''}` };
  if (unit === 'bar') return { grams: qty * 45, amountText: `${q} bar${qty > 1 ? 's' : ''}` };
  // plain count ("2 dates", "an egg") or no amount at all
  if (serving) {
    const label = qty <= 1 ? serving.unitLabel : serving.pluralLabel;
    const txt = qty === 1 && servingUnit === 'pinch' ? 'a pinch' : `${q} ${label}`;
    return { grams: qty * serving.grams, amountText: txt };
  }
  return { grams: qty * 100, amountText: `${q} serving${qty > 1 ? 's' : ''}` };
}

const MILK_RE = /^(milk|cow'?s milk)$/;

export function parseMeal(text: string, quality?: string | null): { title: string | null; items: ParsedItem[] } {
  let src = ` ${text
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')        // "200g" → "200 g"
    .replace(/\s+/g, ' ').trim()} `;
  let title: string | null = null;

  // "Oatmeal with 2/3 cup oats, …" → title "Oatmeal"
  const withIdx = src.toLowerCase().indexOf(' with ');
  if (withIdx > 0) {
    const head = src.slice(0, withIdx).trim();
    const tail = src.slice(withIdx + 6);
    if (head && !/\d|[½⅓⅔¼¾]/.test(head) && /\d|[½⅓⅔¼¾]|\b(a|an|one|two|three|some|half)\b/i.test(tail) && head.split(' ').length <= 4) {
      title = cap(head);
      src = ` ${tail} `;
    }
  }

  let work = src.toLowerCase();
  PROTECTED_AND.forEach((p, i) => { work = work.split(p).join(`__keep${i}__`); });
  const parts = work
    .split(/,|;|\n|\band then\b|\band\b|\bplus\b|\bwith\b|\btopped with\b|\bon\b|\bover\b|&|\+/)
    .map((s) => s.replace(/__keep(\d+)__/g, (_, i) => PROTECTED_AND[Number(i)]).trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  for (const part of parts) {
    const tokens = part.split(' ').filter(Boolean);
    let { qty, used } = parseQuantity(tokens);
    let rest = tokens.slice(used);
    let unit = normaliseUnit(rest[0]) || '';
    if (unit) rest = rest.slice(1);
    if (rest[0] === 'of') rest = rest.slice(1);
    const { name, prep } = cleanName(rest.join(' '));
    if (!name) continue;

    // No amount given: spices default to a pinch, everything else to 1 serving
    if (qty == null) {
      const key = findServingKey(name);
      qty = 1;
      if (!unit && key && /pinch/.test(COMMON_SERVINGS[key].unitLabel)) unit = 'pinch';
    }
    const { grams, amountText } = gramsFor(name, qty, unit);
    const sugar = classifySugar(name, prep, quality);
    const item: ParsedItem = {
      name,
      display: cap([...prep.filter((w) => SHOWN_PREP.includes(w)), name].join(' ')),
      qty, unit, amountText,
      grams: Math.max(0.1, Math.round(grams * 10) / 10),
      prep,
      sugarForm: sugar.form,
      sugarReason: sugar.reason,
    };
    if (MILK_RE.test(name)) {
      item.question = { prompt: 'Which milk?', options: ['Semi-skimmed milk', 'Whole milk', 'Skimmed milk', 'Oat milk', 'Soy milk', 'Almond milk'] };
      item.name = 'semi-skimmed milk';
      item.display = 'Milk';
    }
    items.push(item);
  }
  return { title, items };
}

// Recalculate grams after the person edits an amount chip.
export function rescaleItem(item: ParsedItem, qty: number): ParsedItem {
  const { grams, amountText } = gramsFor(item.name, qty, item.unit);
  return { ...item, qty, grams: Math.max(0.1, Math.round(grams * 10) / 10), amountText };
}
