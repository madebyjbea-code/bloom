// ============================================================================
// app/api/parse-meal/route.ts   →   src/app/api/parse-meal/route.ts
//
// POST { text, quality?, takeout? } →
//   { title, items: ParsedItem[], kind: 'single'|'recipe'|'takeout',
//     servingsMade, servingsEaten, servingsGuessed?,      (recipes)
//     portion, eatenFraction,                             (takeout)
//     engine: 'claude'|'rules' }
//
// • Recipes: items are the WHOLE pot ("350 g risotto rice"); the app logs
//   servingsEaten / servingsMade of each.
// • Takeout: items are a REGULAR restaurant portion; the app multiplies by
//   the portion size (small ×0.75 … extra large ×1.7) and how much was eaten.
//
// • With ANTHROPIC_API_KEY set (Vercel → Settings → Environment Variables),
//   Claude reads any meal or dish. Costs a fraction of a cent per meal.
// • Without the key — or if the call fails — the built-in rule parser
//   (lib/mealParser.ts + lib/takeoutDishes.ts) handles it.
// Sugar form is always decided by lib/nutrientModel.ts so the free vs
// natural rule stays consistent whichever engine parsed the meal.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseMeal, ParsedItem } from '../../../lib/mealParser';
import { parseTakeout, TAKEOUT_WORDS, detectPortion, detectEaten, Portion } from '../../../lib/takeoutDishes';
import { classifySugar } from '../../../lib/nutrientModel';

export const runtime = 'nodejs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

const SYSTEM = `You convert a person's description of one meal into ingredients for a nutrition database lookup (USDA FoodData Central).
Return ONLY JSON:
{"kind": "single"|"recipe"|"takeout",
 "title": string|null,
 "servingsMade": number|null, "servingsEaten": number|null, "servingsGuessed": boolean,
 "portion": "small"|"regular"|"large"|"xl"|null, "eatenFraction": number|null,
 "items": [{"name": string, "display": string, "amountText": string, "grams": number, "prep": string[], "estimated": boolean}]}

Kinds:
- "single": an ordinary plate or bowl the person ate in full. Items are what they ate.
- "recipe": they cooked a dish / batch ("made salmon risotto with ... and ate 1 serving", "cooked chili, makes 5 portions").
  Items list the WHOLE recipe amounts exactly as written. "servingsMade" = servings the recipe made (if not stated, estimate it from the
  ingredients — e.g. ~80 g dry rice or pasta per serving — and set "servingsGuessed": true). "servingsEaten" = servings they ate
  (default 1; "half of it" → servingsMade 1, servingsEaten 0.5). Leave out plain cooking water.
- "takeout": takeout, delivery, restaurant, snack bar or canteen food, usually described as a dish ("pad thai with chicken, large").
  Break the dish into its main components with grams for ONE REGULAR restaurant portion, cooked weights, including the cooking oil and
  sugar restaurants typically add to sauces (as separate items "Cooking oil", "Sugar (in the sauce)"). Do NOT apply the size yourself:
  put it in "portion" (small / regular / large / xl, null if not said). "eatenFraction" = share eaten (shared it → 0.5; default 1).
  Include sides and drinks they mention (naan, fries, a coke).

Item rules:
- "name": a plain food name USDA search understands ("rice white cooked", "rolled oats", "semi-skimmed milk", "salmon raw", "butter").
  Grains, pasta and pulses weighed in a recipe are weighed DRY: say "raw"/"dry" ("rice white medium-grain raw", "pasta dry").
- "display": short friendly name with meaningful prep ("Browned butter", "Mashed dates", "Risotto rice").
- "amountText": the amount as the person said it, normalised ("⅔ cup", "2 fillets", "350 g", "a pinch"). For takeout use "~250 g".
- "grams": best estimate of the edible weight using standard household measures.
- "prep": preparation words mentioned (chopped, mashed, blended, grated, roasted...).
- "estimated": true when the person gave no amount and you guessed it.
- Fix obvious typos ("parmesean" → parmesan, "gloves of garlic" → cloves). Split combined items ("turmeric and black pepper").
  Unspecified spice amounts are a pinch (0.3 g).
- "title": the dish name if one is given ("Salmon risotto", "Pad thai with chicken"), else null.`;

