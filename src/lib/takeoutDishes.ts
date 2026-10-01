// ============================================================================
// lib/takeoutDishes.ts   →   src/lib/takeoutDishes.ts
//
// Reads a described takeout / restaurant meal into its main components, e.g.
//   "pad thai with chicken, large serving"
//   → Rice noodles 250 g, Chicken 100 g, Egg 50 g, Bean sprouts 40 g,
//     Peanuts 15 g, Cooking oil 15 g, Sugar 10 g (free), Fish sauce 10 g …
//     portion: large (×1.35)
//
// Grams are for a REGULAR restaurant portion (cooked weights), including the
// oil and sugar restaurants typically add. The portion size and how much was
// eaten are returned separately so the person can change them with one tap.
//
// Used as the fallback when no ANTHROPIC_API_KEY is set — with the key,
// Claude handles any dish and this list isn't needed.
// ============================================================================

import { parseMeal, ParsedItem } from './mealParser';
import { classifySugar } from './nutrientModel';

export type Portion = 'small' | 'regular' | 'large' | 'xl';
export const PORTION_FACTOR: Record<Portion, number> = { small: 0.75, regular: 1, large: 1.35, xl: 1.7 };
export const PORTION_LABEL: Record<Portion, string> = { small: 'Small', regular: 'Regular', large: 'Large', xl: 'Extra large' };

type Part = { name: string; display: string; grams: number; prep?: string[]; protein?: boolean };
type Dish = { re: RegExp; title: string; parts: Part[]; perUnit?: { re: RegExp; count: number } };

// The default protein of a dish is marked protein:true and is swapped when
// the person names another ("with tofu", "prawn", "beef").
const PROTEINS: [RegExp, Part][] = [
  [/\bchicken\b/, { name: 'chicken breast cooked', display: 'Chicken', grams: 100 }],
  [/\btofu\b/, { name: 'tofu firm', display: 'Tofu', grams: 110 }],
  [/\b(shrimps?|prawns?)\b/, { name: 'shrimp cooked', display: 'Prawns', grams: 90 }],
  [/\bbeef\b/, { name: 'beef sirloin cooked', display: 'Beef', grams: 100 }],
  [/\bpork\b/, { name: 'pork loin cooked', display: 'Pork', grams: 100 }],
  [/\blamb\b/, { name: 'lamb cooked', display: 'Lamb', grams: 100 }],
  [/\bduck\b/, { name: 'duck roasted', display: 'Duck', grams: 100 }],
  [/\bsalmon\b/, { name: 'salmon cooked', display: 'Salmon', grams: 100 }],
  [/\btuna\b/, { name: 'tuna raw', display: 'Tuna', grams: 90 }],
  [/\b(cod|white fish|fish)\b/, { name: 'cod cooked', display: 'White fish', grams: 110 }],
  [/\bpaneer\b/, { name: 'paneer', display: 'Paneer', grams: 100 }],
  [/\bfalafel\b/, { name: 'falafel', display: 'Falafel', grams: 85 }],
  [/\b(veg|veggie|vegetable|vegetables|vegetarian|vegan)\b/, { name: 'mixed vegetables cooked', display: 'Vegetables', grams: 110 }],
];

const P = (name: string, display: string, grams: number, extra: Partial<Part> = {}): Part => ({ name, display, grams, ...extra });
const OIL = (g: number) => P('vegetable oil', 'Cooking oil', g);
const SUGAR = (g: number, display = 'Sugar (in the sauce)') => P('sugar', display, g, { prep: ['added'] });
const RICE = (g: number) => P('rice white cooked', 'Rice', g);

