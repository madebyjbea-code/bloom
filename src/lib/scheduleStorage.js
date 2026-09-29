// src/lib/scheduleStorage.js
// Bloom's day plan, stored in the browser (localStorage).
// No Supabase / RLS involved, so scheduling works instantly.
// Google Calendar (when connected) is the cross-device copy.

const KEY = 'bloom_schedules';

// ── Date + time helpers (always LOCAL time, never UTC) ──────────────────────
const pad = (n) => String(n).padStart(2, '0');

export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeToMinutes(t) {
  if (!t || typeof t !== 'string' || !t.includes(':')) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function formatTime12(t) {
  const mins = timeToMinutes(t);
  if (mins == null) return t || '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${pad(m)}${suffix}` : `${h12}${suffix}`;
}

// ── Storage ─────────────────────────────────────────────────────────────────
function readAll() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    // Normalise items saved by the older version of this file
    return raw.map((s) => ({
      id: s.id,
      date: s.date,
      itemKey: s.itemKey || s.habitKey,
      name: s.name || s.habitName || 'Wellness block',
      icon: s.icon || '🌿',
      time: s.time,
      duration: Number(s.duration) || 30,
      kind: s.kind || 'habit',
      color: s.color || null,
      completed: !!s.completed,
      googleEventId: s.googleEventId || null,
      createdAt: s.createdAt,
    }));
  } catch {
    return [];
  }
}

function writeAll(list) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function getSchedulesForDate(dateStr) {
  return readAll()
    .filter((s) => s.date === dateStr)
    .sort((a, b) => (timeToMinutes(a.time) ?? 0) - (timeToMinutes(b.time) ?? 0));
}

export function addSchedule({ date, itemKey, name, icon, time, duration, kind = 'habit', color = null }) {
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date,
    itemKey,
    name,
    icon: icon || '🌿',
    time,
    duration: Number(duration) || 30,
    kind,
    color,
    completed: false,
    googleEventId: null,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(item);
  writeAll(all);
  return item;
}

export function updateSchedule(id, patch) {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  writeAll(all);
  return all[idx];
}

export function removeSchedule(id) {
  const all = readAll();
  const removed = all.find((s) => s.id === id) || null;
  writeAll(all.filter((s) => s.id !== id));
  return removed;
}

export function toggleScheduleComplete(id) {
  const all = readAll();
  const item = all.find((s) => s.id === id);
  if (!item) return null;
  item.completed = !item.completed;
  writeAll(all);
  return item;
}