async function parseWithClaude(text: string, takeoutHint: boolean): Promise<any | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const content = takeoutHint ? `[This was takeout / restaurant food]\n${text.slice(0, 1500)}` : text.slice(0, 1500);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1600, system: SYSTEM, messages: [{ role: 'user', content }] }),
    });
    if (!res.ok) { console.warn('parse-meal: Claude returned', res.status); return null; }
    const data = await res.json();
    const raw = (data.content || []).map((c: any) => c.text || '').join('');
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    if (!Array.isArray(json.items)) return null;
    return json;
  } catch (e) {
    console.warn('parse-meal: Claude parse failed, using rule parser', e);
    return null;
  }
}

const PORTIONS: Portion[] = ['small', 'regular', 'large', 'xl'];
const num = (v: any, fallback: number | null) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const text = String(body.text || '').trim();
  const quality = body.quality || null;
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  const lower = ` ${text.toLowerCase()} `;
  const takeoutHint = !!body.takeout || TAKEOUT_WORDS.test(lower);

  // ── Claude ────────────────────────────────────────────────────────────────
  const ai = await parseWithClaude(text, takeoutHint);
  if (ai) {
    const rule = parseMeal(text, quality); // borrow the "which milk?" prompt etc.
    const kind = takeoutHint ? 'takeout' : ['single', 'recipe', 'takeout'].includes(ai.kind) ? ai.kind : 'single';
    const items: ParsedItem[] = ai.items
      .filter((i: any) => i && i.name && Number(i.grams) > 0)
      .map((i: any) => {
        const prep = Array.isArray(i.prep) ? i.prep.map(String) : [];
        const sugar = classifySugar(`${i.name} ${i.display || ''}`, prep, quality);
        const twin = rule.items.find((r) => r.name === String(i.name).toLowerCase() || r.display.toLowerCase() === String(i.display || '').toLowerCase());
        return {
          name: String(i.name).toLowerCase(),
          display: String(i.display || i.name),
          qty: 1,
          unit: '',
          amountText: String(i.amountText || `${Math.round(Number(i.grams))} g`),
          grams: Math.round(Number(i.grams) * 10) / 10,
          prep,
          sugarForm: sugar.form,
          sugarReason: sugar.reason,
          ...(i.estimated ? { estimated: true } : {}),
          ...(twin?.question && kind !== 'takeout' ? { question: twin.question } : {}),
        };
      });
    if (items.length) {
      return NextResponse.json({
        title: ai.title || null,
        items,
        kind,
        servingsMade: kind === 'recipe' ? num(ai.servingsMade, 1) : null,
        servingsEaten: kind === 'recipe' ? num(ai.servingsEaten, 1) : null,
        ...(kind === 'recipe' && ai.servingsGuessed ? { servingsGuessed: true } : {}),
        portion: kind === 'takeout' ? (PORTIONS.includes(ai.portion) ? ai.portion : detectPortion(lower) || 'regular') : null,
        eatenFraction: kind === 'takeout' ? num(ai.eatenFraction, detectEaten(lower) ?? 1) : null,
        engine: 'claude',
      });
    }
  }

  // ── Rules ─────────────────────────────────────────────────────────────────
  if (takeoutHint) {
    const t = parseTakeout(text, quality);
    return NextResponse.json({
      title: t.title, items: t.items, kind: 'takeout',
      servingsMade: null, servingsEaten: null,
      portion: t.portion, eatenFraction: t.eatenFraction,
      matched: t.matched,
      engine: 'rules',
    });
  }
  const parsed = parseMeal(text, quality);
  return NextResponse.json({ ...parsed, portion: null, eatenFraction: null, engine: 'rules' });
}
