'use client';

import { useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

const BAD_EMOJIS = [
  '🚭','🍷','📱','🍔','🍩','🍫','☕','🥤',
  '🛋️','🎰','💸','😤','🌙','🍕','🚬','📺',
];

const BAD_SUGGESTIONS = [
  { name: 'Smoking',           emoji: '🚭', type: 'binary',       penalty: 8 },
  { name: 'Alcohol',           emoji: '🍷', type: 'quantitative', unit: 'drinks',  threshold: 0,   penalty: 5 },
  { name: 'Screen time',       emoji: '📱', type: 'quantitative', unit: 'hours',   threshold: 3,   penalty: 5 },
  { name: 'Junk food',         emoji: '🍔', type: 'binary',       penalty: 4 },
  { name: 'Sugar',             emoji: '🍩', type: 'quantitative', unit: 'servings',threshold: 1,   penalty: 4 },
  { name: 'Caffeine after 2pm',emoji: '☕', type: 'binary',       penalty: 3 },
  { name: 'Doomscrolling',     emoji: '📺', type: 'quantitative', unit: 'hours',   threshold: 1,   penalty: 4 },
  { name: 'Late-night snack',  emoji: '🌙', type: 'binary',       penalty: 4 },
];

export default function BadHabitModal({ onClose }) {
  const [tab, setTab]           = useState('suggest');
  const [name, setName]         = useState('');
  const [emoji, setEmoji]       = useState('🚫');
  const [type, setType]         = useState('binary');
  const [unit, setUnit]         = useState('hours');
  const [threshold, setThreshold] = useState(0);
  const [penalty, setPenalty]   = useState(5);
  const [added, setAdded]       = useState([]);

  const userId      = useStore(s => s.userId);
  const badHabits   = useStore(s => s.badHabits);
  const addBadHabit = useStore(s => s.addBadHabit);
  const removeBadHabit = useStore(s => s.removeBadHabit);

  async function persist(bh) {
    if (!userId) return;
    try {
      await supabase.from('bad_habits').upsert(
        {
          user_id: userId,
          key: bh.key,
          name: bh.name,
          emoji: bh.emoji,
          type: bh.type,
          unit: bh.unit || null,
          threshold: bh.threshold ?? null,
          health_penalty: bh.healthPenalty,
        },
        { onConflict: 'user_id,key' }
      );
    } catch (e) { console.error('persist bad_habit', e); }
  }

  async function addSuggestion(s) {
    const key = `bad_${s.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const bh = {
      key,
      name: s.name,
      emoji: s.emoji,
      type: s.type,
      unit: s.unit,
      threshold: s.threshold,
      healthPenalty: s.penalty,
    };
    addBadHabit(bh);
    await persist(bh);
    setAdded(prev => [...prev, key]);
  }

  async function addCustom() {
    if (!name.trim()) return;
    const key = `bad_${name.trim().toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const bh = {
      key,
      name: name.trim(),
      emoji,
      type,
      unit: type === 'quantitative' ? unit : undefined,
      threshold: type === 'quantitative' ? Number(threshold) : undefined,
      healthPenalty: Number(penalty),
    };
    addBadHabit(bh);
    await persist(bh);
    setName('');
    setAdded(prev => [...prev, key]);
  }

  async function removeOne(key) {
    removeBadHabit(key);
    if (userId) {
      try { await supabase.from('bad_habits').delete().eq('user_id', userId).eq('key', key); }
      catch (e) { console.error(e); }
    }
  }

  const alreadyAdded = (n) => badHabits.some(h => h.name === n);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 24, padding: 28, width: 540, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: '#1a1a1a', marginBottom: 3 }}>
              Habits to stop
            </h2>
            <p style={{ fontSize: 12, color: '#888' }}>
              Track what you&apos;re reducing — costs health when you slip
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: 16 }}
          >✕</button>
        </div>

        <div style={{ background: '#fdf1ec', border: '1px solid #f0c4a8', borderRadius: 12, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#a05030', lineHeight: 1.6 }}>
          ⚠️ Bad habits work in reverse — logging a slip costs health, not coins. Be honest; the system rewards self-awareness over perfection.
        </div>

        <div style={{ display: 'flex', background: '#f7f3ed', border: '1.5px solid #e8e4de', borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {[['suggest','📋 Common ones'],['custom','✏️ Build my own']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', background: tab === key ? '#e07070' : 'transparent', color: tab === key ? 'white' : '#888', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'suggest' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {BAD_SUGGESTIONS.map(s => {
              const already = alreadyAdded(s.name);
              return (
                <div key={s.name}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1.5px solid ${already ? '#e07070' : '#e8e4de'}`, borderRadius: 13, background: already ? '#fdf1ec' : 'white' }}
                >
                  <span style={{ fontSize: 22 }}>{s.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#2a2a2a' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {s.type === 'binary' ? 'Yes / no' : `Track ${s.unit} · fail above ${s.threshold}`} · −{s.penalty} ❤️ if slipped
                    </div>
                  </div>
                  <button onClick={() => !already && addSuggestion(s)}
                    style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: already ? '#e8e4de' : '#e07070', color: already ? '#aaa' : 'white', fontSize: 12, fontWeight: 600, cursor: already ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}
                  >
                    {already ? '✓ Added' : '+ Track'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                What do you want to stop?
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Energy drinks, Late-night Instagram..."
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                Icon — selected: {emoji}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {BAD_EMOJIS.map(e => (
                  <button key={e} onClick={() => setEmoji(e)}
                    style={{ width: 36, height: 36, borderRadius: 9, border: `2px solid ${emoji === e ? '#e07070' : '#e8e4de'}`, background: emoji === e ? '#fdf1ec' : 'white', fontSize: 18, cursor: 'pointer' }}
                  >{e}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                Tracking type
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setType('binary')}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${type === 'binary' ? '#e07070' : '#e8e4de'}`, background: type === 'binary' ? '#fdf1ec' : 'white', color: type === 'binary' ? '#a05030' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  ✓ Yes / No
                  <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>e.g. Did you smoke?</div>
                </button>
                <button onClick={() => setType('quantitative')}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${type === 'quantitative' ? '#e07070' : '#e8e4de'}`, background: type === 'quantitative' ? '#fdf1ec' : 'white', color: type === 'quantitative' ? '#a05030' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  📊 Track amount
                  <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>e.g. {'<'} 3 hours screen</div>
                </button>
              </div>
            </div>

            {type === 'quantitative' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                    Unit
                  </label>
                  <input type="text" value={unit} onChange={e => setUnit(e.target.value)}
                    placeholder="hours, drinks, cigarettes..."
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e8e4de', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                    Fail above
                  </label>
                  <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} min="0" step="0.5"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e8e4de', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                Health penalty if slipped ❤️
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[3, 5, 7, 10].map(n => (
                  <button key={n} onClick={() => setPenalty(n)}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${penalty === n ? '#e07070' : '#e8e4de'}`, background: penalty === n ? '#fdf1ec' : 'white', color: penalty === n ? '#a05030' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >−{n}</button>
                ))}
              </div>
            </div>

            <button onClick={addCustom} disabled={!name.trim()}
              style={{ width: '100%', padding: 13, background: name.trim() ? '#e07070' : '#e8e4de', color: name.trim() ? 'white' : '#aaa', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif' }}
            >
              Track this →
            </button>
          </div>
        )}

        {badHabits.length > 0 && (
          <div style={{ borderTop: '1px solid #f0ece6', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', marginBottom: 10 }}>
              Currently tracking ({badHabits.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {badHabits.map(h => (
                <div key={h.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#fdf1ec', borderRadius: 10, border: '1px solid #f0c4a8' }}>
                  <span style={{ fontSize: 18 }}>{h.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{h.name}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>
                      {h.type === 'binary' ? 'Yes / no' : `${h.unit} · fail above ${h.threshold}`} · −{h.healthPenalty} ❤️
                    </div>
                  </div>
                  <button onClick={() => removeOne(h.key)}
                    style={{ fontSize: 11, color: '#e07070', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: '4px 8px' }}
                  >Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
