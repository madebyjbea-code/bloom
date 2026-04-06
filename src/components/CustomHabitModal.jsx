'use client';

import { useState } from 'react';
import { useStore } from '../lib/store';

const EMOJIS = [
  '🏃','🚶','🧘','🏋️','🤸','🚴','🏊','⛹️',
  '🥗','🥦','🥚','🍎','🫐','🥑','🍵','💧',
  '😴','📖','✍️','🎨','🎵','🌿','🌱','☀️',
  '🧠','💊','🫁','❤️','🌸','🔬','📝','⏰',
];

const CATEGORIES = [
  { key: 'movement',    label: '🏃 Movement' },
  { key: 'nutrition',   label: '🥗 Nutrition' },
  { key: 'sleep',       label: '😴 Sleep' },
  { key: 'mindfulness', label: '🧘 Mindfulness' },
  { key: 'wellness',    label: '🌿 Wellness' },
];

const GUIDE_SUGGESTIONS = [
  { name: 'Morning sunlight (10 min)', emoji: '☀️', category: 'wellness',    coins: 20, ge: 5  },
  { name: 'Protein breakfast',         emoji: '🥚', category: 'nutrition',   coins: 25, ge: 0  },
  { name: 'Walk after meals',          emoji: '🚶', category: 'movement',    coins: 20, ge: 8  },
  { name: 'No screens before bed',     emoji: '📵', category: 'sleep',       coins: 20, ge: 0  },
  { name: 'Breathwork (5 min)',         emoji: '🫁', category: 'mindfulness', coins: 15, ge: 0  },
  { name: 'Journalling',               emoji: '✍️', category: 'mindfulness', coins: 15, ge: 0  },
  { name: 'Cold shower',               emoji: '🚿', category: 'wellness',    coins: 20, ge: 0  },
  { name: 'Plant-based meal',          emoji: '🌱', category: 'nutrition',   coins: 20, ge: 20 },
  { name: 'Gratitude log',             emoji: '🌸', category: 'mindfulness', coins: 15, ge: 0  },
  { name: 'Stretch (10 min)',           emoji: '🤸', category: 'movement',    coins: 15, ge: 0  },
  { name: 'Read (20 min)',             emoji: '📖', category: 'mindfulness', coins: 15, ge: 0  },
  { name: 'Hydration goal (2L)',       emoji: '💧', category: 'wellness',    coins: 15, ge: 5  },
];

