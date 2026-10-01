'use client';

// NourishWeek.jsx — the "This week" view of the Nourish tab.
//   1. Your week, day by day — meal quality, takeout, macros met, micro coverage
//   2. Vitamin & mineral stores — every nutrient, grouped, with realistic fade speeds
//   3. Recipes that close the most gaps — ranked by how many low nutrients one dish covers

import { useMemo, useState } from 'react';
import {
  computeStores, weekSummary, weekCounts, weekPattern, GROUP_LABELS, fadeRate, halfLifeText,
} from '../lib/nutrientModel';
import { rankRecipesForGaps, sourcesFor } from '../lib/gapRecipes';
import { NUTRIENT_FOOD_SUGGESTIONS } from '../lib/nutrition';

const CARD  = { background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 20 };
const LABEL = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 14 };
const FONT = 'DM Sans,sans-serif';

// Meal-quality colours differ in lightness as well as hue (colour-blind safe)
const Q = {
  whole:     { color: '#5a7a5a', label: 'whole' },
  mixed:     { color: '#d9b44a', label: 'mixed' },
  processed: { color: '#8f3f22', label: 'processed' },
};

// How fast one day's intake stops counting — % lost per day/week/month and
// what's left after a day, a week and a month with nothing new coming in.
function FadeDetail({ halfLifeDays }) {
  const f = fadeRate(halfLifeDays);
  const fmt = (v) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
  const rows = [['after 1 day', f.left.day], ['after 1 week', f.left.week], ['after 1 month', f.left.month]];
  return (
    <div style={{ margin: '2px 0 4px' }}>
      <div>
        Loses about <strong>{fmt(f.perDay)}% a day</strong> · {fmt(f.perWeek)}% a week · {fmt(f.perMonth)}% a month.
        Half is gone in roughly {halfLifeText(halfLifeDays)}.
      </div>
      <div style={{ fontSize: 10.5, color: '#888', margin: '6px 0 4px' }}>If you ate nothing new with it, what one good day still counts for:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map(([l, v]) => (
          <div key={l} style={{ display: 'grid', gridTemplateColumns: '82px 1fr 34px', alignItems: 'center', gap: 8, fontSize: 10.5 }}>
            <span style={{ color: '#777' }}>{l}</span>
            <div style={{ height: 5, background: '#efece6', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${v}%`, background: '#8aad8a', borderRadius: 99 }} />
            </div>
            <span style={{ textAlign: 'right', fontWeight: 700, color: '#4a4a42' }}>{v}%</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#aaa', marginTop: 5 }}>Approximate, from published half-lives — real rates vary with your stores, body size and health.</div>
    </div>
  );
}

function Dot({ slot }) {
  const base = { width: 16, height: 16, borderRadius: 99, boxSizing: 'border-box', flexShrink: 0 };
  if (!slot.logged) return <span title="not logged" style={{ ...base, border: '2px dashed #d0c9bd' }} />;
  if (slot.quality === 'skipped') return <span title="skipped" style={{ ...base, border: '2px solid #b8b0a4' }} />;
  const q = Q[slot.quality] || { color: '#b8b0a4', label: 'logged' };
  return (
    <span title={`${q.label}${slot.takeout ? ' · takeout' : ''}`}
      style={{ ...base, background: q.color, outline: slot.takeout ? `2px dashed ${q.color}` : 'none', outlineOffset: 2 }} />
  );
}

function MetPips({ met }) {
  if (!met) return <span style={{ fontSize: 11, color: '#bbb' }}>—</span>;
  const order = [['protein', 'protein'], ['fiber', 'fibre'], ['fats', 'healthy fats'], ['freeSugar', 'free sugar under limit']];
  return (
    <span style={{ display: 'flex', gap: 3 }} title={order.map(([k, l]) => `${met[k] ? '✓' : '·'} ${l}`).join('\n')}>
      {order.map(([k]) => <span key={k} style={{ width: 16, height: 6, borderRadius: 99, background: met[k] ? '#5a7a5a' : '#e6e1d8' }} />)}
    </span>
  );
}

const pctColor = (v) => (v == null ? '#bbb' : v < 50 ? '#a4532e' : v >= 75 ? '#3f5f3f' : '#2a2a2a');

export default function NourishWeek({ foodsByDate, mealsByDate, todayKey, targets, notionRecipes = [], inSeasonNames = [], onAddToShopping }) {
  const [openDay, setOpenDay] = useState(null);
  const [openNutrient, setOpenNutrient] = useState(null);
  const [openRecipe, setOpenRecipe] = useState(null);

  const days = useMemo(() => weekSummary(foodsByDate, mealsByDate, todayKey, targets), [foodsByDate, mealsByDate, todayKey, targets]);
  const counts = weekCounts(days);
  const pattern = weekPattern(days);
  const { stores, loggedDays } = useMemo(() => computeStores(foodsByDate, todayKey), [foodsByDate, todayKey]);
  const gaps = stores.filter((s) => s.level != null && s.level < 50 && !s.limitedData);
  const ranked = useMemo(() => rankRecipesForGaps(gaps.map((g) => g.key), notionRecipes, inSeasonNames, 3), [gaps.map((g) => g.key).join(','), notionRecipes, inSeasonNames]);
  const labelOf = Object.fromEntries(stores.map((s) => [s.key, s.label.replace(/^B\d+ · /, '')]));
  const shortOf = (k) => (labelOf[k] || k).replace('Vitamin ', '');

  const groups = ['water_soluble', 'fat_soluble', 'mineral'].map((g) => ({
    key: g,
    items: stores.filter((s) => s.group === g).sort((a, b) => {
      const la = a.level == null ? 999 : a.level, lb = b.level == null ? 999 : b.level;
      const lowA = la < 50 ? 0 : 1, lowB = lb < 50 ? 0 : 1;
      return lowA - lowB || 0; // low ones first, otherwise keep catalogue order
    }),
  }));

  const anyLogged = days.some((d) => SLOTS.some((s) => d.slots[s].logged));

  return (
    <div>
      {/* ── 1. Day by day ─────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={LABEL}>Your week, day by day</div>
        {!anyLogged ? (
          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', margin: 0 }}>Log a few meals and your week will fill in here.</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              <Chip bg="#eef5ee" color="#3f5f3f">{counts.whole} whole</Chip>
              <Chip bg="#fbf4e0" color="#6e5410">{counts.mixed} mixed</Chip>
              <Chip bg="#fbeee6" color="#8f3f22">{counts.processed} processed</Chip>
              <Chip bg="#f1eee8" color="#4a4a42">{counts.takeout} takeout</Chip>
              {counts.skipped > 0 && <Chip bg="#f7f7f7" color="#777">{counts.skipped} skipped</Chip>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '54px 86px minmax(0,1fr) 52px', gap: 8, fontSize: 10.5, fontWeight: 700, color: '#888', paddingBottom: 6, borderBottom: '1px solid #f0ece6' }}>
              <span>Day</span><span>B · L · D</span><span>Macros met</span><span style={{ textAlign: 'right' }}>Micros</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {days.map((d) => (
                <div key={d.date}>
                  <button onClick={() => setOpenDay(openDay === d.date ? null : d.date)}
                    style={{ width: '100%', display: 'grid', gridTemplateColumns: '54px 86px minmax(0,1fr) 52px', gap: 8, alignItems: 'center', padding: '9px 0', background: d.isToday ? '#f7f3ed' : 'transparent', border: 'none', borderBottom: '1px solid #f5f2ed', borderRadius: d.isToday ? 10 : 0, cursor: 'pointer', fontFamily: FONT, textAlign: 'left', minHeight: 44 }}>
                    <span style={{ fontSize: 13, fontWeight: d.isToday ? 700 : 600, color: '#2a2a2a', paddingLeft: d.isToday ? 6 : 0 }}>{d.label}</span>
                    <span style={{ display: 'flex', gap: 9, alignItems: 'center' }}>{SLOTS.map((s) => <Dot key={s} slot={d.slots[s]} />)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MetPips met={d.met} />
                      {d.isToday && d.metCount != null && <span style={{ fontSize: 10.5, color: '#888' }}>so far</span>}
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: pctColor(d.micro), paddingRight: d.isToday ? 6 : 0 }}>{d.micro == null ? '—' : `${d.micro}%`}</span>
                  </button>
                  {openDay === d.date && (
                    <div style={{ padding: '10px 12px', margin: '6px 0 8px', background: '#fdfcfa', border: '1px solid #f0ece6', borderRadius: 12, fontSize: 12, color: '#555', lineHeight: 1.7 }}>
                      {d.macros ? (
                        <>
                          <div><strong>Protein</strong> {Math.round(d.macros.protein)} / {targets.protein} g {d.met.protein ? '✓' : ''}</div>
                          <div><strong>Fibre</strong> {Math.round(d.macros.fiber)} / {targets.fiber} g {d.met.fiber ? '✓' : ''}</div>
                          <div><strong>Fats</strong> {Math.round(d.macros.unsatFat)} g unsaturated · {Math.round(d.macros.satFat)} g saturated {d.met.fats ? '✓' : ''}</div>
                          <div><strong>Free sugar</strong> {Math.round(d.macros.freeSugar)} g (natural {Math.round(d.macros.naturalSugar)} g) {d.met.freeSugar ? '✓' : ''}</div>
                        </>
                      ) : <div>No nutrient data this day — meal quality still counts.</div>}
                      {d.snacks > 0 && <div style={{ color: '#888' }}>+ {d.snacks} snack{d.snacks > 1 ? 's' : ''}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: 11, color: '#666', marginTop: 12 }}>
              {Object.entries(Q).map(([k, q]) => <Legend key={k} style={{ background: q.color }}>{q.label}</Legend>)}
              <Legend style={{ border: '2px dashed #555' }}>takeout</Legend>
              <Legend style={{ border: '2px solid #b8b0a4' }}>skipped</Legend>
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>Macros met = protein and fibre on target, more healthy than saturated fat, free sugar under the limit. Tap a day for details.</div>
            {pattern && (
              <div style={{ marginTop: 12, background: '#fbf4e0', borderRadius: 12, padding: '10px 12px', fontSize: 12.5, color: '#4a4a42', lineHeight: 1.5 }}>
                <strong style={{ color: '#6e5410' }}>Pattern:</strong> {pattern}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 2. Stores ─────────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={LABEL}>Vitamin &amp; mineral stores</div>
        <p style={{ fontSize: 12.5, color: '#555', lineHeight: 1.55, margin: '0 0 6px' }}>
          Each bar is a weighted average of what you’ve eaten recently. Newer days count more, and how fast older days stop counting depends on how long your body holds that nutrient.
        </p>
        <p style={{ fontSize: 11.5, color: '#888', lineHeight: 1.5, margin: '0 0 14px' }}>
          The small number under each bar is how fast it fades: the share of what you ate that your body uses up or clears per day (or per week, for slow ones). Days you didn’t log are skipped, so forgetting to log never drains a bar.{loggedDays > 0 && loggedDays < 3 ? ' Early estimate — it gets steadier after a few logged days.' : ''}
        </p>
        {loggedDays === 0 ? (
          <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', margin: 0 }}>Log meals with foods and your stores will appear here.</p>
        ) : groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2a2a2a', marginBottom: 8 }}>{GROUP_LABELS[g.key]}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px 16px' }}>
              {g.items.map((s) => {
                const low = s.level != null && s.level < 50;
                const open = openNutrient === s.key;
                return (
                  <button key={s.key} onClick={() => setOpenNutrient(open ? null : s.key)}
                    style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: FONT, gridColumn: open ? '1 / -1' : 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, marginBottom: 3, gap: 6 }}>
                      <span style={{ color: s.level == null ? '#aaa' : '#2a2a2a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.label}{low && <span style={{ marginLeft: 5, fontSize: 9.5, fontWeight: 700, color: '#8f3f22', background: '#fbeee6', borderRadius: 99, padding: '1px 6px' }}>low</span>}
                      </span>
                      <span style={{ fontWeight: 700, color: pctColor(s.level) }}>{s.level == null ? '—' : `${s.level}%`}</span>
                    </div>
                    <div style={{ height: 6, background: s.level == null ? '#f3f1ed' : low ? '#f5ebe4' : '#e9f1e9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.level || 0}%`, background: low ? '#c47a5a' : '#5a7a5a', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#999', marginTop: 2, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <span>{s.level == null ? (s.limitedData ? 'rarely listed in food data' : 'no data yet') : `fades ${fadeRate(s.halfLifeDays).short}`}</span>
                      {s.level != null && <span style={{ color: '#bbb' }}>half in {halfLifeText(s.halfLifeDays)}</span>}
                    </div>
                    {open && (
                      <div style={{ marginTop: 6, padding: '9px 11px', background: '#fdfcfa', border: '1px solid #f0ece6', borderRadius: 10, fontSize: 11.5, color: '#555', lineHeight: 1.6 }}>
                        {s.note && <div>{s.note.charAt(0).toUpperCase() + s.note.slice(1)}.</div>}
                        <FadeDetail halfLifeDays={s.halfLifeDays} />
                        {s.lastTopUp && <div>Last good top-up: {new Date(`${s.lastTopUp}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })}.</div>}
                        {(NUTRIENT_FOOD_SUGGESTIONS[s.key] || []).length > 0 && <div>Good sources: {NUTRIENT_FOOD_SUGGESTIONS[s.key].map((f) => f.name).join(', ')}.</div>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {stores.find((s) => s.key === 'vit_d' && s.level != null && s.level < 50) && (
          <div style={{ fontSize: 11.5, color: '#777', lineHeight: 1.5, background: '#f7f3ed', borderRadius: 10, padding: '9px 12px' }}>
            Vitamin D is hard to get from food alone, and Oct–Mar sun in the Netherlands is too weak to make much. The Dutch Health Council advises a supplement for many groups — worth checking with your GP.
          </div>
        )}
      </div>

      {/* ── 3. Gap recipes ────────────────────────────────────────────── */}
      {gaps.length > 0 && (
        <div style={CARD}>
          <div style={LABEL}>Recipes that close the most gaps</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: '#888' }}>Running low:</span>
            {gaps.map((g) => <span key={g.key} style={{ fontSize: 11.5, fontWeight: 600, color: '#8f3f22', background: '#fbeee6', borderRadius: 99, padding: '3px 9px' }}>{shortOf(g.key)}</span>)}
          </div>
          {ranked.length === 0 ? (
            <p style={{ fontSize: 12, color: '#999', margin: 0 }}>No recipe covers these yet — try the “good sources” listed under each bar.</p>
          ) : ranked.map(({ recipe, covers, inSeason }, idx) => {
            const byIngredient = {};
            covers.forEach((c) => { (byIngredient[c.via] ||= []).push(c); });
            const full = covers.filter((c) => !c.partial).length;
            const open = openRecipe === recipe.id;
            return (
              <div key={recipe.id} style={{ border: `1.5px solid ${idx === 0 ? '#9dbd9d' : '#e8e4de'}`, borderRadius: 16, padding: '12px 14px', marginBottom: 10 }}>
                <button onClick={() => setOpenRecipe(open ? null : recipe.id)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: FONT }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#2a2a2a', lineHeight: 1.3 }}>{recipe.name}</div>
                    <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: full === gaps.length ? 'white' : '#3f5f3f', background: full === gaps.length ? '#3f5f3f' : '#eef5ee', borderRadius: 99, padding: '4px 9px' }}>
                      {covers.length} of {gaps.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#888', marginTop: 3 }}>
                    {[recipe.minutes ? `${recipe.minutes} min` : null, inSeason ? 'in season now' : null, recipe.source === 'notion' ? 'from your recipe book' : null].filter(Boolean).join(' · ')} · {open ? 'hide' : 'view'} recipe
                  </div>
                </button>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {Object.entries(byIngredient).map(([ing, cs]) => (
                    <span key={ing} style={{ fontSize: 11, color: '#3f5f3f', background: '#eef5ee', borderRadius: 99, padding: '3px 9px' }}>
                      {ing.toLowerCase()} → {cs.map((c) => `${c.partial ? 'a little ' : ''}${shortOf(c.key)}`).join(', ')}
                    </span>
                  ))}
                </div>
                {open && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #f0ece6', paddingTop: 10 }}>
                    {recipe.ingredients.map((i, n) => {
                      const helps = sourcesFor(i.name).filter((s) => gaps.some((g) => g.key === s.key));
                      return (
                        <div key={n} style={{ display: 'flex', gap: 8, fontSize: 12.5, marginBottom: 4 }}>
                          <span style={{ color: '#9a7a2a', fontWeight: 600, minWidth: 92 }}>{i.amount}</span>
                          <span style={{ color: '#444' }}>{i.name}{helps.length > 0 && <span style={{ color: '#5a7a5a' }}> ●</span>}</span>
                        </div>
                      );
                    })}
                    {recipe.steps.length > 0 && (
                      <ol style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#444', lineHeight: 1.6 }}>
                        {recipe.steps.map((s, n) => <li key={n}>{s}</li>)}
                      </ol>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {onAddToShopping && (
                        <button onClick={() => onAddToShopping(recipe.ingredients.map((i) => i.name))}
                          style={{ fontSize: 11.5, fontWeight: 600, color: '#5a7a5a', background: '#f0f7f0', border: '1px solid #b5ceb5', borderRadius: 99, padding: '7px 12px', cursor: 'pointer', fontFamily: FONT }}>
                          🛒 Add to shopping list
                        </button>
                      )}
                      {recipe.notion_url && <a href={recipe.notion_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: '#5a7a5a', alignSelf: 'center' }}>Open in Notion ↗</a>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 10.5, color: '#aaa', textAlign: 'center', lineHeight: 1.5, margin: '0 0 20px' }}>
        Modelled estimates from logged foods, not blood levels. Half-lives are approximate and vary from person to person.
      </p>
    </div>
  );
}

const SLOTS = ['breakfast', 'lunch', 'dinner'];

function Chip({ bg, color, children }) {
  return <span style={{ fontSize: 12, fontWeight: 700, color, background: bg, borderRadius: 99, padding: '4px 10px' }}>{children}</span>;
}
function Legend({ style, children }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: 99, boxSizing: 'border-box', ...style }} />{children}
    </span>
  );
}
