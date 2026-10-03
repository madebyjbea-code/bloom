'use client';

// HealthBreakdownModal.jsx — tap the ❤️ Health bar to see what's lifting it,
// what's holding it back, today's ceiling, and the single best next move.
//
// It mirrors the real rules in Dashboard.jsx / store.ts:
//   • ceiling 90 % until all 4 pillars are met (water, mindfulness, movement, sleep)
//   • −5 on that ceiling when no meal is logged in Nourish
//   • +3 per habit done, +1 water, +2 mindfulness, +1 movement
//   • overnight dip based on YESTERDAY: 0 if all 4 pillars + a meal were logged,
//     −1 per thing missed (max −5), −5 if nothing was logged; none on rest days
//   • bad-habit slips cost their penalty when logged
//   • 3 processed meals in a row → −3

import { useStore } from '../lib/store';

const FONT = 'DM Sans,sans-serif';

function Row({ title, detail, pill, tone, progress }) {
  const tones = {
    good: { color: '#3f5f3f', bg: '#eaf3ea' },
    bad:  { color: '#a4532e', bg: '#fbeee6' },
    warn: { color: '#8a6414', bg: '#fbf4e2' },
  }[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0ece6' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f1f1a' }}>{title}</div>
        {detail && <div style={{ fontSize: 12, color: '#6b6860', marginTop: 1 }}>{detail}</div>}
        {progress != null && (
          <div style={{ height: 6, background: '#f3ece5', borderRadius: 99, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: '#c47a5a', borderRadius: 99 }} />
          </div>
        )}
      </div>
      {pill && <span style={{ fontSize: 12, fontWeight: 700, color: tones.color, background: tones.bg, borderRadius: 99, padding: '4px 10px', whiteSpace: 'nowrap' }}>{pill}</span>}
    </div>
  );
}

function readNourishToday() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const foods = JSON.parse(localStorage.getItem('bloom-nourish-foods') || '{}')[today] || [];
    const all = JSON.parse(localStorage.getItem('bloom-nourish') || '{}');
    const day = all[today] || {};
    const logged = foods.length > 0 || (day.categories || []).length > 0;
    // processed streak across today + yesterday (same rule as TabNourish)
    const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const flat = [];
    for (const d of [today, y]) for (const slot of ['dinner', 'lunch', 'breakfast']) {
      const q = (all[d] || {}).meals?.[slot];
      if (q && q !== 'skipped') flat.push(q);
    }
    let streak = 0;
    for (const q of flat) { if (q === 'processed') streak++; else break; }
    return { logged, streak, dipToday: !!day.redDecayTriggered };
  } catch { return { logged: false, streak: 0, dipToday: false }; }
}

