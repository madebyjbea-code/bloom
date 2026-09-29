// ============================================================================
// app/api/food-nutrients/route.ts   (Next.js 14 App Router)
// Path in your repo: src/app/api/food-nutrients/route.ts
//
// GET /api/food-nutrients?name=green%20peas&grams=160
//   1. Normalizes a cache key and checks the food_nutrients table.
//   2. On miss, queries USDA FoodData Central, extracts key nutrients,
//      converts to %DV for the given serving, caches, and returns.
//
// Requires two env vars:
//   USDA_FDC_API_KEY               free key from https://api.data.gov/signup/
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY      (falls back to the anon key if absent)
//
// The key stays server-side — the client only ever calls this route.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string,
);

// FDA Daily Values (adults + children ≥4). Keyed by USDA nutrient id.
// unit is the canonical unit the DV is expressed in.
type Dv = { key: string; label: string; dv: number; unit: 'g' | 'mg' | 'ug' };
const NUTRIENTS: Record<number, Dv> = {
  1003: { key: 'protein',    label: 'Protein',     dv: 50,   unit: 'g'  },
  1079: { key: 'fiber',      label: 'Fiber',       dv: 28,   unit: 'g'  },
  1162: { key: 'vit_c',      label: 'Vitamin C',   dv: 90,   unit: 'mg' },
  1185: { key: 'vit_k',      label: 'Vitamin K',   dv: 120,  unit: 'ug' },
  1190: { key: 'folate',     label: 'Folate',      dv: 400,  unit: 'ug' },
  1177: { key: 'folate',     label: 'Folate',      dv: 400,  unit: 'ug' },
  1089: { key: 'iron',       label: 'Iron',        dv: 18,   unit: 'mg' },
  1087: { key: 'calcium',    label: 'Calcium',     dv: 1300, unit: 'mg' },
  1092: { key: 'potassium',  label: 'Potassium',   dv: 4700, unit: 'mg' },
  1090: { key: 'magnesium',  label: 'Magnesium',   dv: 420,  unit: 'mg' },
  1095: { key: 'zinc',       label: 'Zinc',        dv: 11,   unit: 'mg' },
  1106: { key: 'vit_a',      label: 'Vitamin A',   dv: 900,  unit: 'ug' },
  1114: { key: 'vit_d',      label: 'Vitamin D',   dv: 20,   unit: 'ug' },
  1178: { key: 'vit_b12',    label: 'Vitamin B12', dv: 2.4,  unit: 'ug' },
  1175: { key: 'vit_b6',     label: 'Vitamin B6',  dv: 1.7,  unit: 'mg' },
  1165: { key: 'thiamin',    label: 'Thiamin',     dv: 1.2,  unit: 'mg' },
  1166: { key: 'riboflavin', label: 'Riboflavin',  dv: 1.3,  unit: 'mg' },
  1167: { key: 'niacin',     label: 'Niacin',      dv: 16,   unit: 'mg' },
  1109: { key: 'vit_e',      label: 'Vitamin E',   dv: 15,   unit: 'mg' },
  1170: { key: 'vit_b5',     label: 'Pantothenic Acid (B5)', dv: 5, unit: 'mg' },
  1101: { key: 'manganese',  label: 'Manganese',   dv: 2.3,  unit: 'mg' },
  2000: { key: 'sugar',       label: 'Total Sugars', dv: 25,   unit: 'g'  },  // WHO daily limit 25g free sugars
  1098: { key: 'copper',     label: 'Copper',      dv: 0.9,  unit: 'mg' },
  1103: { key: 'selenium',   label: 'Selenium',    dv: 55,   unit: 'ug' },
  1091: { key: 'phosphorus', label: 'Phosphorus',  dv: 1250, unit: 'mg' },
  // v4 additions — macros + the remaining micronutrients
  1063: { key: 'sugar',      label: 'Total Sugars', dv: 25,  unit: 'g'  },  // Foundation foods use 1063
  1004: { key: 'fat',        label: 'Fat',          dv: 78,  unit: 'g'  },
  1258: { key: 'sat_fat',    label: 'Saturated fat', dv: 20, unit: 'g'  },
  1005: { key: 'carbs',      label: 'Carbohydrate', dv: 275, unit: 'g'  },
  1093: { key: 'sodium',     label: 'Sodium',       dv: 2000, unit: 'mg' }, // WHO limit
  1100: { key: 'iodine',     label: 'Iodine',       dv: 150, unit: 'ug' },
  1176: { key: 'biotin',     label: 'Biotin',       dv: 30,  unit: 'ug' },
};

