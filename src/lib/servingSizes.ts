// ============================================================================
// lib/servingSizes.ts   →   src/lib/servingSizes.ts
//
// Converts a food name into a natural-language serving ("1 egg", "half a bell
// pepper", "a handful of blueberries") instead of asking anyone to think in
// grams. Grams still happen under the hood — USDA's %DV math needs a gram
// amount — but the person never sees or enters one.
//
// Priority when resolving a food's serving:
//   1. Notion pantry data (serving_grams / serving_other), if this food is
//      one you've curated — your own numbers win.
//   2. This built-in dictionary of common-sense serving sizes.
//   3. A generic "1 serving (~100g)" fallback so nothing ever gets stuck.
// ============================================================================

export type ServingInfo = { grams: number; unitLabel: string; pluralLabel: string };

// Approximate standard serving sizes (USDA/FDA reference amounts where
// available). These are estimates for everyday logging, not lab measurements.
export const COMMON_SERVINGS: Record<string, ServingInfo> = {
  'egg':                    { grams: 50,  unitLabel: 'egg',                 pluralLabel: 'eggs' },
  'chicken breast':         { grams: 120, unitLabel: 'chicken breast',      pluralLabel: 'chicken breasts' },
  'salmon':                 { grams: 120, unitLabel: 'salmon fillet',       pluralLabel: 'salmon fillets' },
  'tuna':                   { grams: 100, unitLabel: 'serving',             pluralLabel: 'servings' },
  'ground beef':            { grams: 100, unitLabel: 'serving',             pluralLabel: 'servings' },
  'mackerel':               { grams: 100, unitLabel: 'fillet',              pluralLabel: 'fillets' },
  'sardines':               { grams: 50,  unitLabel: 'serving',             pluralLabel: 'servings' },
  'herring':                { grams: 100, unitLabel: 'fillet',              pluralLabel: 'fillets' },
  'greek yoghurt':          { grams: 170, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'kefir':                  { grams: 240, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'cheddar cheese':         { grams: 30,  unitLabel: 'slice',               pluralLabel: 'slices' },
  'cottage cheese':         { grams: 113, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'milk':                   { grams: 240, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'lentils':                { grams: 198, unitLabel: 'cup, cooked',         pluralLabel: 'cups, cooked' },
  'chickpeas':               { grams: 164, unitLabel: 'cup',                pluralLabel: 'cups' },
  'black beans':            { grams: 172, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'edamame':                { grams: 155, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'kidney beans':           { grams: 177, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'almonds':                { grams: 28,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'walnuts':                { grams: 28,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'chia seeds':             { grams: 15,  unitLabel: 'tbsp',                pluralLabel: 'tbsp' },
  'flaxseed':               { grams: 15,  unitLabel: 'tbsp',                pluralLabel: 'tbsp' },
  'pumpkin seeds':          { grams: 28,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'avocado':                { grams: 150, unitLabel: 'avocado',             pluralLabel: 'avocados' },
  'olive oil':              { grams: 14,  unitLabel: 'tbsp',                pluralLabel: 'tbsp' },
  'coconut oil':            { grams: 14,  unitLabel: 'tbsp',                pluralLabel: 'tbsp' },
  'rice':                   { grams: 158, unitLabel: 'cup, cooked',         pluralLabel: 'cups, cooked' },
  'quinoa':                 { grams: 185, unitLabel: 'cup, cooked',         pluralLabel: 'cups, cooked' },
  'potato':                 { grams: 170, unitLabel: 'medium potato',       pluralLabel: 'medium potatoes' },
  'sweet potato':           { grams: 130, unitLabel: 'medium sweet potato', pluralLabel: 'medium sweet potatoes' },
  'oats':                   { grams: 80,  unitLabel: 'cup, dry',            pluralLabel: 'cups, dry' },
  'whole grain bread':      { grams: 30,  unitLabel: 'slice',               pluralLabel: 'slices' },
  'broccoli':               { grams: 90,  unitLabel: 'cup',                 pluralLabel: 'cups' },
  'cauliflower':            { grams: 100, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'kale':                   { grams: 67,  unitLabel: 'cup',                 pluralLabel: 'cups' },
  'brussels sprouts':       { grams: 90,  unitLabel: 'cup',                 pluralLabel: 'cups' },
  'carrot':                 { grams: 60,  unitLabel: 'medium carrot',       pluralLabel: 'medium carrots' },
  'beetroot':               { grams: 80,  unitLabel: 'medium beet',         pluralLabel: 'medium beets' },
  'parsnip':                { grams: 80,  unitLabel: 'medium parsnip',      pluralLabel: 'medium parsnips' },
  'celeriac':               { grams: 100, unitLabel: 'cup, chopped',        pluralLabel: 'cups, chopped' },
  'spinach':                { grams: 30,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'rocket':                 { grams: 20,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'swiss chard':            { grams: 36,  unitLabel: 'cup',                 pluralLabel: 'cups' },
  'watercress':             { grams: 34,  unitLabel: 'cup',                 pluralLabel: 'cups' },
  'banana':                 { grams: 118, unitLabel: 'medium banana',       pluralLabel: 'medium bananas' },
  'apple':                  { grams: 180, unitLabel: 'medium apple',        pluralLabel: 'medium apples' },
  'blueberries':            { grams: 74,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'orange':                 { grams: 130, unitLabel: 'medium orange',       pluralLabel: 'medium oranges' },
  'strawberries':           { grams: 100, unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'kimchi':                 { grams: 50,  unitLabel: 'serving',             pluralLabel: 'servings' },
  'sauerkraut':             { grams: 50,  unitLabel: 'serving',             pluralLabel: 'servings' },
  'miso':                   { grams: 15,  unitLabel: 'tbsp',                pluralLabel: 'tbsp' },
  'kombucha':               { grams: 240, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'shiitake mushrooms':     { grams: 70,  unitLabel: 'cup, sliced',         pluralLabel: 'cups, sliced' },
  'portobello mushrooms':   { grams: 85,  unitLabel: 'portobello cap',      pluralLabel: 'portobello caps' },
  'oyster mushrooms':       { grams: 85,  unitLabel: 'cup',                 pluralLabel: 'cups' },
  'water':                  { grams: 240, unitLabel: 'glass',               pluralLabel: 'glasses' },
  'herbal tea':             { grams: 240, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'coconut water':          { grams: 240, unitLabel: 'cup',                 pluralLabel: 'cups' },
  'bell pepper':            { grams: 150, unitLabel: 'bell pepper',         pluralLabel: 'bell peppers' },
  'leeks':                  { grams: 89,  unitLabel: 'medium leek',         pluralLabel: 'medium leeks' },
  'red cabbage':            { grams: 89,  unitLabel: 'cup, shredded',       pluralLabel: 'cups, shredded' },
  'clementine':             { grams: 74,  unitLabel: 'clementine',          pluralLabel: 'clementines' },
  'pear':                   { grams: 178, unitLabel: 'medium pear',         pluralLabel: 'medium pears' },
  'swede':                  { grams: 140, unitLabel: 'cup, cubed',          pluralLabel: 'cups, cubed' },
  'purple sprouting broccoli': { grams: 90, unitLabel: 'cup',               pluralLabel: 'cups' },
  'blood orange':           { grams: 130, unitLabel: 'medium orange',       pluralLabel: 'medium oranges' },
  'spring onion':           { grams: 15,  unitLabel: 'stalk',               pluralLabel: 'stalks' },
  'rhubarb':                { grams: 120, unitLabel: 'cup, diced',          pluralLabel: 'cups, diced' },
  'radish':                 { grams: 58,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'asparagus':              { grams: 90,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'new potatoes':           { grams: 150, unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'peas':                   { grams: 80,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'broad beans':            { grams: 80,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'courgette':              { grams: 120, unitLabel: 'medium courgette',    pluralLabel: 'medium courgettes' },
  'cherries':               { grams: 75,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'lettuce':                { grams: 36,  unitLabel: 'cup, shredded',       pluralLabel: 'cups, shredded' },
  'tomatoes':               { grams: 123, unitLabel: 'medium tomato',      pluralLabel: 'medium tomatoes' },
  'green beans':            { grams: 83,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'raspberries':            { grams: 62,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'cucumber':               { grams: 104, unitLabel: 'cup, sliced',         pluralLabel: 'cups, sliced' },
  'sweetcorn':              { grams: 90,  unitLabel: 'ear',                 pluralLabel: 'ears' },
  'plums':                  { grams: 66,  unitLabel: 'plum',                pluralLabel: 'plums' },
  'blackberries':           { grams: 72,  unitLabel: 'handful',             pluralLabel: 'handfuls' },
  'aubergine':              { grams: 82,  unitLabel: 'cup, cubed',          pluralLabel: 'cups, cubed' },
  'peaches':                { grams: 150, unitLabel: 'medium peach',        pluralLabel: 'medium peaches' },
  'pumpkin':                { grams: 116, unitLabel: 'cup, cubed',          pluralLabel: 'cups, cubed' },
  'squash':                 { grams: 116, unitLabel: 'cup, cubed',          pluralLabel: 'cups, cubed' },
  'mushrooms':              { grams: 70,  unitLabel: 'cup, sliced',         pluralLabel: 'cups, sliced' },
  'pomegranate':            { grams: 87,  unitLabel: 'cup, seeds',          pluralLabel: 'cups, seeds' },
};

const GENERIC: ServingInfo = { grams: 100, unitLabel: 'serving', pluralLabel: 'servings' };

// pantryHint: real curation from your Notion pantry (serving_grams / serving_other),
// which always wins over the built-in dictionary when present.
export function resolveServing(name: string, pantryHint?: { grams?: number | null; label?: string | null }): ServingInfo {
  if (pantryHint?.label) {
    return { grams: pantryHint.grams || 100, unitLabel: pantryHint.label, pluralLabel: pantryHint.label };
  }
  const key = name.trim().toLowerCase();
  if (COMMON_SERVINGS[key]) return COMMON_SERVINGS[key];
  const match = Object.keys(COMMON_SERVINGS).find((k) => key.includes(k) || k.includes(key));
  if (match) return COMMON_SERVINGS[match];
  return pantryHint?.grams ? { ...GENERIC, grams: pantryHint.grams } : GENERIC;
}

// Quantity steps shown as quick-tap chips — no gram math for the person.
export const QTY_STEPS = [0.5, 1, 1.5, 2, 3];

export function qtyLabel(q: number): string {
  const labels: Record<number, string> = { 0.5: '½', 1: '1', 1.5: '1½', 2: '2', 2.5: '2½', 3: '3' };
  return labels[q] || String(q);
}

// "Half a bell pepper" / "1 egg" / "1½ cups, cooked" / "a handful"
export function servingText(serving: ServingInfo, qty: number): string {
  if (qty === 0.5) return `Half a ${serving.unitLabel}`;
  if (qty === 1) return `1 ${serving.unitLabel}`;
  return `${qtyLabel(qty)} ${serving.pluralLabel || serving.unitLabel}`;
}
