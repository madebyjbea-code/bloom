'use client';

// One day, Structured-style: your calendar + Bloom blocks on a timeline,
// with an "Add to day" picker. Used on Home (today) and in the Planner (any date).

import { useState, useEffect, useCallback } from 'react';
import DayTimeline from './DayTimeline';
import ScheduleSlotSuggester from './ScheduleSlotSuggester';
import {
  getSchedulesForDate, removeSchedule, toggleScheduleComplete, localDateStr, formatTime12,
} from '../lib/scheduleStorage';
import { getCalendarConfig, getCalendarEvents, deleteCalendarEvent, getGoogleAuthUrl } from '../lib/calendarIntegration';

// Survives the parent re-mounting this component (Dashboard's tabs re-create
// their children on every state change), so the picker doesn't snap shut.
const uiState = { open: {} };
const eventsCache = {}; // `${userId}|${date}` -> { ts, status, events }
const CACHE_MS = 5 * 60 * 1000;

function showToast(msg) {
  const el = typeof document !== 'undefined' && document.getElementById('bloom-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

async function loadEvents(userId, date, force = false) {
  const cacheKey = `${userId}|${date}`;
  const hit = eventsCache[cacheKey];
  if (!force && hit && Date.now() - hit.ts < CACHE_MS) return hit;

  let result = { ts: Date.now(), status: 'not_connected', events: [] };
  try {
    const config = await getCalendarConfig(userId);
    if (config?.connected) {
      // Fetch the day either side and filter locally — avoids UTC/local edge cases
      const raw = await getCalendarEvents(userId, shiftDate(date, -1), shiftDate(date, 1));
      if (raw === null) {
        result = { ts: Date.now(), status: 'error', events: [] };
      } else {
        const dayStart = new Date(`${date}T00:00:00`).getTime();
        const dayEnd = dayStart + 86400000;
        const events = raw.filter((e) => {
          if (e.allDay) return String(e.start).slice(0, 10) <= date && String(e.end).slice(0, 10) > date;
          const s = new Date(e.start).getTime();
          const en = new Date(e.end).getTime();
          return en > dayStart && s < dayEnd;
        });
        result = { ts: Date.now(), status: 'connected', events };
      }
    }
  } catch {
    result = { ts: Date.now(), status: 'error', events: [] };
  }
  eventsCache[cacheKey] = result;
  return result;
}

export default function DayPlanner({ userId, date, habits = [], routines = [], chronotype = 'bear', variant = 'home' }) {
  const day = date || localDateStr();
  const uiKey = `${variant}|${day}`;
  const isToday = day === localDateStr();

  const [blocks, setBlocks] = useState(() => getSchedulesForDate(day));
  const [cal, setCal] = useState(() => eventsCache[`${userId}|${day}`] || { status: 'loading', events: [] });
  const [adding, setAddingState] = useState(!!uiState.open[uiKey]);
  const [needsReconnect, setNeedsReconnect] = useState(!!uiState.needsReconnect);

  const setAdding = (v) => { uiState.open[uiKey] = v; setAddingState(v); };

  const refreshBlocks = useCallback(() => setBlocks(getSchedulesForDate(day)), [day]);

  useEffect(() => {
    refreshBlocks();
    setAddingState(!!uiState.open[uiKey]);
    let cancelled = false;
    if (userId) {
      loadEvents(userId, day).then((r) => { if (!cancelled) setCal(r); });
    } else {
      setCal({ status: 'not_connected', events: [] });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, day]);

  // Hide Google copies of Bloom blocks so nothing shows twice
  const bloomGoogleIds = new Set(blocks.map((b) => b.googleEventId).filter(Boolean));
  const calendarEvents = cal.events.filter((e) => !bloomGoogleIds.has(e.id));

  function handleScheduled(item, google) {
    refreshBlocks();
    if (google?.needsReconnect) { uiState.needsReconnect = true; setNeedsReconnect(true); }
    const where = google?.ok ? ' + Google Calendar' : '';
    showToast(`📅 ${item.name} · ${formatTime12(item.time)}${where}`);
  }

  function handleToggle(b) {
    const updated = toggleScheduleComplete(b.id);
    refreshBlocks();
    if (updated?.completed) showToast(`✓ ${b.name} done — nice`);
  }

  function handleRemove(b) {
    if (!window.confirm(`Remove "${b.name}" from ${isToday ? 'today' : 'this day'}?`)) return;
    removeSchedule(b.id);
    if (b.googleEventId && userId) deleteCalendarEvent(userId, b.googleEventId);
    refreshBlocks();
    showToast('↩️ Removed from your day');
  }

  function connectGoogle() {
    window.location.href = getGoogleAuthUrl();
  }

  const doneCount = blocks.filter((b) => b.completed).length;
  const plannedMins = blocks.reduce((a, b) => a + (Number(b.duration) || 0), 0);
  const heading = isToday
    ? 'Your day'
    : new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const statusPill = (() => {
    if (cal.status === 'connected' && needsReconnect) {
      return (
        <button onClick={connectGoogle}
          style={{ fontSize: 11, fontWeight: 600, color: '#8b6a20', background: '#fdf8ed', border: '1px solid #e8d4a0', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          ⟳ Reconnect to add events to Google
        </button>
      );
    }
    if (cal.status === 'connected') {
      return <span style={{ fontSize: 11, color: '#5a7a5a', background: '#f0f7f0', border: '1px solid #cfe0cf', borderRadius: 99, padding: '3px 10px' }}>● Google Calendar</span>;
    }
    if (cal.status === 'loading') {
      return <span style={{ fontSize: 11, color: '#aaa' }}>Loading calendar…</span>;
    }
    const label = cal.status === 'error' ? '⟳ Reconnect Google Calendar' : '🔗 Connect Google Calendar';
    return (
      <button onClick={connectGoogle}
        style={{ fontSize: 11, fontWeight: 600, color: '#8b6a20', background: '#fdf8ed', border: '1px solid #e8d4a0', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </button>
    );
  })();

  return (
    <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: variant === 'home' ? 20 : 16, marginBottom: variant === 'home' ? 20 : 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: variant === 'home' ? 22 : 19, color: '#1a1a1a' }}>
            📅 {heading}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {blocks.length === 0
              ? 'Block time for your habits and routines around your calendar.'
              : `${blocks.length} planned · ${doneCount} done · ${plannedMins} min of wellness`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {statusPill}
          {!adding && (
            <button onClick={() => setAdding(true)}
              style={{ background: '#5a7a5a', color: 'white', border: 'none', borderRadius: 99, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              ＋ Add to day
            </button>
          )}
        </div>
      </div>

      {cal.status === 'error' && (
        <div style={{ fontSize: 11.5, color: '#8b6a20', background: '#fdf8ed', border: '1px solid #f0e2b8', borderRadius: 10, padding: '8px 12px', marginBottom: 12, lineHeight: 1.5 }}>
          Couldn’t read your Google Calendar (the connection may have expired or needs the new “add events” permission). Tap <strong>Reconnect</strong> — your Bloom plan below still works.
        </div>
      )}

      {/* Picker + timeline: side by side on wide screens, stacked on mobile */}
      <div className={adding ? 'bloom-dayplanner-grid' : ''} style={{ display: 'grid', gridTemplateColumns: adding && variant === 'home' ? 'minmax(0,1.1fr) minmax(0,1fr)' : '1fr', gap: 14, alignItems: 'start' }}>
        {adding && (
          <ScheduleSlotSuggester
            date={day}
            habits={habits}
            routines={routines}
            userId={userId}
            chronotype={chronotype}
            calendarEvents={calendarEvents}
            existingBlocks={blocks}
            calendarConnected={cal.status === 'connected'}
            onScheduled={handleScheduled}
            onClose={() => setAdding(false)}
          />
        )}
        <DayTimeline
          date={day}
          events={calendarEvents}
          blocks={blocks}
          onToggle={handleToggle}
          onRemove={handleRemove}
          maxHeight={variant === 'home' ? 420 : 480}
        />
      </div>

      <style>{`@media(max-width:900px){.bloom-dayplanner-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
