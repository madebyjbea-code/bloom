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
  estimated?: boolean;   // no amount was given — we guessed, worth a check
};

export type MealKind = 'single' | 'recipe' | 'takeout';
export type ParsedMeal = {
  title: string | null;
  items: ParsedItem[];
  kind: MealKind;
  servingsMade: number | null;    // recipe: how many servings the whole pot made
  servingsEaten: number | null;   // recipe: how many of those you ate
  servingsGuessed?: boolean;      // servingsMade wasn't stated — estimated from the ingredients
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
  [/paste|pur[ée]e|passata|tomato sauce|pesto/, 262], [/granola|muesli/, 110], [/cocoa|cacao/, 86], [/turmeric|cinnamon|spice|pepper|cumin|paprika/, 110],
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
  'frozen', 'ripe', 'large', 'small', 'medium', 'whole', 'halved', 'crushed', 'ground', 'shredded', 'peeled', 'warm', 'cold', 'hot', 'heaped', 'level', 'rounded',
  'stirred', 'mixed', 'added', 'tossed', 'thrown', 'sauteed', 'sautéed', 'caramelised', 'caramelized', 'finely', 'roughly', 'thinly', 'big'];

// size words scale a counted item ("1 small onion" ≈ 70 g vs a medium 110 g)
const SIZE_FACTOR: Record<string, number> = { small: 0.65, medium: 1, large: 1.4, big: 1.4 };

// Grains & pasta weighed in a recipe are almost always weighed DRY — look up
// the raw values or the nutrients come out ~3× too low.
const DRY_LOOKUP: [RegExp, string][] = [
  [/brown rice/, 'rice brown long-grain raw'],
  [/risotto|arborio|carnaroli|paella rice|sushi rice|pudding rice/, 'rice white medium-grain raw'],
  [/basmati|jasmine|\brice\b/, 'rice white long-grain raw'],
  [/rice noodle/, 'rice noodles dry'],
  [/egg noodle/, 'egg noodles dry'],
  [/spaghetti|penne|pasta|macaroni|fusilli|linguine|tagliatelle|orzo|lasagn|noodle/, 'pasta dry enriched'],
  [/quinoa/, 'quinoa uncooked'],
  [/red lentil|green lentil|brown lentil|lentil/, 'lentils raw'],
  [/couscous/, 'couscous dry'],
  [/bulgur/, 'bulgur dry'],
  [/barley/, 'barley pearled raw'],
];
const DRY_GRAMS_PER_SERVING = 80; // typical dry portion of rice / pasta / grains

// broth & stock: point at the home-prepared USDA entries
const BROTH_LOOKUP: [RegExp, string][] = [
  [/beef (bone )?(broth|stock)/, 'soup stock beef home-prepared'],
  [/(vegetable|veggie|veg) (broth|stock)/, 'soup vegetable broth ready to serve'],
  [/fish (broth|stock)/, 'soup stock fish home-prepared'],
  [/(broth|stock|bouillon)/, 'soup stock chicken home-prepared'],
];

// common misspellings / split words we've seen typed
const TYPO_FIXES: [RegExp, string][] = [
  [/\btea\s+spoons?\b/gi, 'teaspoons'], [/\btable\s+spoons?\b/gi, 'tablespoons'],
  [/\bgloves?\s+(of\s+)?garlic/gi, 'cloves of garlic'], [/\bparm(e|a|i)s(e|a)?an\b|\bparmesean\b|\bparmigiano( reggiano)?\b/gi, 'parmesan'],
  [/\btumeric\b/gi, 'turmeric'], [/\bbrocolli\b|\bbroccolli\b/gi, 'broccoli'], [/\bzucchinni\b/gi, 'zucchini'],
  [/\blitre?s?\b|\bliters?\b/gi, 'l'],
];

const WORD_NUMS = '(\\d+(?:\\.\\d+)?|\\d+\\/\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|a half|a quarter|a third)';
function numOf(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  if (/^\d+\/\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b ? a / b : null; }
  const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, half: 0.5, 'a half': 0.5, 'a quarter': 0.25, 'a third': 1 / 3 };
  return words[t] ?? null;
}

