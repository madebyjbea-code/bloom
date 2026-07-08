// ============================================================================
// app/api/admin/sync-notion/route.ts   →   src/app/api/admin/sync-notion/route.ts
//
// Replaces the Make scenario entirely — talks to Notion's REST API directly
// (works on any Notion plan, including free; the Business-plan gate you hit
// earlier was specific to one MCP query tool, not the API itself).
//
// Trigger it two ways:
//   1. Manually — visit this URL in a browser whenever you update Notion:
//      https://your-app.vercel.app/api/admin/sync-notion?secret=YOUR_SECRET
//   2. Automatically — add a Vercel Cron entry (see the vercel.json snippet
//      in the setup notes below) to hit it on a schedule, hands-off.
//
// ── ONE-TIME SETUP ───────────────────────────────────────────────────────────
// 1. Create a Notion integration (free, any plan): notion.so/my-integrations
//    → "New integration" → internal → copy the "Internal Integration Secret".
// 2. Share BOTH databases with it: open Virtual Pantry in Notion → "•••" menu
//    (top right) → Connections → add your integration. Repeat for Recipe Book.
// 3. Add to .env.local:
//      NOTION_API_KEY=secret_from_step_1
//      NOTION_PANTRY_DB_ID=08ecac75-1dc1-4c2c-9da4-168be2e4eed4
//      NOTION_RECIPES_DB_ID=304e9b2b-591d-4e9b-ab0e-728f6be2d351
//      NOTION_SYNC_SECRET=pick_any_random_string
//    (The two DB IDs above are your actual Virtual Pantry and Recipe Book —
//    already pulled from your workspace. No need to look them up.)
// 4. Restart npm run dev, then visit:
//      http://localhost:3000/api/admin/sync-notion?secret=pick_any_random_string
//
// ── FIELD MAPPING — VERIFY AGAINST YOUR ACTUAL NOTION COLUMN NAMES ──────────
// A few of your Notion property names include emoji or exact phrasing I can't
// 100% guarantee character-for-character. If a field comes through empty
// after your first sync, open the database in Notion, check the column's
// exact name, and update the matching string in PANTRY_FIELDS / RECIPE_FIELDS
// below — that's the only thing likely to need a tweak.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string,
);

const NOTION_VERSION = '2022-06-28'; // stable, avoids the newer multi-data-source API complexity

// ── Field name mapping — edit these strings if a sync comes back empty ─────
const PANTRY_FIELDS = {
  name: 'Name',
  category: 'Type and Consume By',
  eatFor: 'health category',
  nutritionTags: 'Nutrition Points',
  servingGrams: 'Serving Size (grams)',
  servingOther: 'Serving Size in Other Units',
};