const DISHES: Dish[] = [
  { re: /pad\s*thai/, title: 'Pad thai', parts: [
    P('rice noodles cooked', 'Rice noodles', 250), P('chicken breast cooked', 'Chicken', 100, { protein: true }), P('egg', 'Egg', 50),
    P('mung bean sprouts', 'Bean sprouts', 40), P('peanuts dry roasted', 'Peanuts', 15), OIL(15), SUGAR(10),
    P('fish sauce', 'Fish sauce', 10), P('green onion', 'Spring onion', 10), P('lime', 'Lime', 10) ] },
  { re: /(green|red|yellow|panang|massaman|thai) curry/, title: 'Thai curry', parts: [
    P('coconut milk', 'Coconut milk', 200), P('chicken breast cooked', 'Chicken', 110, { protein: true }), P('eggplant', 'Aubergine', 40),
    P('bell pepper', 'Pepper', 40), P('bamboo shoots', 'Bamboo shoots', 30), RICE(200), SUGAR(6), P('fish sauce', 'Fish sauce', 10), OIL(8) ] },
  { re: /butter chicken|murgh makhani|tikka masala|korma|jalfrezi|rogan josh|vindaloo|madras|indian curry|^curry$/, title: 'Curry', parts: [
    P('chicken breast cooked', 'Chicken', 150, { protein: true }), P('tomato puree', 'Tomato sauce', 100), P('heavy cream', 'Cream', 50),
    P('butter', 'Butter / ghee', 15), P('onion', 'Onion', 40), RICE(200), SUGAR(5) ] },
  { re: /biryani/, title: 'Biryani', parts: [
    P('rice white cooked', 'Basmati rice', 300), P('chicken breast cooked', 'Chicken', 120, { protein: true }), P('onion', 'Fried onion', 30),
    P('ghee', 'Ghee / oil', 20), P('yogurt plain whole milk', 'Yoghurt', 30) ] },
  { re: /nasi goreng|fried rice|nasi/, title: 'Fried rice', parts: [
    RICE(300), P('egg', 'Egg', 50), P('chicken breast cooked', 'Chicken', 80, { protein: true }), P('peas and carrots frozen cooked', 'Peas & carrot', 50),
    OIL(20), P('soy sauce', 'Soy / kecap', 15), SUGAR(6, 'Sugar (kecap manis)') ] },
  { re: /bami( goreng)?|chow mein|lo mein|yakisoba|stir[- ]?fr(y|ied) noodles|noodle stir/, title: 'Stir-fried noodles', parts: [
    P('egg noodles cooked', 'Egg noodles', 280), P('cabbage', 'Cabbage', 50), P('chicken breast cooked', 'Chicken', 80, { protein: true }),
    P('bean sprouts', 'Bean sprouts', 30), OIL(20), P('soy sauce', 'Soy sauce', 15), SUGAR(5) ] },
  { re: /stir[- ]?fry/, title: 'Stir-fry with rice', parts: [
    P('chicken breast cooked', 'Chicken', 110, { protein: true }), P('broccoli', 'Broccoli', 60), P('bell pepper', 'Pepper', 40), P('onion', 'Onion', 30),
    RICE(220), OIL(15), P('soy sauce', 'Soy sauce', 15), SUGAR(6) ] },
  { re: /ramen/, title: 'Ramen', parts: [
    P('ramen noodles cooked', 'Ramen noodles', 200), P('chicken broth', 'Broth', 450), P('pork loin cooked', 'Chashu pork', 80, { protein: true }),
    P('egg', 'Egg', 50), P('bean sprouts', 'Bean sprouts', 30), P('green onion', 'Spring onion', 10), P('seaweed nori', 'Nori', 2) ] },
  { re: /\bpho\b/, title: 'Pho', parts: [
    P('rice noodles cooked', 'Rice noodles', 200), P('beef broth', 'Broth', 450), P('beef sirloin cooked', 'Beef', 90, { protein: true }),
    P('mung bean sprouts', 'Bean sprouts', 40), P('basil fresh', 'Herbs', 5), P('lime', 'Lime', 10) ] },
  { re: /laksa|tom yum|tom kha/, title: 'Noodle soup', parts: [
    P('coconut milk', 'Coconut milk', 150), P('rice noodles cooked', 'Rice noodles', 150), P('shrimp cooked', 'Prawns', 80, { protein: true }),
    P('chicken broth', 'Broth', 300), P('bean sprouts', 'Bean sprouts', 30), SUGAR(5) ] },
  { re: /poke( bowl)?/, title: 'Poke bowl', parts: [
    P('rice white cooked', 'Sushi rice', 200), P('salmon raw', 'Salmon', 100, { protein: true }), P('edamame', 'Edamame', 40),
    P('avocado', 'Avocado', 50), P('cucumber', 'Cucumber', 30), P('seaweed wakame', 'Seaweed salad', 20), P('soy sauce', 'Soy sauce', 10),
    P('mayonnaise', 'Spicy mayo', 15), P('sesame seeds', 'Sesame', 3) ] },
  { re: /sushi|maki|nigiri|california roll|sashimi/, title: 'Sushi', perUnit: { re: /(\d+)\s*(pieces?|pcs|rolls?)/, count: 8 }, parts: [
    P('rice white cooked', 'Sushi rice', 160), SUGAR(6, 'Sugar (in the rice)'), P('salmon raw', 'Fish', 50, { protein: true }),
    P('avocado', 'Avocado', 20), P('seaweed nori', 'Nori', 3), P('soy sauce', 'Soy sauce', 10) ] },
  { re: /burrito/, title: 'Burrito', parts: [
    P('tortilla flour', 'Flour tortilla', 100), RICE(100), P('black beans cooked', 'Black beans', 80), P('chicken breast cooked', 'Chicken', 100, { protein: true }),
    P('cheddar cheese', 'Cheese', 30), P('salsa', 'Salsa', 50), P('sour cream', 'Sour cream', 30) ] },
  { re: /tacos?/, title: 'Tacos', perUnit: { re: /(\d+|two|three|four|five|six)\s*tacos?/, count: 3 }, parts: [
    P('tortilla corn', 'Corn tortillas', 78), P('beef ground cooked', 'Meat', 90, { protein: true }), P('onion', 'Onion & coriander', 20),
    P('salsa', 'Salsa', 40), P('cheddar cheese', 'Cheese', 20) ] },
  { re: /burger|cheeseburger/, title: 'Burger', parts: [
    P('hamburger bun', 'Bun', 60), P('beef ground cooked', 'Beef patty', 115, { protein: true }), P('cheddar cheese', 'Cheese', 20),
    P('lettuce', 'Lettuce', 10), P('tomato', 'Tomato', 20), P('ketchup', 'Ketchup & sauce', 15) ] },
  { re: /pizza/, title: 'Pizza', perUnit: { re: /(\d+|one|two|three|four|five|six)\s*slices?/, count: 4 }, parts: [
    P('pizza cheese regular crust', 'Pizza (cheese)', 430) ] },
  { re: /kapsalon/, title: 'Kapsalon', parts: [
    P('french fries', 'Fries', 250), P('lamb cooked', 'Döner / shawarma meat', 150, { protein: true }), P('gouda cheese', 'Gouda', 60),
    P('lettuce', 'Lettuce', 30), P('mayonnaise', 'Garlic sauce', 30) ] },
  { re: /d[öo]ner|kebab|shawarma|gyros?|durum|dürüm/, title: 'Kebab wrap', parts: [
    P('pita bread', 'Pita / flatbread', 90), P('lamb cooked', 'Meat', 130, { protein: true }), P('lettuce', 'Lettuce', 30),
    P('tomato', 'Tomato', 30), P('onion', 'Onion', 20), P('mayonnaise', 'Garlic sauce', 15), P('yogurt plain whole milk', 'Yoghurt sauce', 15) ] },
  { re: /falafel/, title: 'Falafel wrap', parts: [
    P('pita bread', 'Pita', 90), P('falafel', 'Falafel', 85, { protein: true }), P('hummus', 'Hummus', 30), P('lettuce', 'Salad', 50), P('tahini', 'Tahini sauce', 15) ] },
  { re: /fish (and|&|n) chips|fish & chips/, title: 'Fish & chips', parts: [
    P('fish fillet battered fried', 'Battered fish', 180, { protein: true }), P('french fries', 'Chips', 250) ] },
  { re: /kibbeling|lekkerbek/, title: 'Kibbeling', parts: [
    P('fish fillet battered fried', 'Battered fish', 180, { protein: true }), P('mayonnaise', 'Sauce', 25) ] },
  { re: /carbonara/, title: 'Pasta carbonara', parts: [
    P('spaghetti cooked', 'Spaghetti', 250), P('bacon cooked', 'Bacon / guanciale', 40), P('egg yolk', 'Egg yolk', 30), P('parmesan cheese', 'Parmesan', 25) ] },
  { re: /bolognese|spag bol|ragu|ragù/, title: 'Pasta bolognese', parts: [
    P('spaghetti cooked', 'Spaghetti', 250), P('beef ground cooked', 'Beef', 90, { protein: true }), P('tomato sauce', 'Tomato sauce', 120),
    P('onion', 'Onion & carrot', 30), P('olive oil', 'Olive oil', 10), P('parmesan cheese', 'Parmesan', 10) ] },
  { re: /lasagn/, title: 'Lasagne', parts: [
    P('lasagna noodles cooked', 'Pasta sheets', 100), P('beef ground cooked', 'Beef', 80, { protein: true }), P('ricotta cheese', 'Ricotta / béchamel', 60),
    P('mozzarella cheese', 'Mozzarella', 40), P('tomato sauce', 'Tomato sauce', 100) ] },
  { re: /pasta|penne|spaghetti|linguine|tagliatelle|gnocchi/, title: 'Pasta', parts: [
    P('pasta cooked', 'Pasta', 260), P('tomato sauce', 'Sauce', 120), P('olive oil', 'Olive oil', 12), P('parmesan cheese', 'Parmesan', 10) ] },
  { re: /caesar/, title: 'Caesar salad', parts: [
    P('romaine lettuce', 'Romaine', 150), P('chicken breast cooked', 'Chicken', 100, { protein: true }), P('parmesan cheese', 'Parmesan', 15),
    P('croutons', 'Croutons', 20), P('caesar dressing', 'Dressing', 30) ] },
  { re: /wings/, title: 'Chicken wings', perUnit: { re: /(\d+)\s*wings/, count: 8 }, parts: [
    P('chicken wing fried', 'Chicken wings', 260, { protein: true }), P('barbecue sauce', 'Sauce', 30) ] },
  { re: /gyoza|dumplings?|dim sum|bao/, title: 'Dumplings', perUnit: { re: /(\d+)\s*(dumplings?|gyoza|pieces?)/, count: 6 }, parts: [
    P('wonton wrappers', 'Wrappers', 60), P('pork ground cooked', 'Filling (pork)', 60, { protein: true }), P('cabbage', 'Cabbage', 30), OIL(5), P('soy sauce', 'Dipping sauce', 10) ] },
  { re: /sat[eé]|satay/, title: 'Saté', parts: [
    P('chicken breast cooked', 'Chicken skewers', 150, { protein: true }), P('peanut butter', 'Peanut sauce', 30), P('coconut milk', 'Coconut milk (sauce)', 25),
    SUGAR(6, 'Sugar (sauce)'), RICE(200) ] },
  { re: /katsu/, title: 'Katsu curry', parts: [
    P('chicken breaded fried', 'Breaded chicken', 150, { protein: true }), RICE(200), P('curry sauce', 'Curry sauce', 150) ] },
  { re: /bibimbap/, title: 'Bibimbap', parts: [
    RICE(250), P('beef sirloin cooked', 'Beef', 80, { protein: true }), P('egg', 'Fried egg', 50), P('spinach cooked', 'Spinach', 40),
    P('carrot', 'Carrot', 30), P('bean sprouts', 'Bean sprouts', 30), P('gochujang', 'Gochujang', 15), OIL(8) ] },
  { re: /fried chicken|kfc|chicken tenders|nuggets/, title: 'Fried chicken', parts: [
    P('chicken breaded fried', 'Fried chicken', 220, { protein: true }) ] },
  { re: /salad bowl|grain bowl|buddha bowl|\bbowl\b/, title: 'Bowl', parts: [
    P('quinoa cooked', 'Grains', 150), P('chicken breast cooked', 'Chicken', 100, { protein: true }), P('mixed salad greens', 'Greens', 50),
    P('chickpeas cooked', 'Chickpeas', 50), P('avocado', 'Avocado', 40), P('olive oil', 'Dressing', 12) ] },
  { re: /\bfries\b|\bfrites\b|patat|\bchips\b/, title: 'Fries', parts: [ P('french fries', 'Fries', 150), P('mayonnaise', 'Mayo', 25) ] },
];

