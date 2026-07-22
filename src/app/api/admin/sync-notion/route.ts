// ============================================================================
// src/app/api/admin/sync-notion/route.ts
//
// Changes from previous version (one addition only):
//   • RECIPE_FIELDS.ingredientAmounts — reads the new "Ingredient Amounts"
//     plain-text property you added in Notion, parses each line into
//     { amount, name }, and writes it to ingredient_amounts (JSONB) in Supabase.
//     Everything else is unchanged.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string,
);

const NOTION_VERSION = '2022-06-28';

const PANTRY_FIELDS = {
  name:         'Name',
  category:     'Type and Consume By',
  eatFor:       'health category',
  nutritionTags:'Nutrition Points',
  servingGrams: 'Serving Size (grams)',
  servingOther: 'Serving Size in Other Units',
};

const RECIPE_FIELDS = {
  name:               'Name',
  mealType:           'For',
  category:           'category',
  cookTime:           'Cook Time',
  ingredients:        'Need',           // relation → resolved to pantry names
  ingredientAmounts:  'Ingredient Amounts', // ← NEW plain-text property in Notion
  status:             'Status',
  forContent:         'For Content',
  instructions:       'Instructions',
};

// ── Notion API helpers ───────────────────────────────────────────────────────
async function notionFetch(path: string, token: string, body?: any) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function queryAllRows(dbId: string, token: string) {
  let results: any[] = [];
  let cursor: string | undefined;
  do {
    const page = await notionFetch(`/databases/${dbId}/query`, token, cursor ? { start_cursor: cursor } : {});
    results = results.concat(page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return results;
}

function getTitle(props: any, field: string): string {
  return props[field]?.title?.map((t: any) => t.plain_text).join('') || '';
}
function getRichText(props: any, field: string): string {
  return props[field]?.rich_text?.map((t: any) => t.plain_text).join('') || '';
}
function getSelectLike(props: any, field: string): string {
  const p = props[field];
  return p?.select?.name || p?.status?.name || '';
}
function getMultiSelect(props: any, field: string): string[] {
  return (props[field]?.multi_select || []).map((s: any) => s.name);
}
function getNumber(props: any, field: string): number | null {
  return props[field]?.number ?? null;
}
function getCheckbox(props: any, field: string): boolean {
  return props[field]?.checkbox ?? false;
}
function getRelationIds(props: any, field: string): string[] {
  return (props[field]?.relation || []).map((r: any) => r.id);
}
function getCoverUrl(row: any): string | null {
  const c = row.cover;
  if (!c) return null;
  return c.type === 'external' ? c.external?.url : c.file?.url || null;
}

// ── NEW: parse "Ingredient Amounts" plain text into [{amount, name}] ─────────
// Expects one ingredient per line, amount first:
//   "400g chickpeas"  →  { amount: "400g",  name: "chickpeas" }
//   "1 tsp cumin"     →  { amount: "1 tsp", name: "cumin" }
//   "½ onion"         →  { amount: "½",     name: "onion" }
//   "handful spinach" →  { amount: null,    name: "handful spinach" }
//
// Falls back to { amount: null, name: fullLine } for anything that doesn't
// match the pattern — so a line without a recognisable amount still renders.
function parseIngredientAmounts(rawText: string): { amount: string | null; name: string }[] {
  if (!rawText.trim()) return [];
  return rawText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      // Match: optional number/fraction, optional unit, then the rest as the name
      // Units: g, kg, ml, l, tsp, tbsp, cup, oz, lb, handful, pinch, slice, clove, can, tin, bunch
      const match = line.match(
        /^([\d½¼¾⅓⅔⅛\s.\/]+(?:g|kg|ml|l|tsp|tbsp|cup|oz|lb|handful|pinch|slice|cloves?|can|tin|bunch)?)\s+(.+)$/i
      );
      if (match) {
        return { amount: match[1].trim(), name: match[2].trim() };
      }
      return { amount: null, name: line };
    });
}