const RECIPE_FIELDS = {
  name: 'Name',
  mealType: 'For',
  category: 'category',
  cookTime: 'Cook Time',
  ingredients: 'Need', // relation → resolved to pantry names below
  status: 'Status',
  forContent: 'For Content',
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

// Fetch every row in a database, following pagination. No server-side filter —
// we pull everything and filter client-side below, since Notion's filter JSON
// needs to know the exact property TYPE (select vs the newer "status" type),
// which varies and is easy to get subtly wrong. Filtering after fetch sidesteps that.
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

// ── Property extractors — tolerant of a few Notion property types each ─────
function getTitle(props: any, key: string): string {
  const p = props[key];
  return p?.title?.map((t: any) => t.plain_text).join('') || '';
}
function getMultiSelect(props: any, key: string): string[] {
  const p = props[key];
  if (!p) return [];
  if (p.multi_select) return p.multi_select.map((o: any) => o.name);
  if (p.select) return [p.select.name];
  return [];
}
function getSelectLike(props: any, key: string): string {
  const p = props[key];
  if (!p) return '';
  if (p.status) return p.status.name || '';
  if (p.select) return p.select.name || '';
  return '';
}
function getNumber(props: any, key: string): number | null {
  return props[key]?.number ?? null;
}
function getRichText(props: any, key: string): string {
  const p = props[key];
  return p?.rich_text?.map((t: any) => t.plain_text).join('') || '';
}
function getCheckbox(props: any, key: string): boolean {
  return !!props[key]?.checkbox;
}
function getRelationIds(props: any, key: string): string[] {
  return (props[key]?.relation || []).map((r: any) => r.id);
}

// ── GET /api/admin/sync-notion?secret=... ───────────────────────────────────
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!process.env.NOTION_SYNC_SECRET || secret !== process.env.NOTION_SYNC_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = process.env.NOTION_API_KEY;
  const pantryDbId = process.env.NOTION_PANTRY_DB_ID;
  const recipesDbId = process.env.NOTION_RECIPES_DB_ID;
  if (!token || !pantryDbId || !recipesDbId) {
    return NextResponse.json({ error: 'Missing NOTION_API_KEY / NOTION_PANTRY_DB_ID / NOTION_RECIPES_DB_ID' }, { status: 500 });
  }

  try {
    // ── 1. Sync Virtual Pantry → pantry_foods ───────────────────────────────
    const pantryRows = await queryAllRows(pantryDbId, token);
    const idToName: Record<string, string> = {}; // for resolving recipe ingredients below
    let pantrySynced = 0;

    for (const row of pantryRows) {
      const props = row.properties;
      const name = getTitle(props, PANTRY_FIELDS.name);
      if (!name) continue;
      idToName[row.id] = name;

      const record = {
        notion_page_id: row.id,
        name,
        category: getMultiSelect(props, PANTRY_FIELDS.category),
        eat_for: getMultiSelect(props, PANTRY_FIELDS.eatFor),
        nutrition_tags: getMultiSelect(props, PANTRY_FIELDS.nutritionTags),
        serving_grams: getNumber(props, PANTRY_FIELDS.servingGrams),
        serving_other: getRichText(props, PANTRY_FIELDS.servingOther) || null,
        in_app: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('pantry_foods').upsert(record, { onConflict: 'notion_page_id' });
      if (!error) pantrySynced++;
    }

    // ── 2. Sync Recipe Book → recipes (Published only) ─────────────────────
    const recipeRows = await queryAllRows(recipesDbId, token);
    let recipesSynced = 0, recipesSkipped = 0;

    for (const row of recipeRows) {
      const props = row.properties;
      const status = getSelectLike(props, RECIPE_FIELDS.status).toLowerCase();
      const forContent = getCheckbox(props, RECIPE_FIELDS.forContent);
      // Gate is Published-only for now — requiring "For Content" too was likely
      // silently skipping everything if that checkbox wasn't being used. Add
      // `|| !forContent` back to the condition below if you want that second
      // gate once you're actually using the checkbox.
      if (status !== 'published') { recipesSkipped++; continue; }

      const name = getTitle(props, RECIPE_FIELDS.name);
      if (!name) continue;

      const ingredientIds = getRelationIds(props, RECIPE_FIELDS.ingredients);
      const ingredientNames = ingredientIds.map((id) => idToName[id]).filter(Boolean);

      const record = {
        notion_page_id: row.id,
        name,
        meal_type: getMultiSelect(props, RECIPE_FIELDS.mealType),
        category: getMultiSelect(props, RECIPE_FIELDS.category),
        cook_time_minutes: getNumber(props, RECIPE_FIELDS.cookTime),
        ingredient_names: ingredientNames,
        notion_url: row.url || null,
        in_app: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('recipes').upsert(record, { onConflict: 'notion_page_id' });
      if (!error) recipesSynced++;
    }

    return NextResponse.json({
      ok: true,
      pantry: { total: pantryRows.length, synced: pantrySynced },
      recipes: { total: recipeRows.length, synced: recipesSynced, skippedNotPublished: recipesSkipped },
      ranAt: new Date().toISOString(),
    });
  } catch (err: any) {
    // Surfaces the real cause instead of a raw 500 — e.g. Notion returning
    // 404 (database not shared with your integration, or wrong ID) or 401
    // (bad NOTION_API_KEY). Read the `notionError` field below to see which.
    return NextResponse.json({
      ok: false,
      error: 'Sync failed — see notionError for the actual cause',
      notionError: err?.message || String(err),
    }, { status: 500 });
  }
}
