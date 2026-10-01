'use client';

// NourishInsights.jsx — v4 building blocks for the Nourish tab (Today view):
//   • TypeMealPanel    type a meal in plain words → editable ingredient list
//   • MealSummaryCard  "this meal gave you" right after logging
//   • MacrosCard       today's macros against editable targets + limits
//   • SugarCard        free vs natural sugar (replaces the old total-sugar card)

import { useState, useEffect } from 'react';
import {
  sumMacros, dayMicroPercents, MICROS, classifySugar, DEFAULT_TARGETS, saveTargets,
} from '../lib/nutrientModel';

const CARD  = { background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 20 };
const LABEL = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 14 };
const FONT = 'DM Sans,sans-serif';
const r1 = (n) => Math.round(n * 10) / 10;
const r0 = (n) => Math.round(n);

// ── Type a meal ─────────────────────────────────────────────────────────────
// Three kinds of meal come back from /api/parse-meal:
//   single  — a plate you ate in full
//   recipe  — a pot you cooked: items are the WHOLE recipe, you log eaten/made
//   takeout — a described dish: items are a regular portion × size × share eaten
const FACTORS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const factorLabel = (f) => ({ 0.25: '¼×', 0.5: '½×', 0.75: '¾×', 1: '', 1.25: '1¼×', 1.5: '1½×', 2: '2×', 3: '3×' }[f] ?? `${f}×`);
const PORTIONS = [['small', 'Small', 0.75], ['regular', 'Regular', 1], ['large', 'Large', 1.35], ['xl', 'Extra large', 1.7]];
const PORTION_FACTOR = Object.fromEntries(PORTIONS.map(([k, , f]) => [k, f]));
const PORTION_NAME = Object.fromEntries(PORTIONS.map(([k, l]) => [k, l]));
const EATEN = [[1, 'All of it'], [0.75, '¾'], [0.5, 'Half'], [0.25, 'A few bites']];
const RECIPES_KEY = 'bloom-my-recipes';
const LEFTOVER_DAYS = 7;

