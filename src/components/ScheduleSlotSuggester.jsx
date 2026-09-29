'use client';

// Pick a habit or routine → pick a duration + time (with chronotype-based suggestions
// that avoid your calendar) → add it to your day (+ Google Calendar if connected).

import { useState, useMemo } from 'react';
import { addSchedule, updateSchedule, timeToMinutes, minutesToTime, formatTime12, localDateStr } from '../lib/scheduleStorage';
import { findFreeSlots, createCalendarEvent } from '../lib/calendarIntegration';

const CATEGORY_DEFAULT_MIN = { movement: 30, nutrition: 20, mindfulness: 10, sleep: 15, wellness: 10 };
const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90];

// "Outdoor walk (20 min)" → 20
function durationFromName(name = '') {
  const m = String(name).match(/(\d+)\s*-?\s*min/i);
  return m ? Number(m[1]) : null;
}

// Habits come in different shapes (program habits: name/emoji, custom: label/icon, goals: id) — normalise them.
function normaliseHabit(h) {
  if (!h) return null;
  const key = h.key || h.linked_habit_key || h.id;
  const name = h.label || h.name;
  if (!key || !name) return null;
  const parsed = durationFromName(name) || Number(h.duration) || null;
  const planTime = typeof h.time === 'string' && /^\d{1,2}:\d{2}$/.test(h.time) ? h.time.padStart(5, '0') : '';
  return {
    key: String(key),
    name,
    icon: h.icon || h.emoji || '🌿',
    duration: parsed || CATEGORY_DEFAULT_MIN[h.category] || 15,
    planTime,
    kind: 'habit',
    color: '#8aad8a',
  };
}

function normaliseRoutine(r) {
  if (!r || !r.key) return null;
  const duration = Number(r.duration) || (r.steps || []).reduce((a, s) => a + (Number(s.duration) || 0), 0) || 30;
  return { key: `routine_${r.key}`, name: r.label || r.name, icon: r.icon || '⏱', duration, planTime: '', kind: 'routine', color: r.color || '#8a7a9e' };
}