// Pulls "made 4 servings" / "serves 4" / "I ate 1 serving" / "had half of it"
// out of the text so the ingredient split doesn't see them.
export function extractServings(text: string): { text: string; made: number | null; eaten: number | null; recipeVerb: boolean } {
  let t = text;
  let made: number | null = null, eaten: number | null = null;
  const N = WORD_NUMS;
  const madeRes = [
    new RegExp(`[,;(]?\\s*(?:and\\s+)?(?:it\\s+|this\\s+)?(?:makes?|made|serves?|served|yields?|yielded|enough for|for)\\s+(?:about\\s+|around\\s+|roughly\\s+)?${N}\\s*(?:servings?|portions?|people|persons|bowls?|plates?|meals?)\\b\\)?`, 'i'),
    new RegExp(`[,;(]?\\s*${N}\\s*(?:servings?|portions?)\\s+(?:total|in total|altogether|overall)\\)?`, 'i'),
    new RegExp(`\\(\\s*${N}\\s*(?:servings?|portions?)\\s*\\)`, 'i'),
  ];
  for (const re of madeRes) {
    const m = t.match(re);
    if (m) { made = numOf(m[1]); t = t.replace(m[0], ' '); break; }
  }
  const eatenRes = [
    new RegExp(`[,;]?\\s*(?:and\\s+)?(?:i\\s+|we\\s+)?(?:ate|had|eaten|eat|finished)\\s+(?:about\\s+|around\\s+|roughly\\s+|just\\s+)?${N}\\s*(?:servings?|portions?|bowls?|plates?|helpings?)(?:\\s+of\\s+it)?\\b`, 'i'),
    new RegExp(`[,;]?\\s*(?:and\\s+)?(?:i\\s+|we\\s+)?(?:ate|had|eaten|finished)\\s+(half|a half|a quarter|a third|one third|two thirds)(?:\\s+of\\s+(?:it|that|the (?:pot|pan|dish|recipe|batch)))?\\b`, 'i'),
  ];
  for (const re of eatenRes) {
    const m = t.match(re);
    if (m) {
      const v = m[1].toLowerCase() === 'one third' ? 1 / 3 : m[1].toLowerCase() === 'two thirds' ? 2 / 3 : numOf(m[1]);
      eaten = v;
      // a fraction "of it" means of the whole pot
      if (v != null && v < 1 && !/servings?|portions?|bowls?|plates?|helpings?/i.test(m[0])) { eaten = v; if (made == null) made = 1; }
      t = t.replace(m[0], ' ');
      break;
    }
  }
  const recipeVerb = /^\s*(?:i\s+|we\s+)?(?:made|cooked|baked|prepared|prepped|meal[- ]prepped|whipped up|threw together|batch[- ]cooked)\b/i.test(t);
  t = t.replace(/^\s*(?:i\s+|we\s+)?(?:made|cooked|baked|prepared|prepped|meal[- ]prepped|whipped up|threw together|batch[- ]cooked)\s+(?:a\s+|an\s+|some\s+|my\s+|our\s+)?/i, '');
  return { text: t.replace(/\s+/g, ' ').replace(/[,;]\s*$/, '').trim(), made, eaten, recipeVerb };
}

