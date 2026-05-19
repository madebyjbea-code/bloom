'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

export default function TabBadHabits({ onAdd, onToast }) {
  const userId       = useStore(s => s.userId);
  const badHabits    = useStore(s => s.badHabits);
  const logs         = useStore(s => s.badHabitLogsToday);
  const logBadHabit  = useStore(s => s.logBadHabit);
  const health       = useStore(s => s.health);
  const setStats     = useStore(s => s.setStats);
  const isRestDay    = useStore(s => s.isRestDayToday);
  const restDayReason = useStore(s => s.restDayReason);
  const restDaysThisWeek = useStore(s => s.restDaysThisWeek);
  const restWeekStart = useStore(s => s.restWeekStart);
  const setRestDay   = useStore(s => s.setRestDay);
  const setRestDaysThisWeek = useStore(s => s.setRestDaysThisWeek);

  const [history, setHistory] = useState({}); // { 'YYYY-MM-DD': { habitKey: log } }
  const [quantInputs, setQuantInputs] = useState({}); // local input state per habit
  const [confirmRest, setConfirmRest] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const REST_DAYS_PER_WEEK = 2;

  useEffect(() => {
    if (!userId) return;
    loadHistory();
    loadTodayLogs();
  }, [userId, badHabits.length]);

  async function loadHistory() {
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data } = await supabase
      .from('bad_habit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);
    if (data) {
      const grouped = {};
      data.forEach(r => {
        if (!grouped[r.date]) grouped[r.date] = {};
        grouped[r.date][r.bad_habit_key] = { did_it: r.did_it, amount: r.amount, failed: r.failed };
      });
      setHistory(grouped);
    }
  }

  async function loadTodayLogs() {
    const { data } = await supabase
      .from('bad_habit_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today);
    if (data && data.length > 0) {
      data.forEach(r => {
        logBadHabit(r.bad_habit_key, { did_it: r.did_it, amount: r.amount, failed: r.failed });
      });
    }
  }

  async function persistLog(habitKey, log) {
    if (!userId) return;
    try {
      await supabase.from('bad_habit_logs').upsert(
        { user_id: userId, bad_habit_key: habitKey, date: today, did_it: log.did_it ?? null, amount: log.amount ?? null, failed: log.failed },
        { onConflict: 'user_id,bad_habit_key,date' }
      );
    } catch (e) { console.error('persist log', e); }
  }

  async function adjustHealth(delta) {
    const newHealth = Math.max(10, Math.min(100, health + delta));
    setStats({ health: newHealth });
    if (userId) {
      try { await supabase.from('user_stats').update({ health: newHealth }).eq('user_id', userId); }
      catch (e) { console.error(e); }
    }
  }

  async function logBinary(h, didIt) {
    const prevLog = logs[h.key];
    const wasPrevFailed = prevLog?.failed === true;
    const newLog = { did_it: didIt, failed: didIt };
    logBadHabit(h.key, newLog);
    await persistLog(h.key, newLog);

    // Health adjustment — only on state CHANGE
    if (didIt && !wasPrevFailed) {
      await adjustHealth(-h.healthPenalty);
      onToast?.(`−${h.healthPenalty} ❤️ logged honestly · keep going`);
    } else if (!didIt && wasPrevFailed) {
      // Reverting a "did it" → refund the penalty (in case user mistapped)
      await adjustHealth(+h.healthPenalty);
      onToast?.('Undone');
    } else if (!didIt && prevLog === undefined) {
      // First time saying no
      onToast?.('✓ Logged · proud of you');
    }
  }

  async function logQuant(h, amount) {
    const num = Number(amount);
    const prevLog = logs[h.key];
    const wasPrevFailed = prevLog?.failed === true;
    const nowFailed = num > (h.threshold ?? 0);
    const newLog = { amount: num, failed: nowFailed };
    logBadHabit(h.key, newLog);
    await persistLog(h.key, newLog);

    if (nowFailed && !wasPrevFailed) {
      await adjustHealth(-h.healthPenalty);
      onToast?.(`−${h.healthPenalty} ❤️ over threshold · still better than not logging`);
    } else if (!nowFailed && wasPrevFailed) {
      await adjustHealth(+h.healthPenalty);
      onToast?.('Within limits ✓');
    } else if (!nowFailed) {
      onToast?.(`✓ Logged · within ${h.threshold} ${h.unit}`);
    }
  }

  async function toggleRestDay() {
    if (isRestDay) {
      // Cancelling rest day
      setRestDay(false, null);
      if (userId) {
        try { await supabase.from('rest_days').delete().eq('user_id', userId).eq('date', today); }
        catch (e) { console.error(e); }
      }
      setRestDaysThisWeek(Math.max(0, restDaysThisWeek - 1), restWeekStart || today);
      onToast?.('Rest day cancelled');
    } else {
      // Activating rest day
      if (restDaysThisWeek >= REST_DAYS_PER_WEEK) {
        onToast?.(`Already used ${REST_DAYS_PER_WEEK} rest days this week — resets Monday`);
        return;
      }
      setConfirmRest(true);
    }
  }

  async function confirmRestDay(reason) {
    setConfirmRest(false);
    setRestDay(true, reason);
    if (userId) {
      try {
        await supabase.from('rest_days').upsert(
          { user_id: userId, date: today, reason },
          { onConflict: 'user_id,date' }
        );
      } catch (e) { console.error(e); }
    }
    const monday = restWeekStart || today;
    setRestDaysThisWeek(restDaysThisWeek + 1, monday);
    onToast?.(`🌙 ${reason === 'travel' ? 'Travel' : reason === 'sick' ? 'Sick' : 'Rest'} day on — no decay tonight`);
  }

  // 7-day history grid
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last7.push(d.toISOString().split('T')[0]);
  }
  const dayLabels = last7.map(d => new Date(d).toLocaleDateString('en', { weekday: 'short' })[0]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* REST DAY BANNER */}
      <div style={{
        background: isRestDay ? 'linear-gradient(135deg,#e8e0f0,#d8c8e8)' : 'white',
        border: `1.5px solid ${isRestDay ? '#a890b8' : '#e8e4de'}`,
        borderRadius: 16, padding: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14
      }}>
        <div style={{ fontSize: 32 }}>{isRestDay ? '🌙' : '☀️'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: isRestDay ? '#5a3a7a' : '#2a2a2a', marginBottom: 2 }}>
            {isRestDay
              ? `${restDayReason === 'travel' ? 'Travel' : restDayReason === 'sick' ? 'Sick' : 'Rest'} day · no decay tonight`
              : 'Need a pause?'}
          </div>
          <div style={{ fontSize: 12, color: isRestDay ? '#7a5a9a' : '#888' }}>
            {isRestDay
              ? 'Streaks paused, health protected. You earned this.'
              : `${REST_DAYS_PER_WEEK - restDaysThisWeek} rest day${REST_DAYS_PER_WEEK - restDaysThisWeek !== 1 ? 's' : ''} left this week · resets Monday`}
          </div>
        </div>
        <button onClick={toggleRestDay}
          style={{
            padding: '8px 16px', borderRadius: 99,
            background: isRestDay ? 'white' : (restDaysThisWeek >= REST_DAYS_PER_WEEK ? '#e8e4de' : '#8aad8a'),
            color: isRestDay ? '#5a3a7a' : (restDaysThisWeek >= REST_DAYS_PER_WEEK ? '#aaa' : 'white'),
            border: isRestDay ? '1.5px solid #a890b8' : 'none',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif'
          }}
        >
          {isRestDay ? 'Cancel' : 'Take rest day'}
        </button>
      </div>

      {/* CONFIRM REST REASON MODAL */}
      {confirmRest && (
        <div onClick={() => setConfirmRest(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 20, padding: 24, width: 380, maxWidth: '90vw' }}>
            <h3 style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, marginBottom: 6 }}>Why a rest day?</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>This helps your future self spot patterns.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'rest',   label: '🌿 Just need rest',   sub: 'Planned recovery day' },
                { key: 'travel', label: '✈️ Travelling',        sub: 'Routine disrupted' },
                { key: 'sick',   label: '🤒 Feeling unwell',    sub: 'Body needs care' },
              ].map(r => (
                <button key={r.key} onClick={() => confirmRestDay(r.key)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e8e4de', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f7f3ed'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{r.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER + ADD BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'Instrument Serif,serif', fontSize: 24, color: '#2a2a2a' }}>Habits to stop</h2>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Track honestly · slips cost health · the system rewards awareness</p>
        </div>
        <button onClick={onAdd}
          style={{ padding: '10px 18px', borderRadius: 99, background: '#e07070', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          + Add bad habit
        </button>
      </div>

      {badHabits.length === 0 ? (
        <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚭</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#2a2a2a', marginBottom: 6 }}>Nothing to stop yet</div>
          <p style={{ fontSize: 13, color: '#888', maxWidth: 380, margin: '0 auto 18px', lineHeight: 1.6 }}>
            Pick one thing you want to reduce. Smoking, screen time, alcohol, sugar — anything you&apos;d feel better doing less of.
          </p>
          <button onClick={onAdd}
            style={{ padding: '10px 22px', borderRadius: 99, background: '#e07070', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            + Add your first
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {badHabits.map(h => {
            const log = logs[h.key];
            const isLogged = log !== undefined;
            const failed = log?.failed === true;

            return (
              <div key={h.key} style={{
                background: 'white',
                border: `1.5px solid ${failed ? '#e07070' : isLogged ? '#8aad8a' : '#e8e4de'}`,
                borderLeft: `3px solid ${failed ? '#e07070' : isLogged ? '#8aad8a' : '#c4a882'}`,
                borderRadius: 14, padding: 16, opacity: isRestDay ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>{h.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{h.name}</div>
                    <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>
                      −{h.healthPenalty} ❤️ if {h.type === 'binary' ? 'done' : `> ${h.threshold} ${h.unit}`}
                    </div>
                  </div>
                </div>

                {h.type === 'binary' ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => !isRestDay && logBinary(h, false)} disabled={isRestDay}
                      style={{ flex: 1, padding: 10, borderRadius: 10, border: `1.5px solid ${log?.did_it === false ? '#8aad8a' : '#e8e4de'}`, background: log?.did_it === false ? '#f3f8f3' : 'white', color: log?.did_it === false ? '#5a7a5a' : '#888', fontSize: 12, fontWeight: 600, cursor: isRestDay ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                      ✓ Didn&apos;t
                    </button>
                    <button onClick={() => !isRestDay && logBinary(h, true)} disabled={isRestDay}
                      style={{ flex: 1, padding: 10, borderRadius: 10, border: `1.5px solid ${log?.did_it === true ? '#e07070' : '#e8e4de'}`, background: log?.did_it === true ? '#fdf1ec' : 'white', color: log?.did_it === true ? '#a05030' : '#888', fontSize: 12, fontWeight: 600, cursor: isRestDay ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                      ⚠️ Did
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                      <input
                        type="number" min="0" step="0.5"
                        value={quantInputs[h.key] ?? log?.amount ?? ''}
                        onChange={e => setQuantInputs(prev => ({ ...prev, [h.key]: e.target.value }))}
                        placeholder="0"
                        disabled={isRestDay}
                        style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e8e4de', borderRadius: 10, fontSize: 14, fontFamily: 'DM Sans,sans-serif', outline: 'none', textAlign: 'center' }}
                      />
                      <div style={{ fontSize: 11, color: '#888', minWidth: 50 }}>{h.unit}</div>
                      <button onClick={() => !isRestDay && quantInputs[h.key] !== undefined && logQuant(h, quantInputs[h.key])} disabled={isRestDay || quantInputs[h.key] === undefined}
                        style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: isRestDay || quantInputs[h.key] === undefined ? '#e8e4de' : '#5a7a5a', color: isRestDay || quantInputs[h.key] === undefined ? '#aaa' : 'white', fontSize: 12, fontWeight: 600, cursor: isRestDay ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                        Log
                      </button>
                    </div>
                    {isLogged && (
                      <div style={{ fontSize: 11, color: failed ? '#a05030' : '#5a7a5a', textAlign: 'center', marginTop: 4 }}>
                        Logged: {log.amount} {h.unit} {failed ? `· over ${h.threshold}` : '· within limit ✓'}
                      </div>
                    )}
                  </div>
                )}

                {/* 7-day mini-history */}
                <div style={{ display: 'flex', gap: 3, marginTop: 12, justifyContent: 'space-between' }}>
                  {last7.map((d, i) => {
                    const dayLog = history[d]?.[h.key];
                    const dayFailed = dayLog?.failed === true;
                    const dayLogged = dayLog !== undefined;
                    const isToday = d === today;
                    return (
                      <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ fontSize: 9, color: '#aaa' }}>{dayLabels[i]}</div>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5,
                          background: dayFailed ? '#e07070' : dayLogged ? '#8aad8a' : '#f0ece6',
                          border: isToday ? '2px solid #2a2a2a' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: 'white'
                        }}>
                          {dayFailed ? '✕' : dayLogged ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTNOTE */}
      <div style={{ background: '#f7f3ed', border: '1px solid #e8d9c4', borderRadius: 12, padding: '12px 16px', marginTop: 18, fontSize: 11, color: '#7a6040', lineHeight: 1.6 }}>
        🧠 <strong>Why this works:</strong> Self-monitoring is one of the most evidence-backed behaviour-change techniques (Michie et al., 2011). The penalty isn&apos;t to shame you — it&apos;s to keep the system honest. Logging a slip is still better than hiding it.
      </div>
    </div>
  );
}