export default function ScheduleSlotSuggester({
  date,
  habits = [],
  routines = [],
  userId,
  chronotype = 'bear',
  calendarEvents = [],
  existingBlocks = [],
  calendarConnected = false,
  onScheduled,
  onClose,
}) {
  const habitItems = useMemo(() => {
    const seen = new Set();
    return (habits || []).map(normaliseHabit).filter((h) => h && !seen.has(h.key) && seen.add(h.key));
  }, [habits]);
  const routineItems = useMemo(() => (routines || []).map(normaliseRoutine).filter(Boolean), [routines]);

  const [section, setSection] = useState(habitItems.length ? 'habits' : 'routines');
  const [selected, setSelected] = useState(null);
  const [duration, setDuration] = useState(15);
  const [time, setTime] = useState('');
  const [addToGoogle, setAddToGoogle] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);

  const isToday = date === localDateStr();
  const list = section === 'habits' ? habitItems : routineItems;

  const scheduledByKey = useMemo(() => {
    const map = {};
    existingBlocks.forEach((b) => { (map[b.itemKey] = map[b.itemKey] || []).push(b.time); });
    return map;
  }, [existingBlocks]);

  // Suggested free slots for the chosen duration
  const suggestions = useMemo(() => {
    if (!selected) return [];
    const bloomBusy = existingBlocks
      .filter((b) => timeToMinutes(b.time) != null)
      .map((b) => ({ start: b.time, end: minutesToTime(timeToMinutes(b.time) + (Number(b.duration) || 30)) }));
    let slots = findFreeSlots(date, calendarEvents, chronotype, duration, bloomBusy);
    // Chronotype windows all used up / already past → any free time left in the day
    if (slots.length === 0) slots = findFreeSlots(date, calendarEvents, 'anytime', duration, bloomBusy);
    // Spread suggestions out: keep slots at least 45 min apart, best-ranked first
    const picked = [];
    for (const s of slots) {
      const m = timeToMinutes(s.start);
      if (picked.every((p) => Math.abs(timeToMinutes(p.start) - m) >= 45)) picked.push(s);
      if (picked.length >= 6) break;
    }
    return picked.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }, [selected, duration, date, calendarEvents, chronotype, existingBlocks]);

  function pick(item) {
    setSelected(item);
    setDuration(item.duration);
    setLastAdded(null);
    // Default time: the program's planned time if still ahead, else first free suggestion (filled in below)
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const planOk = item.planTime && (!isToday || timeToMinutes(item.planTime) > nowMins);
    setTime(planOk ? item.planTime : '');
  }

  // Fallback default: next quarter hour (today) or 9am (another day)
  const fallbackTime = (() => {
    let t = 9 * 60;
    if (isToday) {
      const n = new Date();
      t = Math.ceil((n.getHours() * 60 + n.getMinutes() + 5) / 15) * 15;
    }
    // Step past anything already planned so blocks don't stack on top of each other
    for (let guard = 0; guard < 50; guard++) {
      const clash = existingBlocks.find((b) => {
        const s = timeToMinutes(b.time);
        return s != null && t < s + (Number(b.duration) || 30) && t + duration > s;
      });
      if (!clash) break;
      t = timeToMinutes(clash.time) + (Number(clash.duration) || 30);
    }
    return minutesToTime(Math.min(t, 23 * 60 + 45));
  })();
  const effectiveTime = time || suggestions[0]?.start || fallbackTime;

  async function handleSchedule() {
    if (!selected || !effectiveTime) return;
    setSaving(true);

    const item = addSchedule({
      date,
      itemKey: selected.key,
      name: selected.name,
      icon: selected.icon,
      time: effectiveTime,
      duration,
      kind: selected.kind,
      color: selected.color,
    });

    let google = { attempted: false, ok: false, needsReconnect: false };
    if (calendarConnected && addToGoogle && userId) {
      google.attempted = true;
      const res = await createCalendarEvent(userId, `${selected.icon} ${selected.name}`, date, effectiveTime, duration);
      if (res.eventId) {
        updateSchedule(item.id, { googleEventId: res.eventId });
        item.googleEventId = res.eventId;
        google.ok = true;
      } else {
        google.needsReconnect = !!res.needsReconnect;
        google.error = res.error;
      }
    }

    setSaving(false);
    setLastAdded({ ...item, google });
    setSelected(null);
    setTime('');
    if (onScheduled) onScheduled(item, google);
  }

  const chip = (active) => ({
    padding: '7px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', border: `1.5px solid ${active ? '#5a7a5a' : '#e8e4de'}`,
    background: active ? '#5a7a5a' : 'white', color: active ? 'white' : '#555', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {habitItems.length > 0 && (
            <button onClick={() => { setSection('habits'); setSelected(null); }} style={chip(section === 'habits')}>✅ Habits</button>
          )}
          {routineItems.length > 0 && (
            <button onClick={() => { setSection('routines'); setSelected(null); }} style={chip(section === 'routines')}>⏱ Routines</button>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Done
          </button>
        )}
      </div>

      {/* Confirmation of the last thing added */}
      {lastAdded && (
        <div style={{ background: '#f0f7f0', border: '1px solid #b5ceb5', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#3a6a3a', lineHeight: 1.5 }}>
          ✓ <strong>{lastAdded.icon} {lastAdded.name}</strong> added at {formatTime12(lastAdded.time)} ({lastAdded.duration} min)
          {lastAdded.google.ok && ' · added to Google Calendar 📅'}
          {lastAdded.google.attempted && !lastAdded.google.ok && (
            <div style={{ color: '#a07030', marginTop: 2 }}>
              {lastAdded.google.needsReconnect
                ? 'Saved in Bloom, but Google Calendar needs permission — use “Reconnect” above.'
                : 'Saved in Bloom, but Google Calendar didn’t accept it. It will still show here.'}
            </div>
          )}
          <div style={{ color: '#6a8a6a', marginTop: 2 }}>Add another, or tap Done.</div>
        </div>
      )}

      {/* Item list */}
      {list.length === 0 ? (
        <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: 12 }}>Nothing here yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
          {list.map((item) => {
            const active = selected?.key === item.key;
            const already = scheduledByKey[item.key];
            return (
              <button key={item.key} onClick={() => pick(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', padding: '10px 12px', borderRadius: 12,
                  border: `1.5px solid ${active ? item.color : '#e8e4de'}`, background: active ? `${item.color}22` : '#fdfcfa',
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: '#2a2a2a',
                }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{item.name}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: already ? '#5a7a5a' : '#aaa', marginTop: 2 }}>
                    {already ? `✓ planned ${already.map(formatTime12).join(', ')}` : `${item.duration} min`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Time + duration picker */}
      {selected && (
        <div style={{ borderTop: '1px solid #f0ece6', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2a2a2a' }}>{selected.icon} {selected.name}</div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>How long</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from(new Set([...DURATION_OPTIONS, selected.duration])).sort((a, b) => a - b).map((d) => (
                <button key={d} onClick={() => setDuration(d)} style={chip(duration === d)}>{d} min</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>
              When {calendarEvents.length ? '· free times that suit your chronotype' : '· times that suit your chronotype'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {selected.planTime && (
                <button onClick={() => setTime(selected.planTime)} style={chip(effectiveTime === selected.planTime)}>
                  📋 Plan: {formatTime12(selected.planTime)}
                </button>
              )}
              {suggestions.map((s) => (
                <button key={s.start} onClick={() => setTime(s.start)} style={chip(effectiveTime === s.start)}>
                  {s.preference === 'best' ? '⭐ ' : ''}{formatTime12(s.start)}
                </button>
              ))}
              {suggestions.length === 0 && !selected.planTime && (
                <span style={{ fontSize: 12, color: '#aaa' }}>No free suggestions left today — pick a time below.</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#888' }}>or exact time</span>
              <input type="time" value={effectiveTime} onChange={(e) => setTime(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e8e4de', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }} />
            </div>
          </div>

          {calendarConnected && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#555', cursor: 'pointer' }}>
              <input type="checkbox" checked={addToGoogle} onChange={(e) => setAddToGoogle(e.target.checked)} />
              Also add to Google Calendar
            </label>
          )}

          <button onClick={handleSchedule} disabled={saving || !effectiveTime}
            style={{
              padding: '11px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              background: saving || !effectiveTime ? '#c8d8c8' : '#5a7a5a', color: 'white', cursor: saving || !effectiveTime ? 'default' : 'pointer',
            }}>
            {saving ? 'Adding…' : effectiveTime ? `Add to my day at ${formatTime12(effectiveTime)} →` : 'Pick a time'}
          </button>
        </div>
      )}
    </div>
  );
}
