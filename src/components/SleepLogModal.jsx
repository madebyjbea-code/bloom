'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

function qualityLabel(q) {
  if (q <= 2) return 'Poor';
  if (q <= 4) return 'Fair';
  if (q <= 6) return 'OK';
  if (q <= 8) return 'Good';
  return 'Great';
}

function qualityColor(q) {
  if (q <= 3) return '#c47a5a';
  if (q <= 6) return '#d4af6a';
  return '#8aad8a';
}

// Build today's date string and guess a smart bedtime default
function todayStr() { return new Date().toISOString().split('T')[0]; }
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Convert "YYYY-MM-DD HH:MM" → ISO timestamp (local)
function toISO(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

export default function SleepLogModal({ onClose, onSaved, existingEntry }) {
  const userId = useStore(s => s.userId);

  // Default: yesterday 11pm bedtime, today 7am wake
  const [bedDate, setBedDate] = useState(yesterdayStr());
  const [bedTime, setBedTime] = useState('23:00');
  const [wakeDate, setWakeDate] = useState(todayStr());
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Pre-fill if editing existing entry
  useEffect(() => {
    if (!existingEntry) return;
    const bed = new Date(existingEntry.bedtime);
    const wake = new Date(existingEntry.wake_time);
    setBedDate(bed.toISOString().split('T')[0]);
    setBedTime(`${String(bed.getHours()).padStart(2,'0')}:${String(bed.getMinutes()).padStart(2,'0')}`);
    setWakeDate(wake.toISOString().split('T')[0]);
    setWakeTime(`${String(wake.getHours()).padStart(2,'0')}:${String(wake.getMinutes()).padStart(2,'0')}`);
    setQuality(existingEntry.quality_score || 7);
  }, [existingEntry]);

  function durationLabel() {
    const bedISO  = new Date(`${bedDate}T${bedTime}:00`);
    const wakeISO = new Date(`${wakeDate}T${wakeTime}:00`);
    const diffMs  = wakeISO - bedISO;
    if (diffMs <= 0) return null;
    const totalMins = Math.round(diffMs / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const bedISO  = toISO(bedDate, bedTime);
      const wakeISO = toISO(wakeDate, wakeTime);
      const diffMs  = new Date(wakeISO) - new Date(bedISO);
      if (diffMs <= 0) { setError('Wake time must be after bedtime.'); setSaving(false); return; }
      const duration_minutes = Math.round(diffMs / 60000);

      if (existingEntry?.id) {
        await supabase.from('sleep_logs').update({
          bedtime: bedISO, wake_time: wakeISO, quality_score: quality, duration_minutes,
        }).eq('id', existingEntry.id);
      } else {
        await supabase.from('sleep_logs').insert({
          user_id: userId, bedtime: bedISO, wake_time: wakeISO,
          quality_score: quality, duration_minutes, source: 'manual',
        });
      }

      onSaved?.();
      onClose();
    } catch (e) {
      setError('Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const dur = durationLabel();
  const qColor = qualityColor(quality);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 24, padding: 28, width: 400, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: '#1a1a1a', margin: 0 }}>
              {existingEntry ? 'Edit sleep' : 'Log sleep'} 😴
            </h2>
            {dur && (
              <div style={{ fontSize: 13, color: '#8a7a9e', fontWeight: 600, marginTop: 3 }}>
                {dur} total
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: 15, color: '#888' }}
          >✕</button>
        </div>

        {/* Bedtime */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', marginBottom: 8 }}>
            🌙 Bedtime
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Date</div>
              <input
                type="date"
                value={bedDate}
                onChange={e => setBedDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#8a7a9e'}
                onBlur={e => e.target.style.borderColor = '#e8e4de'}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Time</div>
              <input
                type="time"
                value={bedTime}
                onChange={e => setBedTime(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#8a7a9e'}
                onBlur={e => e.target.style.borderColor = '#e8e4de'}
              />
            </div>
          </div>
        </div>

        {/* Wake time */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', marginBottom: 8 }}>
            ☀️ Wake time
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Date</div>
              <input
                type="date"
                value={wakeDate}
                onChange={e => setWakeDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#8aad8a'}
                onBlur={e => e.target.style.borderColor = '#e8e4de'}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Time</div>
              <input
                type="time"
                value={wakeTime}
                onChange={e => setWakeTime(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#8aad8a'}
                onBlur={e => e.target.style.borderColor = '#e8e4de'}
              />
            </div>
          </div>
        </div>

        {/* Quality slider */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', marginBottom: 8 }}>
            Sleep quality
          </label>
          <div style={{ background: '#f7f3ed', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#888' }}>1 — Poor</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: qColor, fontFamily: 'Syne, sans-serif' }}>
                {quality} <span style={{ fontSize: 13, fontWeight: 500 }}>— {qualityLabel(quality)}</span>
              </span>
              <span style={{ fontSize: 13, color: '#888' }}>10 — Great</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              style={{ width: '100%', accentColor: qColor, cursor: 'pointer' }}
            />
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 8, textAlign: 'center' }}>
              How rested did you feel when you woke up?
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fdf0f0', border: '1px solid #d08080', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#a04040', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          style={{ width: '100%', padding: 14, background: saving ? '#ccc' : '#1a2e1a', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          {saving ? 'Saving…' : existingEntry ? 'Update sleep log' : 'Save sleep log'}
        </button>
      </div>
    </div>
  );
}