// Sides & drinks the person may mention alongside the main dish
const EXTRAS: [RegExp, Part][] = [
  [/\bnaan\b/, P('naan bread', 'Naan', 90)],
  [/garlic bread/, P('garlic bread', 'Garlic bread', 60)],
  [/spring rolls?/, P('spring roll fried', 'Spring rolls', 60)],
  [/prawn crackers|kroepoek/, P('shrimp chips', 'Prawn crackers', 20)],
  [/miso( soup)?/, P('miso soup', 'Miso soup', 240)],
  [/edamame/, P('edamame', 'Edamame', 75)],
  [/side salad|with salad/, P('mixed salad greens', 'Side salad', 80)],
  [/\b(fries|chips|frites|patat)\b/, P('french fries', 'Fries', 150)],
  [/\brice\b/, RICE(200)],
  [/\b(coke|cola|soda|fanta|sprite|soft drink)\b/, P('cola', 'Soft drink', 330, { prep: ['added'] })],
  [/mango lassi/, P('mango lassi', 'Mango lassi', 250, { prep: ['added'] })],
  [/\bbeer\b/, P('beer', 'Beer', 330)],
  [/\bwine\b/, P('wine red', 'Wine', 150)],
];

const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

export const TAKEOUT_WORDS = /\b(take[- ]?out|take[- ]?away|takeaway|delivery|delivered|ordered|restaurant|uber ?eats|deliveroo|thuisbezorgd|just eat|from the (chippy|snackbar|shop|place))\b/;