const fracText = (x) => {
  const nice = [[1, 'all'], [0.5, '½'], [1 / 3, '⅓'], [0.25, '¼'], [0.2, '⅕'], [1 / 6, '⅙'], [0.125, '⅛'], [2 / 3, '⅔'], [0.75, '¾'], [0.4, '⅖'], [0.6, '⅗']];
  const hit = nice.find(([v]) => Math.abs(v - x) < 0.01);
  return hit ? hit[1] : `${Math.round(x * 100)}%`;
};
const servingsText = (n) => `${Number.isInteger(n) ? n : r1(n)} serving${n === 1 ? '' : 's'}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

function loadRecipes() {
  try {
    const all = JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]');
    const cutoff = Date.now() - LEFTOVER_DAYS * 864e5;
    return all.filter((r) => r.servingsLeft > 0.01 && new Date(`${r.madeOn}T12:00:00`).getTime() >= cutoff);
  } catch { return []; }
}
function saveRecipes(list) { try { localStorage.setItem(RECIPES_KEY, JSON.stringify(list)); } catch {} }

function shareOf(p) {
  if (!p) return 1;
  if (p.kind === 'recipe') return Math.min(1, (p.servingsEaten || 1) / Math.max(0.5, p.servingsMade || 1));
  if (p.kind === 'takeout') return (PORTION_FACTOR[p.portion] || 1) * (p.eatenFraction || 1);
  return 1;
}

export function TypeMealPanel({ quality, busy, onConfirm, onBack, takeout = false, onQuickTakeout }) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null); // { title, kind, items: [...{ factor }], servingsMade, servingsEaten, portion, eatenFraction }
  const [error, setError] = useState('');
  const [leftovers, setLeftovers] = useState([]);
  useEffect(() => { setLeftovers(loadRecipes()); }, []);

  async function estimate() {
    if (!text.trim()) return;
    setParsing(true); setError('');
    try {
      const res = await fetch('/api/parse-meal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, quality, takeout }) });
      const data = await res.json();
      if (!res.ok || !data.items?.length) throw new Error(data.error || 'Could not read that meal');
      const kind = takeout ? 'takeout' : data.kind || 'single';
      setParsed({
        title: data.title, kind, matched: data.matched !== false, engine: data.engine,
        servingsMade: data.servingsMade || (kind === 'recipe' ? 1 : null),
        servingsEaten: data.servingsEaten || (kind === 'recipe' ? 1 : null),
        servingsGuessed: !!data.servingsGuessed,
        portion: data.portion || (kind === 'takeout' ? 'regular' : null),
        eatenFraction: data.eatenFraction || (kind === 'takeout' ? 1 : null),
        items: data.items.map((i) => ({ ...i, factor: 1, key: `${i.name}-${Math.random().toString(36).slice(2, 7)}` })),
      });
    } catch (e) {
      setError(takeout
        ? 'Couldn’t read that — try the dish and what was in it, e.g. “pad thai with chicken, large”.'
        : 'Couldn’t read that — try listing items with commas, e.g. “2 eggs, 1 slice sourdough, half an avocado”.');
    }
    setParsing(false);
  }

  function useLeftover(r) {
    setParsed({
      title: r.title, kind: 'recipe', matched: true, leftoverId: r.id,
      servingsMade: r.servingsMade, servingsEaten: Math.min(1, r.servingsLeft), servingsGuessed: false,
      items: r.items.map((i) => ({ ...i, factor: 1, key: `${i.name}-${Math.random().toString(36).slice(2, 7)}` })),
    });
  }
  function dropLeftover(id) {
    try { const all = JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]'); saveRecipes(all.filter((r) => r.id !== id)); } catch {}
    setLeftovers(loadRecipes());
  }

  const set = (patch) => setParsed((p) => ({ ...p, ...patch }));
  const update = (key, patch) => setParsed((p) => ({ ...p, items: p.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  const remove = (key) => setParsed((p) => ({ ...p, items: p.items.filter((i) => i.key !== key) }));
  const step = (item, dir) => {
    const idx = FACTORS.indexOf(item.factor);
    const next = FACTORS[Math.min(FACTORS.length - 1, Math.max(0, idx + dir))];
    update(item.key, { factor: next, estimated: false });
  };
  const answer = (item, option) => {
    const sugar = classifySugar(option, item.prep || [], quality);
    update(item.key, { name: option.toLowerCase(), display: option, question: null, sugarForm: sugar.form, sugarReason: sugar.reason });
  };

  const share = shareOf(parsed);
  const wholeGrams = parsed ? parsed.items.reduce((s, i) => s + i.grams * i.factor, 0) : 0;

  function confirm() {
    const p = parsed;
    const items = p.items.map((i) => {
      const whole = i.grams * i.factor;
      const amount = i.factor === 1 ? i.amountText : `${factorLabel(i.factor)} ${i.amountText}`;
      let amountText = amount;
      if (p.kind === 'recipe' && share < 0.999) amountText = `${fracText(share)} of ${amount}`;
      if (p.kind === 'takeout') amountText = `${PORTION_NAME[p.portion].toLowerCase()} portion${p.eatenFraction < 1 ? `, ate ${fracText(p.eatenFraction)}` : ''}`;
      return { ...i, grams: Math.max(0.1, r1(whole * share)), amountText };
    });
    let title = p.title;
    if (p.kind === 'recipe') title = `${p.title || 'Home-cooked meal'} · ${servingsText(p.servingsEaten)} of ${p.servingsMade}`;
    if (p.kind === 'takeout') title = `${p.title || 'Takeout'}${p.portion !== 'regular' ? ` (${PORTION_NAME[p.portion].toLowerCase()})` : ''}`;

    // Remember batch-cooked recipes so leftovers are one tap tomorrow
    if (p.kind === 'recipe') {
      try {
        const all = JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]');
        if (p.leftoverId) {
          const next = all.map((r) => (r.id === p.leftoverId ? { ...r, servingsLeft: r.servingsLeft - p.servingsEaten } : r)).filter((r) => r.servingsLeft > 0.01);
          saveRecipes(next);
        } else if (p.servingsMade - p.servingsEaten > 0.01) {
          const wholeItems = p.items.map(({ key, factor, ...i }) => ({ ...i, grams: r1(i.grams * factor), amountText: factor === 1 ? i.amountText : `${factorLabel(factor)} ${i.amountText}`, estimated: false }));
          saveRecipes([{ id: `r${Date.now()}`, title: p.title || 'Home-cooked meal', items: wholeItems, servingsMade: p.servingsMade, servingsLeft: p.servingsMade - p.servingsEaten, madeOn: todayISO() }, ...all].slice(0, 20));
        }
      } catch {}
    }
    onConfirm(items, title, {
      kind: p.kind, takeout: p.kind === 'takeout',
      servingsMade: p.servingsMade, servingsEaten: p.servingsEaten, portion: p.portion, eatenFraction: p.eatenFraction,
    });
  }

  return (
    <div>
      {/* Leftovers from recipes cooked this week */}
      {!takeout && !parsed && leftovers.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>Leftovers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {leftovers.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', border: '1.5px solid #e3d6b8', background: '#fdf8ed', borderRadius: 12 }}>
                <span style={{ fontSize: 16 }}>🍲</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: '#8a7a55' }}>{servingsText(r.servingsLeft)} left · made {new Date(`${r.madeOn}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                </div>
                <button onClick={() => useLeftover(r)} style={{ padding: '6px 11px', borderRadius: 99, border: 'none', background: '#5a7a5a', color: 'white', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>Log a serving</button>
                <button aria-label={`Remove ${r.title} leftovers`} onClick={() => dropLeftover(r.id)} style={{ ...stepBtn, width: 26, height: 26, border: 'none', color: '#bbb', background: 'none' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!parsed?.leftoverId && (<>
        <label htmlFor="bloom-type-meal" style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
          {takeout ? 'What did you have?' : 'What did you eat?'} <span style={{ fontWeight: 400, color: '#888' }}>{takeout ? 'Describe it like you’d tell a friend' : 'Write it like you’d text a friend'}</span>
        </label>
        <textarea id="bloom-type-meal" value={text} onChange={(e) => setText(e.target.value)} rows={takeout ? 3 : 4}
          placeholder={takeout
            ? 'e.g. Pad thai with chicken, it was a large serving'
            : 'e.g. Oatmeal with ⅔ cup oats, 1 cup milk, 1 tbsp chia seeds… — or a recipe: “Made salmon risotto with 2 salmon fillets, 350 g risotto rice, ½ l broth… made 4 servings, I ate 1”'}
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 12, border: '1.5px solid #cfdccf', fontSize: 13, lineHeight: 1.5, fontFamily: FONT, resize: 'vertical', outline: 'none', background: '#fbfdfb' }} />
      </>)}
      {!parsed && (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={estimate} disabled={parsing || !text.trim()}
              style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: text.trim() ? '#5a7a5a' : '#e8e4de', color: 'white', fontWeight: 600, fontSize: 13, cursor: text.trim() ? 'pointer' : 'not-allowed', fontFamily: FONT }}>
              {parsing ? 'Reading your meal…' : 'Read my meal →'}
            </button>
            {onBack && <button onClick={onBack} style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e8e4de', background: 'white', fontSize: 12, cursor: 'pointer', fontFamily: FONT, color: '#888' }}>← Back</button>}
          </div>
          {takeout && onQuickTakeout && (
            <button onClick={onQuickTakeout} style={{ marginTop: 10, fontSize: 11.5, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONT, textDecoration: 'underline' }}>
              Don’t remember — just log that it was takeout
            </button>
          )}
        </>
      )}
      {error && <p style={{ fontSize: 12, color: '#a04040', margin: '8px 0 0' }}>{error}</p>}

      {parsed && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#888' }}>
              {parsed.leftoverId ? 'Leftovers' : 'We read this as'}{parsed.title ? ` · ${parsed.title}` : ''}
            </div>
            <button onClick={() => setParsed(null)} style={{ fontSize: 11, color: '#5a7a5a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 600 }}>{parsed.leftoverId ? 'Back' : 'Edit text'}</button>
          </div>

          {/* Recipe: servings made / eaten */}
          {parsed.kind === 'recipe' && (
            <div style={{ background: '#f4f8f4', border: '1.5px solid #cfdccf', borderRadius: 14, padding: '11px 13px', marginBottom: 10 }}>
              <Stepper label="The recipe made" value={parsed.servingsMade} unit="servings" min={1} max={20} step={1}
                onChange={(v) => set({ servingsMade: v, servingsEaten: Math.min(parsed.servingsEaten, v), servingsGuessed: false })} disabled={!!parsed.leftoverId} />
              {parsed.servingsGuessed && <div style={{ fontSize: 10.5, color: '#9a6810', margin: '-2px 0 6px' }}>Our guess from the ingredients — change it if you know.</div>}
              <Stepper label={parsed.leftoverId ? 'Eating now' : 'You ate'} value={parsed.servingsEaten} unit={parsed.servingsEaten === 1 ? 'serving' : 'servings'} min={0.5} max={parsed.leftoverId ? Math.max(0.5, leftovers.find((r) => r.id === parsed.leftoverId)?.servingsLeft || parsed.servingsMade) : parsed.servingsMade} step={0.5}
                onChange={(v) => set({ servingsEaten: v })} />
              <div style={{ fontSize: 11.5, color: '#4a6a4a', marginTop: 4 }}>
                You’ll log <strong>{fracText(share)}</strong> of everything below · about <strong>{r0(wholeGrams * share)} g</strong>
                {!parsed.leftoverId && parsed.servingsMade - parsed.servingsEaten > 0.01 && <> · {servingsText(parsed.servingsMade - parsed.servingsEaten)} saved as leftovers</>}
              </div>
            </div>
          )}
          {parsed.kind === 'single' && !takeout && (
            <button onClick={() => set({ kind: 'recipe', servingsMade: 2, servingsEaten: 1, servingsGuessed: false })}
              style={{ fontSize: 11.5, color: '#5a7a5a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8, fontFamily: FONT, fontWeight: 600 }}>
              Cooked a batch? Split it into servings →
            </button>
          )}

          {/* Takeout: portion size + how much you ate */}
          {parsed.kind === 'takeout' && (
            <div style={{ background: '#fdf8ed', border: '1.5px solid #e9d9b0', borderRadius: 14, padding: '11px 13px', marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#7a5a10', marginBottom: 6 }}>Portion size</div>
              <Chips options={PORTIONS.map(([k, l]) => [k, l])} value={parsed.portion} onChange={(v) => set({ portion: v })} />
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#7a5a10', margin: '10px 0 6px' }}>How much did you eat?</div>
              <Chips options={EATEN} value={parsed.eatenFraction} onChange={(v) => set({ eatenFraction: v })} />
              <div style={{ fontSize: 11, color: '#8a7040', marginTop: 8, lineHeight: 1.5 }}>
                Amounts below are a typical regular restaurant portion — includes the oil and sugar most kitchens add. You’ll log about <strong>{r0(wholeGrams * share)} g</strong>.
              </div>
              {!parsed.matched && (
                <div style={{ fontSize: 11, color: '#a06040', marginTop: 6, lineHeight: 1.5 }}>We don’t know this dish well yet, so this is rough — adding its main parts (e.g. “rice, chicken, peanut sauce”) makes it better.</div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {parsed.items.map((i) => {
              const whole = i.grams * i.factor;
              const amount = i.factor === 1 ? i.amountText : `${factorLabel(i.factor)} ${i.amountText}`;
              return (
                <div key={i.key} style={{ padding: '9px 11px', border: `1.5px solid ${i.estimated ? '#ecd9a8' : '#e8e4de'}`, borderRadius: 12, background: '#fdfcfa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a' }}>{i.display}</div>
                      <div style={{ fontSize: 11, color: '#777' }}>
                        {parsed.kind === 'takeout' ? `~${r0(whole)} g` : `${amount} · ${r1(whole)} g`}
                        {share < 0.999 || share > 1.001 ? <span style={{ color: '#4a6a4a' }}> → you: {r1(whole * share)} g</span> : null}
                        {i.sugarForm === 'free' && <span style={{ color: '#a06040' }}> · free sugar</span>}
                        {i.estimated && <span style={{ color: '#9a6810' }}> · amount guessed</span>}
                      </div>
                    </div>
                    <button aria-label={`Less ${i.display}`} onClick={() => step(i, -1)} style={stepBtn}>−</button>
                    <button aria-label={`More ${i.display}`} onClick={() => step(i, +1)} style={stepBtn}>+</button>
                    <button aria-label={`Remove ${i.display}`} onClick={() => remove(i.key)} style={{ ...stepBtn, border: 'none', color: '#bbb' }}>✕</button>
                  </div>
                  {i.question && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9a6810', marginRight: 2 }}>{i.question.prompt}</span>
                      {i.question.options.map((o) => (
                        <button key={o} onClick={() => answer(i, o)}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, border: `1.5px solid ${o.toLowerCase() === i.name ? '#5a7a5a' : '#e8e4de'}`, background: o.toLowerCase() === i.name ? '#5a7a5a' : 'white', color: o.toLowerCase() === i.name ? 'white' : '#555', cursor: 'pointer', fontFamily: FONT, fontWeight: 600 }}>
                          {o.replace(' milk', '')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={confirm} disabled={busy || parsed.items.length === 0}
              style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#5a7a5a', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>
              {busy ? 'Estimating nutrients…'
                : parsed.kind === 'recipe' ? `✓ Log ${servingsText(parsed.servingsEaten)}`
                : parsed.kind === 'takeout' ? '✓ Log takeout'
                : `✓ Log ${parsed.items.length} item${parsed.items.length > 1 ? 's' : ''}`}
            </button>
            {onBack && <button onClick={onBack} style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e8e4de', background: 'white', fontSize: 12, cursor: 'pointer', fontFamily: FONT, color: '#888' }}>← Back</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, unit, min, max, step, onChange, disabled }) {
  const v = Number.isInteger(value) ? value : r1(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ flex: 1, fontSize: 12.5, color: '#3a4a3a' }}>{label}</span>
      {!disabled && <button aria-label={`Fewer ${unit}`} onClick={() => onChange(Math.max(min, value - step))} style={stepBtn}>−</button>}
      <span style={{ minWidth: 74, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#2a2a2a' }}>{v} {unit}</span>
      {!disabled && <button aria-label={`More ${unit}`} onClick={() => onChange(Math.min(max, value + step))} style={stepBtn}>+</button>}
    </div>
  );
}

function Chips({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(([k, l]) => (
        <button key={String(k)} onClick={() => onChange(k)}
          style={{ padding: '6px 12px', borderRadius: 99, border: `1.5px solid ${value === k ? '#c4880a' : '#e8e4de'}`, background: value === k ? '#c4880a' : 'white', color: value === k ? 'white' : '#555', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: FONT }}>
          {l}
        </button>
      ))}
    </div>
  );
}
const stepBtn = { width: 30, height: 30, borderRadius: 8, border: '1.5px solid #cfdccf', background: 'white', cursor: 'pointer', fontSize: 15, color: '#5a7a5a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT };

// ── Shared bits ─────────────────────────────────────────────────────────────
function MacroTile({ label, value, sub, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '11px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color }}>{label}</div>
      <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 26, lineHeight: 1.1, color: '#1a1a16' }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: '#666', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function Bar({ pct, color, bg = '#f0ede8', h = 7 }) {
  return (
    <div style={{ height: h, background: bg, borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: color, borderRadius: 99, transition: 'width .5s' }} />
    </div>
  );
}

const MICRO_LABEL = Object.fromEntries(MICROS.map((m) => [m.key, m.label]));

// ── This meal gave you ──────────────────────────────────────────────────────
export function MealSummaryCard({ summary, onClose }) {
  if (!summary) return null;
  const { title, mealLabel, entries, quality } = summary;
  const m = sumMacros(entries, { [entries[0]?.meal]: quality });
  const micro = dayMicroPercents(entries);
  const standouts = Object.entries(micro).filter(([, v]) => v >= 15).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const freeSources = entries.filter((e) => e.sugarForm === 'free' && (e.nutrients || []).some((n) => n.key === 'sugar' && n.amount > 0.5));
  const names = entries.map((e) => e.name.toLowerCase()).join(' ');
  const tip = /turmeric/.test(names) && /pepper/.test(names)
    ? 'Nice pairing: black pepper’s piperine helps your body absorb the curcumin in turmeric.'
    : /(spinach|lentil|bean|chickpea|tofu)/.test(names) && /(pepper|orange|lemon|kiwi|strawberr|broccoli|tomato)/.test(names)
      ? 'Nice pairing: the vitamin C here helps you absorb the plant iron.'
      : null;
  const noData = entries.every((e) => !(e.nutrients || []).length);

  return (
    <div style={{ ...CARD, border: '1.5px solid #b5ceb5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ ...LABEL, marginBottom: 0 }}>{title || mealLabel} gave you</div>
        <button onClick={onClose} aria-label="Close meal summary" style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
      {noData ? (
        <p style={{ fontSize: 12, color: '#999', margin: 0 }}>No nutrient data came back for these foods yet — they still count toward your food groups and meal quality.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
            <MacroTile label="Protein" value={`${r0(m.protein)} g`} color="#9a6810" bg="#fdf8ed" />
            <MacroTile label="Fats" value={`${r0(m.fat)} g`} sub={`${m.omega3 >= 0.1 ? `omega-3 ${r1(m.omega3)} g · ` : ''}saturated ${r0(m.satFat)} g`} color="#3a6a3a" bg="#f0f7f0" />
            <MacroTile label="Carbs" value={`${r0(m.carbs)} g`} sub={`fibre ${r0(m.fiber)} g`} color="#5a4a7e" bg="#f3f0f8" />
            <MacroTile label="Sugar" value={`${r0(m.freeSugar)} g free`} sub={`${r0(m.naturalSugar)} g natural`} color="#8f4a2a" bg="#fdf3ed" />
          </div>
          {standouts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>Standout nutrients</div>
              {standouts.map(([k, v]) => (
                <div key={k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                    <span>{MICRO_LABEL[k]}</span><span style={{ color: '#5a7a5a', fontWeight: 700 }}>{v >= 100 ? '100%+' : `${r0(v)}%`}</span>
                  </div>
                  <Bar pct={v} color="#8aad8a" h={6} />
                </div>
              ))}
            </div>
          )}
          {freeSources.length > 0 && (
            <div style={{ fontSize: 11.5, color: '#a06040', marginBottom: 8, lineHeight: 1.5 }}>
              Counted as free sugar: {freeSources.map((e) => e.name).join(', ')} — {freeSources[0].sugarReason || 'added, juiced or puréed'}.
            </div>
          )}
          {tip && <div style={{ background: '#f7f3ed', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#555', lineHeight: 1.5 }}>{tip}</div>}
        </>
      )}
      <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 10 }}>Estimates from USDA typical values, not lab measurements.</div>
    </div>
  );
}

// ── Today's macros ──────────────────────────────────────────────────────────
export function MacrosCard({ entries, meals, targets, setTargets }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(targets);
  const withData = entries.filter((e) => (e.nutrients || []).length);
  const m = sumMacros(withData, meals);
  const hasFatData = withData.some((e) => (e.nutrients || []).some((n) => n.key === 'fat'));

  function save() {
    const clean = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Math.max(1, Number(v) || DEFAULT_TARGETS[k])]));
    setTargets(clean); saveTargets(clean); setEditing(false);
  }

  const row = (label, value, target, unit, color, bg, sub) => (
    <div key={label}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2a2a2a' }}>{label}</span>
        <span style={{ fontSize: 12.5 }}><strong>{r0(value)}</strong>{target != null ? <span style={{ color: '#888' }}> / {target} {unit}</span> : <span style={{ color: '#888' }}> {unit}</span>}</span>
      </div>
      <Bar pct={target ? (value / target) * 100 : Math.min(100, value / 3)} color={color} bg={bg} h={9} />
      {sub && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ ...LABEL, marginBottom: 0 }}>Today’s macros</div>
        <button onClick={() => { setDraft(targets); setEditing((e) => !e); }} style={{ fontSize: 11, color: '#5a7a5a', background: '#f0f7f0', border: '1px solid #b5ceb5', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', fontFamily: FONT, fontWeight: 600 }}>
          {editing ? 'Cancel' : 'Targets'}
        </button>
      </div>

      {editing && (
        <div style={{ background: '#f7f3ed', borderRadius: 12, padding: 12, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          {[['protein', 'Protein (g)'], ['fiber', 'Fibre (g)'], ['freeSugar', 'Free sugar limit (g)'], ['satFat', 'Saturated fat limit (g)'], ['sodium', 'Sodium limit (mg)']].map(([k, l]) => (
            <label key={k} style={{ fontSize: 11, color: '#666', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {l}
              <input type="number" inputMode="numeric" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                style={{ padding: '7px 9px', borderRadius: 8, border: '1.5px solid #e8e4de', fontSize: 13, fontFamily: FONT }} />
            </label>
          ))}
          <button onClick={save} style={{ gridColumn: '1 / -1', padding: 10, borderRadius: 10, border: 'none', background: '#5a7a5a', color: 'white', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>Save targets</button>
          <div style={{ gridColumn: '1 / -1', fontSize: 10.5, color: '#999', lineHeight: 1.5 }}>Protein ≈ 0.8–1.2 g per kg body weight. Fibre 30–40 g (Dutch Health Council). Free sugar &lt; 25 g (WHO). Saturated fat ≈ 20 g. Sodium &lt; 2 000 mg = 5 g salt.</div>
        </div>
      )}

      {withData.length === 0 ? (
        <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', textAlign: 'center', margin: '4px 0' }}>Log a meal to see protein, fibre and fats fill up.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {row('Protein', m.protein, targets.protein, 'g', '#c4880a', '#f5efe2')}
          {row('Fibre', m.fiber, targets.fiber, 'g', '#7a8f4a', '#eef1e6')}
          {hasFatData && row('Healthy fats', m.unsatFat, null, 'g unsaturated', '#5a7a5a', '#e9f1e9', m.omega3 >= 0.1 ? `omega-3 ${r1(m.omega3)} g` : null)}
          {hasFatData && row('Carbs', m.carbs, null, 'g', '#7a6a9e', '#efecf5')}
          <div style={{ borderTop: '1px solid #f0ece6', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#a06040', letterSpacing: '0.6px' }}>LIMITS — LOWER IS FINE</div>
            {row('Free sugar', m.freeSugar, targets.freeSugar, 'g', '#c47a5a', '#f7ece6', m.naturalSugar >= 1 ? `${r0(m.naturalSugar)} g natural sugar from whole fruit, veg and milk isn’t counted.` : null)}
            {hasFatData && row('Saturated fat', m.satFat, targets.satFat, 'g', '#c47a5a', '#f7ece6')}
            {m.sodium > 0 && row('Sodium', m.sodium, targets.sodium, 'mg', '#c47a5a', '#f7ece6', `≈ ${r1(m.sodium * 2.5 / 1000)} g salt`)}
          </div>
          {m.protein < targets.protein * 0.4 && new Date().getHours() >= 12 && (
            <div style={{ background: '#fdf8ed', border: '1px solid #ecd9a8', borderRadius: 12, padding: '10px 12px', fontSize: 12, color: '#6e4f0c', lineHeight: 1.5 }}>
              Protein is light so far — lentils, eggs, Greek yoghurt, tofu or fish each add about 15–25 g.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Free vs natural sugar ───────────────────────────────────────────────────
export function SugarCard({ entries, meals, limit = 25 }) {
  const withData = entries.filter((e) => (e.nutrients || []).length);
  if (!withData.length) return null;
  const m = sumMacros(withData, meals);
  const over = m.freeSugar > limit;
  const zone = m.freeSugar <= limit * 0.6
    ? { label: 'Low today', color: '#5a7a5a', bg: '#f0f7f0', border: '#8aad8a', bar: 'linear-gradient(90deg,#8aad8a,#5a7a5a)' }
    : m.freeSugar <= limit
      ? { label: 'On track', color: '#9a8a3a', bg: '#fdf8e0', border: '#c8b850', bar: 'linear-gradient(90deg,#d4c850,#a89a30)' }
      : { label: 'Over reference', color: '#a06040', bg: '#fdf3ed', border: '#d4a882', bar: 'linear-gradient(90deg,#e8a870,#c47840)' };
  const freeFoods = withData.filter((e) => e.sugarForm === 'free' || (!e.sugarForm && classifySugar(e.name, e.prep || [], meals?.[e.meal]).form === 'free'))
    .map((e) => ({ name: e.name, g: (e.nutrients || []).find((n) => n.key === 'sugar')?.amount || 0 }))
    .filter((x) => x.g >= 0.5).sort((a, b) => b.g - a.g);

  return (
    <div style={CARD}>
      <div style={LABEL}>Sugar Awareness 🍬</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 700, color: zone.color, lineHeight: 1 }}>
            {r1(m.freeSugar)}<span style={{ fontSize: 14, fontWeight: 400, color: '#aaa', marginLeft: 4 }}>g free</span>
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 3 }}>of {limit} g WHO daily reference</div>
        </div>
        <div style={{ padding: '5px 13px', background: zone.bg, border: `1.5px solid ${zone.border}`, borderRadius: 99, fontSize: 12, fontWeight: 600, color: zone.color }}>{zone.label}</div>
      </div>
      <div style={{ height: 8, background: '#f0ede8', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${Math.min(100, (m.freeSugar / limit) * 100)}%`, background: zone.bar, borderRadius: 99, transition: 'width 0.6s' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#fdf3ed', borderRadius: 12, padding: '9px 11px' }}>
          <div style={{ fontSize: 11, color: '#8f4a2a', fontWeight: 600 }}>Free sugar</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#2a2a2a' }}>{r1(m.freeSugar)} g</div>
          <div style={{ fontSize: 10.5, color: '#888' }}>added, honey, syrups, juice, purées</div>
        </div>
        <div style={{ background: '#f0f7f0', borderRadius: 12, padding: '9px 11px' }}>
          <div style={{ fontSize: 11, color: '#3a6a3a', fontWeight: 600 }}>Natural sugar</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#2a2a2a' }}>{r1(m.naturalSugar)} g</div>
          <div style={{ fontSize: 10.5, color: '#888' }}>inside whole fruit, veg, milk — not counted</div>
        </div>
      </div>
      {freeFoods.length > 0 && (
        <p style={{ fontSize: 12, color: over ? '#a06040' : '#777', margin: '0 0 10px' }}>
          Free sugar came from: {freeFoods.slice(0, 4).map((f) => `${f.name} (${r1(f.g)} g)`).join(', ')}.
        </p>
      )}
      <div style={{ padding: '9px 12px', background: '#f7f3ed', borderRadius: 10, fontSize: 11, color: '#777', lineHeight: 1.6 }}>
        🔬 Whole or chopped fruit keeps its sugar inside the cell walls, alongside fibre, so it isn’t counted. Mashing, blending or juicing releases it — Bloom follows the UK/NHS rule and counts purées, smoothies and juice as free sugar.
      </div>
    </div>
  );
}