// names that need a nudge before they hit USDA
const NAME_ALIASES: [RegExp, string][] = [
  [/^(dried |rolled |porridge |old[- ]fashioned )?oats?( flakes)?$|^oatmeal$|^porridge oats$/, 'rolled oats'],
  [/^apples?$/, 'apple'], [/^bananas?$/, 'banana'], [/^eggs?$/, 'egg'], [/^dates?$/, 'dates'],
  [/^black pepper$|^pepper$/, 'black pepper'], [/^yogh?urt$/, 'yoghurt'],
  [/^salmon fillets?$/, 'salmon'], [/^chicken breasts?$/, 'chicken breast'], [/^tomato paste$|^tomato pur[ée]e$/, 'tomato paste'],
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
  while (words.length > 1 && ['in', 'into', 'it', 'through', 'on', 'top'].includes(words[words.length - 1])) words.pop();
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
    const plural = qty > 1 && !['g', 'kg', 'oz', 'lb'].includes(unit) ? 's' : '';
    const txt = unit === 'pinch' ? (qty === 1 ? 'a pinch' : `${q} pinches`) : `${q} ${unit}${plural}`;
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

export function parseMeal(text: string, quality?: string | null): ParsedMeal {
  let fixed = text.replace(/(\d)([a-zA-Z])/g, '$1 $2');   // "200g" → "200 g"
  for (const [re, to] of TYPO_FIXES) fixed = fixed.replace(re, to);
  const sv = extractServings(fixed.replace(/\s+/g, ' ').trim());
  let src = ` ${sv.text} `;
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
    .split(/,|;|\n|\.\s|\.$|\band then\b|\band\b|\bplus\b|\bwith\b|\btopped with\b|\bon\b|\bover\b|&|\+/)
    .map((s) => s.replace(/__keep(\d+)__/g, (_, i) => PROTECTED_AND[Number(i)]).trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  // decided up-front so grains get dry lookups and no-amount items scale
  const strongRecipe = sv.made != null || sv.recipeVerb || sv.eaten != null;
  const isRecipe = strongRecipe || parts.length >= 6;
  for (const part of parts) {
    const tokens = part.split(' ').filter(Boolean);
    let { qty, used } = parseQuantity(tokens);
    let rest = tokens.slice(used);
    let unit = normaliseUnit(rest[0]) || '';
    if (unit) rest = rest.slice(1);
    if (rest[0] === 'of') rest = rest.slice(1);
    const { name, prep } = cleanName(rest.join(' '));
    if (!name) continue;

    // cooking water adds nothing — leave it out of recipes
    if (isRecipe && /^(water|tap water|boiling water|hot water)$/.test(name)) continue;

    // No amount given: spices default to a pinch, everything else to 1 serving
    let estimated = false;
    if (qty == null) {
      const key = findServingKey(name);
      qty = 1;
      estimated = true;
      if (!unit && key && /pinch/.test(COMMON_SERVINGS[key].unitLabel)) { unit = 'pinch'; estimated = false; }
    }
    let { grams, amountText } = gramsFor(name, qty, unit);
    // "1 small onion", "2 large eggs"
    const size = prep.find((w) => SIZE_FACTOR[w] != null);
    if (size && !unit && size !== 'medium') {
      grams *= SIZE_FACTOR[size];
      amountText = amountText.replace(/\bmedium\s+/, '');
      amountText = amountText.replace(new RegExp(`^(${fmtQty(qty).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s+`), `$1 ${size} `);
    }
    // what we send to USDA
    let lookup = name;
    const weighed = ['g', 'kg', 'oz', 'lb', 'cup'].includes(unit);
    if (strongRecipe && weighed && !prep.includes('cooked')) {
      const dry = DRY_LOOKUP.find(([re]) => re.test(name));
      if (dry) lookup = dry[1];
    }
    const broth = BROTH_LOOKUP.find(([re]) => re.test(name));
    if (broth) lookup = broth[1];
    if (/^(beef mince|minced beef|ground beef|mince)$/.test(name)) lookup = 'beef ground raw';
    if (unit === 'can' && !/canned/.test(lookup)) lookup = `${lookup} canned`;

    const sugar = classifySugar(name, prep, quality);
    const item: ParsedItem = {
      name: lookup,
      display: cap([...prep.filter((w) => SHOWN_PREP.includes(w)), name].join(' ')),
      qty, unit, amountText,
      grams: Math.max(0.1, Math.round(grams * 10) / 10),
      prep,
      sugarForm: sugar.form,
      sugarReason: sugar.reason,
      ...(estimated ? { estimated: true } : {}),
    };
    if (MILK_RE.test(name)) {
      item.question = { prompt: 'Which milk?', options: ['Semi-skimmed milk', 'Whole milk', 'Skimmed milk', 'Oat milk', 'Soy milk', 'Almond milk'] };
      item.name = 'semi-skimmed milk';
      item.display = 'Milk';
    }
    items.push(item);
  }

  if (!isRecipe) return { title, items, kind: 'single', servingsMade: null, servingsEaten: null };

  // How many servings did the pot make? Use what they said, else estimate:
  // dry grains ÷ 80 g, else counted proteins (fillets, breasts), else weight.
  let made = sv.made;
  let guessed = false;
  if (made == null) {
    guessed = true;
    const dryG = items.filter((i) => i.name !== i.display.toLowerCase() && DRY_LOOKUP.some(([, l]) => l === i.name)).reduce((s, i) => s + i.grams, 0);
    const proteinCount = items.filter((i) => !i.unit && /salmon|chicken|fillet|breast|steak|chop|thigh|fish/.test(i.name)).reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.grams, 0);
    made = dryG >= 60 ? Math.round(dryG / DRY_GRAMS_PER_SERVING) : proteinCount >= 2 ? proteinCount : Math.round(total / 450);
    made = Math.min(12, Math.max(1, made || 1));
  }
  if (guessed && made === 1 && !strongRecipe) return { title, items, kind: 'single', servingsMade: null, servingsEaten: null };

  // An ingredient with no amount in a recipe ("parmesan grated in") is a
  // whole-pot amount — scale the 1-serving guess up to the pot.
  if (made > 1) {
    for (const it of items) {
      if (it.estimated && it.unit !== 'pinch') {
        const r = rescaleItem(it, made);
        it.qty = r.qty; it.grams = r.grams; it.amountText = r.amountText;
      }
    }
  }
  return {
    title, items, kind: 'recipe',
    servingsMade: made,
    servingsEaten: sv.eaten ?? 1,
    ...(guessed ? { servingsGuessed: true } : {}),
  };
}

// Recalculate grams after the person edits an amount chip.
export function rescaleItem(item: ParsedItem, qty: number): ParsedItem {
  const { grams, amountText } = gramsFor(item.name, qty, item.unit);
  return { ...item, qty, grams: Math.max(0.1, Math.round(grams * 10) / 10), amountText };
}