export function detectPortion(t: string): Portion | null {
  if (/\b(extra[- ]large|xl|xxl|huge|massive|giant|jumbo|family size)\b/.test(t)) return 'xl';
  if (/\b(large|big|generous|double)\b/.test(t)) return 'large';
  if (/\b(small|kids?|mini|half portion|light)\b/.test(t)) return 'small';
  if (/\b(regular|medium|normal)\b/.test(t)) return 'regular';
  return null;
}

export function detectEaten(t: string): number | null {
  if (/\b(shared|split) (it )?(with|between)\b|\bhalf of it\b|\bate half\b|\bhad half\b/.test(t)) return 0.5;
  if (/\b(ate|had) (most|three quarters|¾)\b/.test(t)) return 0.75;
  if (/\b(a few bites|a couple of bites|a quarter|a bit of it)\b/.test(t)) return 0.25;
  return null;
}

const toItem = (p: Part, factor: number, quality?: string | null): ParsedItem => {
  const prep = p.prep || [];
  const sugar = classifySugar(p.name, prep, quality);
  const grams = Math.max(0.5, Math.round(p.grams * factor));
  return {
    name: p.name, display: p.display, qty: 1, unit: '', amountText: `~${grams} g`, grams,
    prep, sugarForm: sugar.form, sugarReason: sugar.reason,
  };
};