export default function CustomHabitModal({ onClose }) {
  const [tab, setTab]             = useState('suggest');
  const [habitName, setHabitName] = useState('');
  const [selectedEmoji, setEmoji] = useState('🌿');
  const [category, setCategory]   = useState('wellness'); // ← was missing
  const [coins, setCoins]         = useState(20);
  const [time, setTime]           = useState('');
  const [added, setAdded]         = useState([]);

  const addCustomHabit = useStore(s => s.addCustomHabit);
  const customHabits   = useStore(s => s.customHabits);

  function addSuggestion(s) {
    const key = `custom_${s.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    addCustomHabit({
      key,
      name: s.name,
      emoji: s.emoji,
      category: s.category,
      coins: s.coins,
      ge: s.ge,
      time: '',
      isQuit: false,
      isCustom: true,
    });
    setAdded(prev => [...prev, key]);
  }

  function addCustom() {
    if (!habitName.trim()) return;
    const key = `custom_${habitName.trim().toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    addCustomHabit({
      key,
      name: habitName.trim(),
      emoji: selectedEmoji,
      category: category,
      coins,
      ge: category === 'nutrition' ? 10 : 0,
      time,
      isQuit: false,
      isCustom: true,
    });
    setHabitName('');
    setTime('');
    setAdded(prev => [...prev, key]);
  }

  // ← removed TypeScript type annotation (name: string) — this is a .jsx file
  const alreadyAdded = (name) => customHabits.some(h => h.name === name);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 24, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: '#1a1a1a', marginBottom: 3 }}>
              Add a Habit
            </h2>
            <p style={{ fontSize: 12, color: '#888' }}>
              From your Spring guide, or build your own
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: 16 }}
          >✕</button>
        </div>

        <div style={{ display: 'flex', background: '#f7f3ed', border: '1.5px solid #e8e4de', borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {[['suggest','📋 From Spring Guide'],['custom','✏️ Build my own']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', background: tab === key ? '#8aad8a' : 'transparent', color: tab === key ? 'white' : '#888', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'suggest' && (
          <div>
            <div style={{ background: '#f3f8f3', border: '1px solid #b5ceb5', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#5a7a5a', lineHeight: 1.6 }}>
              🌿 These habits are taken directly from the <strong>BLOOM Spring Guide Week 1</strong>. Add the ones that match your archetype program and track them here.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {GUIDE_SUGGESTIONS.map(s => {
                const already = alreadyAdded(s.name);
                return (
                  <div
                    key={s.name}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1.5px solid ${already ? '#8aad8a' : '#e8e4de'}`, borderRadius: 13, background: already ? '#f3f8f3' : 'white', transition: 'all 0.2s' }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{s.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#2a2a2a' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        {CATEGORIES.find(c => c.key === s.category)?.label} · +{s.coins} 🪙{s.ge > 0 ? ` · +${s.ge} ⚡` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => !already && addSuggestion(s)}
                      style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: already ? '#e8e4de' : '#8aad8a', color: already ? '#aaa' : 'white', fontSize: 12, fontWeight: 600, cursor: already ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                    >
                      {already ? '✓ Added' : '+ Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                Habit Name
              </label>
              <input
                type="text"
                value={habitName}
                onChange={e => setHabitName(e.target.value)}
                placeholder="e.g. Cold shower, Read 20 min..."
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#8aad8a'}
                onBlur={e => e.target.style.borderColor = '#e8e4de'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                Icon — selected: {selectedEmoji}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    style={{ width: 36, height: 36, borderRadius: 9, border: `2px solid ${selectedEmoji === e ? '#8aad8a' : '#e8e4de'}`, background: selectedEmoji === e ? '#f3f8f3' : 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                Category
              </label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    style={{ padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${category === c.key ? '#8aad8a' : '#e8e4de'}`, background: category === c.key ? '#f3f8f3' : 'white', color: category === c.key ? '#5a7a5a' : '#888', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                  Coin Reward 🪙
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[10, 15, 20, 25, 30].map(n => (
                    <button
                      key={n}
                      onClick={() => setCoins(n)}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${coins === n ? '#d4af6a' : '#e8e4de'}`, background: coins === n ? '#fdf8ed' : 'white', color: coins === n ? '#a07020' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 7 }}>
                  Reminder Time (optional)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#8aad8a'}
                  onBlur={e => e.target.style.borderColor = '#e8e4de'}
                />
              </div>
            </div>

            <button
              onClick={addCustom}
              disabled={!habitName.trim()}
              style={{ width: '100%', padding: 13, background: habitName.trim() ? '#8aad8a' : '#e8e4de', color: habitName.trim() ? 'white' : '#aaa', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: habitName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
            >
              Add habit →
            </button>

            {customHabits.length > 0 && (
              <div style={{ borderTop: '1px solid #f0ece6', paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', marginBottom: 10 }}>
                  Your custom habits ({customHabits.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {customHabits.map(h => (
                    <div key={h.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#f7f3ed', borderRadius: 10, border: '1px solid #e8e4de' }}>
                      <span style={{ fontSize: 18 }}>{h.emoji}</span>
                      <span style={{ flex: 1, fontSize: 13 }}>{h.name}</span>
                      <button
                        onClick={() => useStore.getState().removeCustomHabit(h.key)}
                        style={{ fontSize: 11, color: '#e07070', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: '4px 8px' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
