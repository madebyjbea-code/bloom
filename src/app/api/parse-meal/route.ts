// ============================================================================
// app/api/parse-meal/route.ts   →   src/app/api/parse-meal/route.ts
//
// POST { text, quality? } → { title, items: ParsedItem[], engine }
//
// • With ANTHROPIC_API_KEY set (Vercel → Settings → Environment Variables),
//   Claude reads free-form meals ("leftover curry, about a bowl, with some
//   naan") into ingredients + grams. Costs a fraction of a cent per meal.
// • Without the key — or if the call fails — the built-in rule parser
//   (lib/mealParser.ts) handles it. Nothing breaks either way.
// Sugar form is always decided by lib/nutrientModel.ts so the free vs
// natural rule stays consistent whichever engine parsed the meal.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseMeal, ParsedItem } from '../../../lib/mealParser';
import { classifySugar } from '../../../lib/nutrientModel';

export const runtime = 'nodejs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

const SYSTEM = `You convert a person's description of one meal into ingredients for a nutrition database lookup.
Return ONLY JSON: {"title": string|null, "items": [{"name": string, "display": string, "amountText": string, "grams": number, "prep": string[]}]}
Rules:
- "name": a plain food name that the USDA FoodData Central search understands (e.g. "rolled oats", "semi-skimmed milk", "medjool dates", "butter").
- "display": short friendly name including meaningful prep (e.g. "Browned butter", "Mashed dates").
- "amountText": the amount as the person said it, normalised ("⅔ cup", "2 dates", "a pinch").
- "grams": your best estimate of the edible weight in grams, using standard household measures.
- "prep": preparation words that were mentioned (chopped, mashed, blended, roasted...).
- Split combined items ("turmeric and black pepper" → two items). Unspecified spice amounts are a pinch (0.3 g).
- If the text names a dish then lists its ingredients ("Oatmeal with ..."), put the dish in "title" and list only the ingredients.
- If a dish is named with no ingredients (e.g. "lasagne"), return it as one item with a typical single portion.`;

async function parseWithClaude(text: string): Promise<{ title: string | null; items: any[] } | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: SYSTEM, messages: [{ role: 'user', content: text.slice(0, 1500) }] }),
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

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const text = String(body.text || '').trim();
  const quality = body.quality || null;
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const ai = await parseWithClaude(text);
  if (ai) {
    const rule = parseMeal(text, quality); // borrow the "which milk?" prompt etc.
    const items: ParsedItem[] = ai.items
      .filter((i: any) => i && i.name && Number(i.grams) > 0)
      .map((i: any) => {
        const prep = Array.isArray(i.prep) ? i.prep.map(String) : [];
        const sugar = classifySugar(String(i.name), prep, quality);
        const twin = rule.items.find((r) => r.name === String(i.name).toLowerCase() || r.display.toLowerCase() === String(i.display || '').toLowerCase());
        return {
          name: String(i.name).toLowerCase(),
          display: String(i.display || i.name),
          qty: 1,
          unit: '',
          amountText: String(i.amountText || ''),
          grams: Math.round(Number(i.grams) * 10) / 10,
          prep,
          sugarForm: sugar.form,
          sugarReason: sugar.reason,
          ...(twin?.question ? { question: twin.question } : {}),
        };
      });
    if (items.length) return NextResponse.json({ title: ai.title || null, items, engine: 'claude' });
  }

  const parsed = parseMeal(text, quality);
  return NextResponse.json({ ...parsed, engine: 'rules' });
}
