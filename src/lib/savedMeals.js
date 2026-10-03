// ============================================================================
// lib/savedMeals.js   →   src/lib/savedMeals.js
//
// Two small localStorage stores for the Nourish tab:
//
//   bloom-saved-meals   "My meals": meals & recipes you can log again in one
//                       tap. Each holds a snapshot of the meal as you typed
//                       or picked it: WHOLE-recipe items + servings, or a
//                       takeout dish + portion.
//   bloom-meal-sources  For every logged meal: what you typed / picked, so
//                       editing a past log reopens it instead of starting
//                       from scratch.
//
// A snapshot looks like:
//   { title, kind: 'single'|'recipe'|'takeout', items: [{ name, display,
//     grams, amountText, prep, sugarForm, sugarReason, ... }],
//     servingsMade, servingsEaten, portion, eatenFraction, matched }
// ============================================================================

const SAVED_KEY = 'bloom-saved-meals';
const SOURCES_KEY = 'bloom-meal-sources';

const read = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ── My meals ─────────────────────────────────────────────────────────────
export function loadSavedMeals() {
  return read(SAVED_KEY, []).sort((a, b) => (b.lastUsed || b.updatedAt || 0) - (a.lastUsed || a.updatedAt || 0));
}

// Create (no id) or update (id) a saved meal. Returns the stored record.
export function upsertSavedMeal({ id, name, text = '', snapshot }) {
  const all = read(SAVED_KEY, []);
  const now = Date.now();
  const clean = cleanSnapshot(snapshot);
  const existing = id ? all.find((m) => m.id === id) : null;
  const rec = {
    ...(existing || { id: `m${now}`, uses: 0, createdAt: now }),
    name: (name || clean.title || 'My meal').trim(),
    text,
    snapshot: clean,
    updatedAt: now,
  };
  write(SAVED_KEY, [rec, ...all.filter((m) => m.id !== rec.id)].slice(0, 100));
  return rec;
}

export function deleteSavedMeal(id) {
  write(SAVED_KEY, read(SAVED_KEY, []).filter((m) => m.id !== id));
}

export function markSavedMealUsed(id) {
  const all = read(SAVED_KEY, []);
  write(SAVED_KEY, all.map((m) => (m.id === id ? { ...m, uses: (m.uses || 0) + 1, lastUsed: Date.now() } : m)));
}

export function isMealSaved(snapshot) {
  const sig = signature(snapshot);
  return read(SAVED_KEY, []).find((m) => signature(m.snapshot) === sig) || null;
}

// ── Sources of logged meals (for editing) ───────────────────────────────
export function getMealSource(mealId) {
  return read(SOURCES_KEY, {})[mealId] || null;
}
export function setMealSource(mealId, source) {
  const all = read(SOURCES_KEY, {});
  all[mealId] = { ...source, snapshot: cleanSnapshot(source.snapshot), savedAt: Date.now() };
  // keep the store small: drop sources older than ~60 days
  const cutoff = Date.now() - 60 * 864e5;
  for (const [k, v] of Object.entries(all)) if ((v.savedAt || 0) < cutoff) delete all[k];
  write(SOURCES_KEY, all);
}
export function deleteMealSource(mealId) {
  const all = read(SOURCES_KEY, {});
  delete all[mealId];
  write(SOURCES_KEY, all);
}

// ── helpers ──────────────────────────────────────────────────────────────
function cleanSnapshot(s = {}) {
  return {
    title: s.title || null,
    kind: s.kind || 'single',
    matched: s.matched !== false,
    servingsMade: s.servingsMade ?? null,
    servingsEaten: s.servingsEaten ?? null,
    portion: s.portion ?? null,
    eatenFraction: s.eatenFraction ?? null,
    items: (s.items || []).map(({ key, factor, question, ...i }) => ({ ...i, estimated: false })),
  };
}
function signature(s) {
  if (!s) return '';
  return `${s.kind}|${(s.title || '').toLowerCase()}|${(s.items || []).map((i) => `${i.name}:${Math.round(i.grams)}`).join(',')}`;
}

// Turn a single logged entry from before meals were grouped into a snapshot
export function snapshotFromEntries(entries) {
  return {
    title: entries[0]?.dish || null,
    kind: entries.some((e) => e.isTakeout) ? 'takeout' : 'single',
    portion: entries.some((e) => e.isTakeout) ? 'regular' : null,
    eatenFraction: entries.some((e) => e.isTakeout) ? 1 : null,
    items: entries.filter((e) => e.grams > 0).map((e) => ({
      name: e.lookupName || e.name,
      display: e.name,
      grams: e.grams,
      amountText: e.servingLabel || `${e.grams} g`,
      prep: e.prep || [],
      sugarForm: e.sugarForm,
      sugarReason: e.sugarReason,
    })),
  };
}