export type TakeoutResult = {
  title: string; items: ParsedItem[]; portion: Portion; eatenFraction: number; matched: boolean;
};

export function parseTakeout(text: string, quality?: string | null): TakeoutResult {
  const t = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  const portion = detectPortion(t) || 'regular';
  const eatenFraction = detectEaten(t) ?? 1;
  const dish = DISHES.find((d) => d.re.test(t));

  if (dish) {
    let parts = dish.parts.map((p) => ({ ...p }));
    let title = dish.title;
    // swap the protein if a different one is named
    const named = PROTEINS.find(([re]) => re.test(t));
    if (named && dish.parts.some((p) => p.protein)) {
      parts = parts.map((p) => (p.protein ? { ...named[1], grams: Math.round(p.grams * (named[1].grams / 100)), protein: true } : p));
      title = `${title} with ${named[1].display.toLowerCase()}`;
    }
    // "no rice", "without cheese"
    const minus = Array.from(t.matchAll(/\b(?:no|without|hold the)\s+([a-z]+)/g)).map((m) => m[1]);
    if (minus.length) parts = parts.filter((p) => !minus.some((w) => p.display.toLowerCase().includes(w) || p.name.includes(w)));
    // sides
    for (const [re, part] of EXTRAS) {
      if (re.test(t) && !re.test(dish.title.toLowerCase()) && !parts.some((p) => p.display === part.display || p.name === part.name)) {
        if (minus.some((w) => part.name.includes(w))) continue;
        parts.push({ ...part });
      }
    }
    // counted dishes: "12 pieces of sushi", "2 slices of pizza", "3 tacos"
    let unitFactor = 1;
    if (dish.perUnit) {
      const m = t.match(dish.perUnit.re);
      if (m) { const n = Number(m[1]) || NUM[m[1]] || dish.perUnit.count; unitFactor = n / dish.perUnit.count; }
    }
    const items = parts.map((p) => {
      const isSide = !dish.parts.some((d) => d.name === p.name && d.display === p.display) && !p.protein;
      return toItem(p, isSide ? 1 : unitFactor, quality);
    });
    return { title: cap(title), items, portion, eatenFraction, matched: true };
  }

  // Unknown dish → strip the takeout chatter and read whatever is left
  const cleaned = text
    .replace(/\b(i |we )?(got|ordered|had|picked up|grabbed|ate)\b/gi, ' ')
    .replace(TAKEOUT_WORDS, ' ')
    .replace(/\b(and )?(it was|was) (a |an )?(small|regular|medium|large|big|huge|extra large|xl)( serving| portion| size| one)?\b/gi, ' ')
    .replace(/\b(a |an )?(small|regular|medium|large|big|extra large|xl) (serving|portion|size)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  const rule = parseMeal(cleaned, quality);
  const title = rule.title || cap(cleaned.split(/,| with /)[0].trim() || 'Takeout');
  const items = rule.items.length
    ? rule.items.map((i) => ({ ...i, estimated: true } as ParsedItem))
    : [toItem({ name: cleaned || 'takeout meal', display: title, grams: 400 }, 1, quality)];
  return { title, items, portion, eatenFraction, matched: false };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