export default function HealthBreakdownModal({
  health, cap, pillars, habitsDone, habitsTotal, remainingHabitNames = [],
  badSlips = [], overnightApplied, isRestDay, onClose, onLogStats, onLogSleep, onGoNourish, onGoHabits,
}) {
  const nourish = readNourishToday();
  // Overnight dip — read straight from the store so it shows the real amount
  const lastDecayDate = useStore((s) => s.lastDecayDate);
  const lastDecayAmount = useStore((s) => s.lastDecayAmount);
  const lastDecayDetail = useStore((s) => s.lastDecayDetail);
  const ranToday = lastDecayDate === new Date().toISOString().split('T')[0];
  const dip = ranToday ? (lastDecayAmount ?? (overnightApplied ? 5 : 0)) : 0;
  const dipDetail = lastDecayDetail || 'Health eases back a little each night so it reflects recent days';
  const pillarsMet = pillars.filter((p) => p.met);
  const pillarsOpen = pillars.filter((p) => !p.met);
  const habitsLeft = Math.max(0, habitsTotal - habitsDone);

  // ── Best next move ──
  let best = null;
  const gapOrder = { movement: 0, water: 1, mindfulness: 2, sleep: 3 };
  const nextPillar = [...pillarsOpen].sort((a, b) => gapOrder[a.key] - gapOrder[b.key])[0];
  if (nextPillar) {
    const lifts = pillarsOpen.length === 1 ? `Lifts your ceiling from ${cap} to ${nourish.logged ? 100 : 95}` : `${pillarsOpen.length - 1} more pillar${pillarsOpen.length > 2 ? 's' : ''} after this unlocks 100`;
    const title = nextPillar.key === 'movement' ? `A ${Math.max(5, Math.ceil(nextPillar.remaining))}-minute walk`
      : nextPillar.key === 'water' ? `${Math.max(0.25, Math.ceil(nextPillar.remaining * 4) / 4)} L more water`
      : nextPillar.key === 'mindfulness' ? `${Math.max(5, Math.ceil(nextPillar.remaining))} minutes of mindfulness`
      : 'Log last night’s sleep';
    best = { title, sub: lifts, action: nextPillar.key === 'sleep' ? onLogSleep : onLogStats, cta: 'Log it' };
  } else if (!nourish.logged) {
    best = { title: 'Log a meal in Nourish', sub: `Lifts your ceiling from ${cap} to 100`, action: onGoNourish, cta: 'Open' };
  } else if (habitsLeft > 0) {
    best = { title: remainingHabitNames[0] ? `Do “${remainingHabitNames[0]}”` : 'Tick off a habit', sub: `+3 health each · ${habitsLeft} left today`, action: onGoHabits, cta: 'Go' };
  }

  const mood = health > 70 ? 'Thriving' : health > 40 ? 'Building momentum' : 'Needs care';
  const circ = 2 * Math.PI * 48;
  const angle = (cap / 100) * 2 * Math.PI;
  const mx = (r) => 56 + r * Math.sin(angle), my = (r) => 56 - r * Math.cos(angle);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 220 }}>
      <div role="dialog" aria-modal="true" aria-label="Health breakdown" onClick={(e) => e.stopPropagation()}
        style={{ background: '#f7f3ed', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', borderRadius: '24px 24px 0 0', padding: '18px 18px 28px', fontFamily: FONT, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 24 }}>Your health today</div>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'white', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        {/* Ring */}
        <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 18, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
            <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#efebe4" strokeWidth="10" />
              <circle cx="56" cy="56" r="48" fill="none" stroke="#5a7a5a" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(Math.min(health, 100) / 100) * circ} ${circ}`} transform="rotate(-90 56 56)" />
              {cap < 100 && <line x1={mx(42)} y1={my(42)} x2={mx(54)} y2={my(54)} stroke="#a4532e" strokeWidth="3" strokeLinecap="round" />}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 36, lineHeight: 1 }}>{health}</div>
              <div style={{ fontSize: 11, color: '#6b6860' }}>health</div>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, lineHeight: 1.15 }}>{mood}</div>
            <div style={{ fontSize: 13, color: '#4a4a42', lineHeight: 1.5, marginTop: 4 }}>
              {cap >= 100 ? 'Your ceiling today is 100% — everything is unlocked.' : <>Today’s ceiling is <strong style={{ color: '#a4532e' }}>{cap}%</strong>{pillarsOpen.length ? ` until ${pillarsOpen.map((p) => p.label.toLowerCase()).join(', ')} ${pillarsOpen.length > 1 ? 'are' : 'is'} done` : ''}{!nourish.logged ? `${pillarsOpen.length ? ' and' : ' until'} a meal is logged` : ''}.</>}
            </div>
          </div>
        </div>

        {/* Lifting */}
        <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '14px 18px 4px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#3f5f3f' }}>Lifting you</div>
          {pillarsMet.map((p) => <Row key={p.key} tone="good" title={p.label} detail={`${p.valueText} · goal ${p.goalText}`} pill={p.reward ? `+${p.reward}` : 'pillar met'} />)}
          {habitsDone > 0 && <Row tone="good" title="Habits" detail={`${habitsDone} of ${habitsTotal} done today`} pill={`+${habitsDone * 3}`} />}
          {nourish.logged && <Row tone="good" title="Meal logged" detail="Keeps the top 5% unlocked" pill="unlocked" />}
          {isRestDay && <Row tone="good" title="Rest day" detail="No overnight dip today" pill="protected" />}
          {!isRestDay && ranToday && dip === 0 && lastDecayAmount === 0 && <Row tone="good" title="Yesterday was complete" detail="All 4 pillars and a meal logged — no overnight dip" pill="no dip" />}
          {!pillarsMet.length && !habitsDone && !nourish.logged && !isRestDay && !(ranToday && lastDecayAmount === 0) && <div style={{ fontSize: 12.5, color: '#999', padding: '10px 0 12px' }}>Nothing yet today — every small thing counts.</div>}
        </div>

        {/* Holding back */}
        <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '14px 18px 4px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#a4532e' }}>Holding you back</div>
          {pillarsOpen.map((p) => (
            <Row key={p.key} tone="bad" title={p.label} detail={p.key === 'sleep' ? 'Not logged yet' : `${p.valueText} of ${p.goalText}`}
              progress={p.key === 'sleep' ? null : p.progress} pill="caps at 90" />
          ))}
          {!nourish.logged && <Row tone="bad" title="No meal logged" detail="Takes 5% off today’s ceiling" pill="−5 ceiling" />}
          {habitsLeft > 0 && <Row tone="warn" title={`${habitsLeft} habit${habitsLeft > 1 ? 's' : ''} left`} detail={remainingHabitNames.slice(0, 3).join(' · ') || null} pill={`+${habitsLeft * 3} possible`} />}
          {badSlips.map((b) => <Row key={b.name} tone="bad" title={b.name} detail="Logged honestly today" pill={`−${b.penalty}`} />)}
          {nourish.dipToday && <Row tone="bad" title="3 processed meals in a row" detail="Small dip applied today" pill="−3" />}
          {!nourish.dipToday && nourish.streak === 2 && <Row tone="warn" title="Processed meals" detail="2 in a row — a 3rd costs 3" pill="watch" />}
          {dip > 0 && <Row tone="warn" title="Overnight dip" detail={`${dipDetail}. Log all 4 pillars and a meal today for no dip tomorrow.`} pill={`−${dip}`} />}
          {!pillarsOpen.length && nourish.logged && !habitsLeft && !badSlips.length && !dip && <div style={{ fontSize: 12.5, color: '#999', padding: '10px 0 12px' }}>Nothing — you’ve done everything for today 🌿</div>}
        </div>

        {best ? (
          <div style={{ background: '#3f5f3f', borderRadius: 20, padding: 18, display: 'flex', alignItems: 'center', gap: 14, color: 'white' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#cfe2cf', marginBottom: 4 }}>Best next move</div>
              <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 21, lineHeight: 1.2 }}>{best.title}</div>
              <div style={{ fontSize: 12.5, color: '#e4efe4', marginTop: 2 }}>{best.sub}</div>
            </div>
            {best.action && (
              <button onClick={() => { onClose(); best.action(); }}
                style={{ border: 'none', background: 'white', color: '#3f5f3f', fontFamily: FONT, fontSize: 13, fontWeight: 700, borderRadius: 99, padding: '0 16px', height: 44, cursor: 'pointer' }}>{best.cta}</button>
            )}
          </div>
        ) : (
          <div style={{ background: '#eaf3ea', borderRadius: 20, padding: 16, fontSize: 13, color: '#3f5f3f', textAlign: 'center' }}>You’re at your ceiling for today — enjoy it 🌿</div>
        )}

        <p style={{ fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 1.5, margin: '14px 0 0' }}>
          Health carries over from day to day, so today’s changes won’t add up exactly to your score.
        </p>
      </div>
    </div>
  );
}