// Omega-3s are summed across fatty-acid ids (ALA + EPA + DPA + DHA).
// 1404 = ALA (n-3 specific), 1270 = 18:3 in SR Legacy (mostly ALA).
const OMEGA3_IDS = [1404, 1278, 1280, 1272];
const OMEGA3_FALLBACK_ALA = 1270;
const OMEGA3_DV = 1.1; // g/day adequate intake (women; men 1.6)

const TO_GRAMS: Record<string, number> = { G: 1, MG: 1e-3, UG: 1e-6, µG: 1e-6 };
const UNIT_GRAMS: Record<string, number> = { g: 1, mg: 1e-3, ug: 1e-6 };

// Convert an FDC amount (in its unitName) into the DV's canonical unit.
function toDvUnit(value: number, fdcUnit: string, dvUnit: 'g' | 'mg' | 'ug'): number | null {
  const inGrams = TO_GRAMS[fdcUnit?.toUpperCase()];
  if (inGrams == null) return null; // skip IU / kcal etc. — can't map to a mass DV
  return (value * inGrams) / UNIT_GRAMS[dvUnit];
}

export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get('name') || '').trim();
  const grams = Number(req.nextUrl.searchParams.get('grams')) || 100;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  // v2 prefix: v4 records carry macros + every micronutrient, so older cached
  // rows (top-12 only) are simply not reused.
  const foodKey = `v2|${name.toLowerCase()}@${Math.round(grams)}`;

  // 1. Cache
  try {
    const { data } = await supabase.from('food_nutrients').select('*').eq('food_key', foodKey).maybeSingle();
    if (data) return NextResponse.json(data);
  } catch { /* fall through to fetch */ }

  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'USDA key not configured' }, { status: 500 });

  // 2. USDA search — prefer whole-food data types (per-100g values)
  let fdcFood: any = null;
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`
      + `&query=${encodeURIComponent(name)}&pageSize=5&dataType=${encodeURIComponent('Foundation,SR Legacy')}`;
    const r = await fetch(url);
    const j = await r.json();
    fdcFood = (j.foods || []).find((f: any) => Array.isArray(f.foodNutrients) && f.foodNutrients.length) || null;
  } catch { fdcFood = null; }

  if (!fdcFood) {
    // No match — return an empty, cacheable "no data" marker so we don't refetch hard.
    const empty = { food_key: foodKey, display_name: name, fdc_id: null, serving_grams: grams, nutrients: [], source: 'none' };
    return NextResponse.json(empty);
  }

  // 3. Extract → per-serving → %DV
  const factor = grams / 100; // FDC Foundation/SR values are per 100 g
  const nutrients = (fdcFood.foodNutrients as any[])
    .map((n) => {
      const meta = NUTRIENTS[n.nutrientId];
      if (!meta) return null;
      const perServing = toDvUnit(Number(n.value) * factor, n.unitName, meta.unit);
      if (perServing == null || !isFinite(perServing)) return null;
      return {
        key: meta.key,
        label: meta.label,
        amount: Math.round(perServing * 100) / 100,
        unit: meta.unit,
        percent_dv: Math.round((perServing / meta.dv) * 100),
      };
    })
    .filter(Boolean) as any[];

  // de-dupe (folate has two ids), keep the higher %DV, sort desc, cap the list
  const byKey: Record<string, any> = {};
  for (const n of nutrients) {
    if (!byKey[n.key] || n.percent_dv > byKey[n.key].percent_dv) byKey[n.key] = n;
  }
  // Omega-3 total
  const fnById: Record<number, any> = {};
  for (const n of fdcFood.foodNutrients as any[]) fnById[n.nutrientId] = n;
  const ids = OMEGA3_IDS.some((id) => fnById[id]) ? OMEGA3_IDS : [OMEGA3_FALLBACK_ALA];
  const omega3 = ids.reduce((sum, id) => {
    const n = fnById[id];
    const g = n ? toDvUnit(Number(n.value) * factor, n.unitName, 'g') : 0;
    return sum + (g && isFinite(g) ? g : 0);
  }, 0);
  if (omega3 > 0) {
    byKey.omega3 = { key: 'omega3', label: 'Omega-3', amount: Math.round(omega3 * 100) / 100, unit: 'g', percent_dv: Math.round((omega3 / OMEGA3_DV) * 100) };
  }

  // Keep everything (the weekly stores need small contributions too),
  // highest %DV first so older UI that slices the top few still works.
  const finalNutrients = Object.values(byKey)
    .sort((a: any, b: any) => b.percent_dv - a.percent_dv);

  const record = {
    food_key: foodKey,
    display_name: fdcFood.description || name,
    fdc_id: String(fdcFood.fdcId),
    serving_grams: grams,
    nutrients: finalNutrients,
    source: 'usda_fdc',
  };

  try { await supabase.from('food_nutrients').upsert(record, { onConflict: 'food_key' }); } catch { /* cache best-effort */ }

  return NextResponse.json(record);
}
