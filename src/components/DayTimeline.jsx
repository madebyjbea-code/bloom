'use client';

// Time-blocked view of one day: Google Calendar events + Bloom habit/routine blocks.
// Pure display component — all data comes in through props.

import { useEffect, useRef } from 'react';
import { localDateStr, timeToMinutes, minutesToTime, formatTime12 } from '../lib/scheduleStorage';

const PX_PER_MIN = 1; // 60px per hour
const DEFAULT_START = 6;
const DEFAULT_END = 23;

// Convert a calendar event to minutes-from-midnight on `date` (local time), clipped to the day.
function eventToRange(ev, date) {
  const dayStart = new Date(`${date}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60000;
  const s = new Date(ev.start).getTime();
  const e = new Date(ev.end).getTime();
  if (isNaN(s) || isNaN(e) || e <= dayStart || s >= dayEnd) return null;
  const start = Math.max(0, Math.round((s - dayStart) / 60000));
  const end = Math.min(24 * 60, Math.round((e - dayStart) / 60000));
  return { start, end: Math.max(end, start + 15) };
}

// Put overlapping items side by side (simple lane layout).
function layout(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const clusters = [];
  let current = [];
  let clusterEnd = -1;
  sorted.forEach((it) => {
    if (current.length && it.start >= clusterEnd) {
      clusters.push(current);
      current = [];
      clusterEnd = -1;
    }
    current.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  });
  if (current.length) clusters.push(current);

  const out = [];
  clusters.forEach((cluster) => {
    const laneEnds = [];
    cluster.forEach((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.start);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.end); } else { laneEnds[lane] = it.end; }
      out.push({ ...it, lane });
    });
    const lanes = laneEnds.length;
    out.forEach((it) => { if (cluster.some((c) => c.id === it.id)) it.lanes = lanes; });
  });
  return out;
}

export default function DayTimeline({ date, events = [], blocks = [], onToggle, onRemove, maxHeight = 460 }) {
  const scrollRef = useRef(null);
  const isToday = date === localDateStr();

  const allDay = events.filter((e) => e.allDay);
  const timed = events
    .filter((e) => !e.allDay)
    .map((e, i) => {
      const r = eventToRange(e, date);
      return r ? { id: `g_${e.id}_${i}`, type: 'event', title: e.summary, ...r, busy: e.busy, color: e.color, calendarName: e.calendarName } : null;
    })
    .filter(Boolean);

  const bloom = blocks
    .map((b) => {
      const start = timeToMinutes(b.time);
      if (start == null) return null;
      return { id: `b_${b.id}`, type: 'bloom', block: b, title: b.name, start, end: start + (Number(b.duration) || 30) };
    })
    .filter(Boolean);

  const items = layout([...timed, ...bloom]);

  const earliest = items.length ? Math.min(...items.map((i) => i.start)) : DEFAULT_START * 60;
  const latest = items.length ? Math.max(...items.map((i) => i.end)) : DEFAULT_END * 60;
  const startHour = Math.min(DEFAULT_START, Math.floor(earliest / 60));
  const endHour = Math.max(DEFAULT_END, Math.min(24, Math.ceil(latest / 60)));
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const top = (mins) => (mins - startHour * 60) * PX_PER_MIN;
  const totalHeight = (endHour - startHour) * 60 * PX_PER_MIN;

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Scroll to "now" (today) or the first planned thing
  useEffect(() => {
    if (!scrollRef.current) return;
    const target = isToday ? nowMins - 60 : (bloom[0]?.start ?? timed[0]?.start ?? 8 * 60) - 30;
    scrollRef.current.scrollTop = Math.max(0, top(target));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div>
      {allDay.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {allDay.map((e, i) => (
            <span key={`${e.id}_${i}`} title={e.calendarName || ''} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: e.color ? `${e.color}22` : '#eef1f6', color: '#4a5468', border: `1px solid ${e.color || '#d8deea'}` }}>
              📌 {e.summary}
            </span>
          ))}
        </div>
      )}

      <div ref={scrollRef} style={{ maxHeight, overflowY: 'auto', position: 'relative', borderRadius: 12, border: '1px solid #f0ece6', background: '#fdfcfa' }}>
        <div style={{ position: 'relative', height: totalHeight + 12, margin: '6px 0' }}>
          {/* Hour grid */}
          {hours.map((h) => (
            <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: top(h * 60), height: 0 }}>
              <div style={{ position: 'absolute', left: 6, top: -7, fontSize: 10, color: '#b0a898', width: 38, textAlign: 'right' }}>
                {h === 24 ? '' : formatTime12(minutesToTime(h * 60))}
              </div>
              <div style={{ position: 'absolute', left: 50, right: 8, borderTop: '1px solid #f0ece6' }} />
            </div>
          ))}

          {/* Now line */}
          {isToday && nowMins >= startHour * 60 && nowMins <= endHour * 60 && (
            <div style={{ position: 'absolute', left: 46, right: 8, top: top(nowMins), zIndex: 5, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: 0, top: -4, width: 8, height: 8, borderRadius: '50%', background: '#e07070' }} />
              <div style={{ borderTop: '2px solid #e07070' }} />
            </div>
          )}

          {/* Blocks */}
          <div style={{ position: 'absolute', left: 54, right: 10, top: 0, bottom: 0 }}>
            {items.map((it) => {
              const height = Math.max(22, (it.end - it.start) * PX_PER_MIN - 2);
              const widthPct = 100 / (it.lanes || 1);
              const base = {
                position: 'absolute',
                top: top(it.start) + 1,
                height,
                left: `calc(${widthPct * it.lane}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
                borderRadius: 8,
                padding: height < 34 ? '2px 8px' : '5px 8px',
                overflow: 'hidden',
                fontSize: 12,
                boxSizing: 'border-box',
                display: 'flex',
                gap: 6,
                alignItems: height < 34 ? 'center' : 'flex-start',
              };

              if (it.type === 'event') {
                return (
                  <div key={it.id} title={it.calendarName ? `${it.title} · ${it.calendarName}` : it.title}
                    style={{ ...base, background: it.color ? `${it.color}22` : (it.busy ? '#eef1f6' : '#f6f7f9'), borderLeft: `3px solid ${it.color || '#9aa8c0'}`, color: '#4a5468' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                      {height >= 34 && <div style={{ fontSize: 10, opacity: 0.8 }}>{formatTime12(minutesToTime(it.start))}–{formatTime12(minutesToTime(it.end))}</div>}
                    </div>
                  </div>
                );
              }

              const b = it.block;
              const accent = b.color || '#8aad8a';
              return (
                <div key={it.id} title={`${b.name} · tap to mark done`}
                  onClick={() => onToggle && onToggle(b)}
                  style={{ ...base, background: b.completed ? '#f1f4f1' : `${accent}26`, borderLeft: `3px solid ${accent}`, color: '#2a3a2a', cursor: 'pointer', opacity: b.completed ? 0.6 : 1 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${accent}`, background: b.completed ? accent : 'white', color: 'white', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: height < 34 ? 0 : 1 }}>
                    {b.completed ? '✓' : ''}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: b.completed ? 'line-through' : 'none' }}>
                      {b.icon} {b.name}
                    </div>
                    {height >= 34 && (
                      <div style={{ fontSize: 10, color: '#6a7a6a' }}>
                        {formatTime12(b.time)} · {b.duration} min{b.googleEventId ? ' · 📅 on Google' : ''}
                      </div>
                    )}
                  </div>
                  {onRemove && (
                    <button onClick={(e) => { e.stopPropagation(); onRemove(b); }} title="Remove"
                      style={{ background: 'transparent', border: 'none', color: '#a8b8a8', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, flexShrink: 0 }}>
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div style={{ position: 'absolute', left: 54, right: 10, top: top(Math.max(startHour * 60, (isToday ? nowMins : 9 * 60))) + 10, textAlign: 'center', fontSize: 12, color: '#b0a898', pointerEvents: 'none' }}>
              Nothing planned yet — add a habit or routine and it appears here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