// ── Image re-hosting (unchanged) ─────────────────────────────────────────────
async function syncRecipeImage(pageId: string, coverUrl: string | null): Promise<string | null> {
  if (!coverUrl) return null;
  try {
    const imgRes = await fetch(coverUrl);
    if (!imgRes.ok) return null;
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const buffer = await imgRes.arrayBuffer();
    const path = `${pageId}.${ext}`;
    const { error } = await supabase.storage.from('recipe-images').upload(path, buffer, { contentType, upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('recipe-images').getPublicUrl(path);
    return data.publicUrl || null;
  } catch {
    return null;
  }
}

// ── GET /api/admin/sync-notion?secret=... ────────────────────────────────────
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!process.env.NOTION_SYNC_SECRET || secret !== process.env.NOTION_SYNC_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token      = process.env.NOTION_API_KEY;
  const pantryDbId = process.env.NOTION_PANTRY_DB_ID;
  const recipesDbId= process.env.NOTION_RECIPES_DB_ID;
  if (!token || !pantryDbId || !recipesDbId) {
    return NextResponse.json({ error: 'Missing NOTION_API_KEY / NOTION_PANTRY_DB_ID / NOTION_RECIPES_DB_ID' }, { status: 500 });
  }

  try {
    // ── 1. Sync Virtual Pantry → pantry_foods (unchanged) ──────────────────
    const pantryRows = await queryAllRows(pantryDbId, token);
    const idToName: Record<string, string> = {};
    let pantrySynced = 0;

    for (const row of pantryRows) {
      const props = row.properties;
      const name = getTitle(props, PANTRY_FIELDS.name);
      if (!name) continue;
      idToName[row.id] = name;

      const record = {
        notion_page_id: row.id,
        name,
        category:      getMultiSelect(props, PANTRY_FIELDS.category),
        eat_for:       getMultiSelect(props, PANTRY_FIELDS.eatFor),
        nutrition_tags:getMultiSelect(props, PANTRY_FIELDS.nutritionTags),
        serving_grams: getNumber(props, PANTRY_FIELDS.servingGrams),
        serving_other: getRichText(props, PANTRY_FIELDS.servingOther) || null,
        in_app:        true,
        updated_at:    new Date().toISOString(),
      };
      const { error } = await supabase.from('pantry_foods').upsert(record, { onConflict: 'notion_page_id' });
      if (!error) pantrySynced++;
    }

    // ── 2. Sync Recipe Book → recipes ──────────────────────────────────────
    const recipeRows = await queryAllRows(recipesDbId, token);
    let recipesSynced = 0, recipesSkipped = 0;

    for (const row of recipeRows) {
      const props  = row.properties;
      const status = getSelectLike(props, RECIPE_FIELDS.status).toLowerCase();
      if (status !== 'published') { recipesSkipped++; continue; }

      const name = getTitle(props, RECIPE_FIELDS.name);
      if (!name) continue;

      // Existing: resolve ingredient relation → names
      const ingredientIds   = getRelationIds(props, RECIPE_FIELDS.ingredients);
      const ingredientNames = ingredientIds.map((id) => idToName[id]).filter(Boolean);

      // NEW: read "Ingredient Amounts" plain-text → parse into [{amount, name}]
      const amountsRaw      = getRichText(props, RECIPE_FIELDS.ingredientAmounts);
      const ingredientAmounts = parseIngredientAmounts(amountsRaw);

      const imageUrl = await syncRecipeImage(row.id, getCoverUrl(row));

      const record: Record<string, any> = {
        notion_page_id:     row.id,
        name,
        meal_type:          getMultiSelect(props, RECIPE_FIELDS.mealType),
        category:           getMultiSelect(props, RECIPE_FIELDS.category),
        cook_time_minutes:  getNumber(props, RECIPE_FIELDS.cookTime),
        ingredient_names:   ingredientNames,
        ingredient_amounts: ingredientAmounts, // ← NEW — [] if the property is empty
        instructions:       getRichText(props, RECIPE_FIELDS.instructions) || null,
        notion_url:         row.url || null,
        in_app:             true,
        updated_at:         new Date().toISOString(),
      };
      if (imageUrl) record.image_url = imageUrl;

      const { error } = await supabase.from('recipes').upsert(record, { onConflict: 'notion_page_id' });
      if (!error) recipesSynced++;
    }

    return NextResponse.json({
      ok: true,
      pantry:  { total: pantryRows.length, synced: pantrySynced },
      recipes: { total: recipeRows.length, synced: recipesSynced, skippedNotPublished: recipesSkipped },
      ranAt:   new Date().toISOString(),
    });

  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error:       'Sync failed — see notionError for the actual cause',
      notionError: err?.message || String(err),
    }, { status: 500 });
  }
}
