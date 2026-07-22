'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

// ── Default routine definitions (used as fallback if no customisation saved) ──
const DEFAULT_ROUTINES = {
  morning: {
    label: 'Morning Routine', icon: '🌅', color: '#d4a84a',
    steps: [
      { id: 'm1', name: 'Wake & hydrate', duration: 5 },
      { id: 'm2', name: 'Morning light outside', duration: 10 },
      { id: 'm3', name: 'Breathwork or meditation', duration: 10 },
      { id: 'm4', name: 'Protein breakfast', duration: 15 },
      { id: 'm5', name: 'Review today\'s habits', duration: 5 },
    ],
  },
  focus: {
    label: 'Deep Focus', icon: '⏱', color: '#7a9e7e',
    steps: [
      { id: 'f1', name: 'Clear your space', duration: 5 },
      { id: 'f2', name: 'Deep work block', duration: 25 },
      { id: 'f3', name: 'Short break — move', duration: 5 },
      { id: 'f4', name: 'Deep work block', duration: 25 },
      { id: 'f5', name: 'Rest & reflect', duration: 5 },
    ],
  },
  winddown: {
    label: 'Wind-Down', icon: '🌙', color: '#8a7a9e',
    steps: [
      { id: 'w1', name: 'Phone away', duration: 2 },
      { id: 'w2', name: 'Light stretching', duration: 10 },
      { id: 'w3', name: 'Journalling or reading', duration: 15 },
      { id: 'w4', name: 'Breathwork', duration: 5 },
      { id: 'w5', name: 'Lights off', duration: 3 },
    ],
  },
  movement: {
    label: 'Movement Block', icon: '🏃', color: '#c4a882',
    steps: [
      { id: 'mv1', name: 'Warm-up', duration: 5 },
      { id: 'mv2', name: 'Main workout', duration: 30 },
      { id: 'mv3', name: 'Cool-down & stretch', duration: 10 },
    ],
  },
};

function fmt(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

// ── Step editor modal — reorder, edit durations, add/remove steps ──────────
function StepEditorModal({ routineKey, steps, color, label, icon, allHabits, onSave, onClose }) {
  const [editSteps, setEditSteps] = useState(steps.map((s, i) => ({ ...s, id: s.id || `${routineKey}_${i}` })));
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [addName, setAddName] = useState('');
  const [addDuration, setAddDuration] = useState(5);
  const [showAdd, setShowAdd] = useState(false);

  function moveStep(from, to) {
    const arr = [...editSteps];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setEditSteps(arr);
  }

  function updateDuration(idx, val) {
    const v = Math.max(1, Math.min(120, Number(val) || 1));
    setEditSteps(prev => prev.map((s, i) => i === idx ? { ...s, duration: v } : s));
  }

  function updateName(idx, val) {
    setEditSteps(prev => prev.map((s, i) => i === idx ? { ...s, name: val } : s));
  }

  function removeStep(idx) {
    setEditSteps(prev => prev.filter((_, i) => i !== idx));
  }

  function addHabitStep(h) {
    if (editSteps.some(s => s.habitKey === h.key)) return;
    setEditSteps(prev => [...prev, {
      id: `habit_${h.key}_${Date.now()}`,
      name: `${h.emoji} ${h.name}`,
      duration: 10,
      habitKey: h.key,
    }]);
  }

  function addCustomStep() {
    if (!addName.trim()) return;
    setEditSteps(prev => [...prev, {
      id: `custom_${Date.now()}`,
      name: addName.trim(),
      duration: addDuration,
    }]);
    setAddName(''); setAddDuration(5); setShowAdd(false);
  }

  const totalMins = editSteps.reduce((a, s) => a + s.duration, 0);

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:24, padding:26, width:520, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <h3 style={{ fontFamily:'Instrument Serif,serif', fontSize:20 }}>{icon} Edit {label}</h3>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', border:'1.5px solid #e8e4de', background:'transparent', cursor:'pointer', fontSize:14 }}>✕</button>
        </div>
        <p style={{ fontSize:12, color:'#888', marginBottom:18 }}>
          Drag to reorder · click duration to edit · {totalMins} min total
        </p>

        {/* Steps list */}
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
          {editSteps.map((s, i) => (
            <div key={s.id}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={e => { e.preventDefault(); setDragOver(i); }}
              onDrop={() => { if (dragIdx !== null && dragIdx !== i) moveStep(dragIdx, i); setDragIdx(null); setDragOver(null); }}
              onDragEnd={() => { setDragIdx(null); setDragOver(null); }}
              style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                borderRadius:12, border:`1.5px solid ${dragOver===i ? color : '#e8e4de'}`,
                background: dragOver===i ? color+'11' : dragIdx===i ? '#f7f3ed' : 'white',
                cursor:'grab', transition:'all 0.15s', opacity: dragIdx===i ? 0.5 : 1,
              }}>
              <span style={{ fontSize:14, color:'#bbb', cursor:'grab' }}>⠿</span>
              <div style={{ flex:1 }}>
                <input
                  value={s.name}
                  onChange={e => updateName(i, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ width:'100%', fontSize:13, fontWeight:500, border:'none', outline:'none', background:'transparent', fontFamily:'DM Sans,sans-serif', color:'#2a2a2a' }}
                />
                {s.habitKey && <div style={{ fontSize:10, color: color, fontWeight:600, marginTop:1 }}>linked habit</div>}
              </div>
              {/* Duration editor */}
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <button onClick={e => { e.stopPropagation(); updateDuration(i, s.duration - 1); }}
                  style={{ width:22, height:22, borderRadius:6, border:'1.5px solid #e8e4de', background:'white', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#888' }}>−</button>
                <span style={{ fontSize:12, fontWeight:600, color:'#555', minWidth:36, textAlign:'center' }}>{s.duration}m</span>
                <button onClick={e => { e.stopPropagation(); updateDuration(i, s.duration + 1); }}
                  style={{ width:22, height:22, borderRadius:6, border:'1.5px solid #e8e4de', background:'white', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#888' }}>+</button>
              </div>
              <button onClick={e => { e.stopPropagation(); removeStep(i); }}
                style={{ fontSize:13, color:'#ddd', background:'transparent', border:'none', cursor:'pointer', padding:4 }}
                onMouseOver={e => e.currentTarget.style.color='#e07070'}
                onMouseOut={e => e.currentTarget.style.color='#ddd'}>✕</button>
            </div>
          ))}
        </div>

        {/* Add from active habits */}
        {allHabits.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'#888', marginBottom:8 }}>Add a habit step</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {allHabits.filter(h => !editSteps.some(s => s.habitKey === h.key)).map(h => (
                <button key={h.key} onClick={() => addHabitStep(h)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#f3f8f3', border:'1.5px solid #b5ceb5', borderRadius:99, cursor:'pointer', fontSize:12, fontWeight:600, color:'#3a6a3a', fontFamily:'DM Sans,sans-serif' }}>
                  {h.emoji} {h.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add custom step */}
        {showAdd ? (
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14, padding:12, background:'#f7f3ed', borderRadius:12 }}>
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Step name"
              onKeyDown={e => e.key === 'Enter' && addCustomStep()}
              style={{ flex:1, padding:'8px 12px', borderRadius:9, border:'1.5px solid #e8e4de', fontSize:13, fontFamily:'DM Sans,sans-serif', outline:'none' }} />
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <button onClick={() => setAddDuration(d => Math.max(1, d - 1))} style={{ width:26, height:26, borderRadius:6, border:'1.5px solid #e8e4de', background:'white', cursor:'pointer', fontWeight:700, color:'#888' }}>−</button>
              <span style={{ fontSize:12, minWidth:32, textAlign:'center', fontWeight:600 }}>{addDuration}m</span>
              <button onClick={() => setAddDuration(d => Math.min(120, d + 1))} style={{ width:26, height:26, borderRadius:6, border:'1.5px solid #e8e4de', background:'white', cursor:'pointer', fontWeight:700, color:'#888' }}>+</button>
            </div>
            <button onClick={addCustomStep} style={{ padding:'8px 14px', background:color, color:'white', border:'none', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>Add</button>
            <button onClick={() => setShowAdd(false)} style={{ fontSize:12, color:'#aaa', background:'none', border:'none', cursor:'pointer' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} style={{ fontSize:12, color:'#888', background:'#f7f3ed', border:'1.5px dashed #e8e4de', borderRadius:10, padding:'8px 16px', cursor:'pointer', width:'100%', marginBottom:14, fontFamily:'DM Sans,sans-serif' }}>
            + Add custom step
          </button>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:12, background:'#f7f3ed', color:'#888', border:'none', borderRadius:12, fontSize:13, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>Cancel</button>
          <button onClick={() => onSave(editSteps)} style={{ flex:2, padding:12, background:'#1a2e1a', color:'white', border:'none', borderRadius:12, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>Save routine</button>
        </div>
      </div>
    </div>
  );
}

// ── Habit checklist shown after routine completes ──────────────────────────
function PostRoutineChecklist({ routineKey, assignedHabits, onDone }) {
  const completedToday = useStore(s => s.completedToday);
  const toggleH        = useStore(s => s.toggleHabit);
  const setStats       = useStore(s => s.setStats);
  const coins          = useStore(s => s.coins);
  const ge             = useStore(s => s.ge);
  const health         = useStore(s => s.health);
  const userId         = useStore(s => s.userId);

  async function markHabit(h) {
    const isD = completedToday.includes(h.key);
    if (isD) return;
    toggleH(h.key);
    const nc = coins + h.coins;
    const ng = ge + h.ge;
    const nh = Math.min(100, health + 3);
    setStats({ coins: nc, greenEnergy: ng, health: nh });
    if (userId) {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('habit_completions').insert({ user_id: userId, habit_key: h.key, date: today }).catch(()=>{});
      await supabase.from('user_stats').update({ coins: nc, green_energy: ng, health: nh }).eq('user_id', userId).catch(()=>{});
    }
  }

  const allDone = assignedHabits.every(h => completedToday.includes(h.key));

  return (
    <div style={{ background:'white', border:'1.5px solid #e8e4de', borderRadius:20, padding:24, marginTop:20 }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:14 }}>Mark your habits ✓</div>
      {assignedHabits.length === 0 ? (
        <div style={{ fontSize:13, color:'#aaa', textAlign:'center', padding:'12px 0' }}>No habits linked yet — add them on the routine card.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {assignedHabits.map(h => {
            const done = completedToday.includes(h.key);
            return (
              <div key={h.key} onClick={() => !done && markHabit(h)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, border:`1.5px solid ${done?'#8aad8a':'#e8e4de'}`, background:done?'#f3f8f3':'white', cursor:done?'default':'pointer', transition:'all 0.2s' }}>
                <span style={{ fontSize:20 }}>{h.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:done?'#5a7a5a':'#2a2a2a', textDecoration:done?'line-through':'none' }}>{h.name}</div>
                  <div style={{ fontSize:10, color:'#aaa', marginTop:1 }}>+{h.coins} 🪙{h.ge > 0 ? ` +${h.ge} ⚡` : ''}</div>
                </div>
                <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${done?'#8aad8a':'#e8e4de'}`, background:done?'#8aad8a':'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'white' }}>
                  {done && '✓'}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={onDone}
        style={{ width:'100%', padding:12, background:allDone?'#8aad8a':'#1a2e1a', color:'white', border:'none', borderRadius:12, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
        {allDone ? '🎉 All done — great work!' : 'Done for now →'}
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function TabRoutines({
  routineLog, setRoutineLog,
  routineFreqs, setRoutineFreqs,
  coins, userId,
  toast,
  allHabits,
}) {
  const setStats = useStore(s => s.setStats);

  const [routine,   setRoutine]   = useState(null);
  const [rStep,     setRStep]     = useState(0);
  const [rSecs,     setRSecs]     = useState(0);
  const [rRunning,  setRRunning]  = useState(false);
  const [showHabitChecklist, setShowHabitChecklist] = useState(false);
  const [pickerOpen,  setPickerOpen]  = useState(null); // routineKey for habit picker
  const [editorOpen,  setEditorOpen]  = useState(null); // routineKey for step editor

  // Custom steps per routine — persisted to localStorage
  const [customSteps, setCustomSteps] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-routine-steps') || '{}'); } catch { return {}; }
  });

  // Habit assignments per routine
  const [routineHabits, setRoutineHabits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-routine-habits') || '{}'); } catch { return {}; }
  });

  const rTimer = useRef(null);

  // Get live steps for a routine (custom if saved, else default)
  function getSteps(key) {
    return customSteps[key] || DEFAULT_ROUTINES[key]?.steps || [];
  }

  function saveSteps(key, steps) {
    const next = { ...customSteps, [key]: steps };
    setCustomSteps(next);
    localStorage.setItem('bloom-routine-steps', JSON.stringify(next));
    setEditorOpen(null);
    toast?.('✅ Routine saved');
  }

  function getAssigned(key) { return routineHabits[key] || []; }

  function toggleHabitInRoutine(routineKey, habitKey) {
    const current = getAssigned(routineKey);
    const updated = current.includes(habitKey) ? current.filter(k => k !== habitKey) : [...current, habitKey];
    const next = { ...routineHabits, [routineKey]: updated };
    setRoutineHabits(next);
    localStorage.setItem('bloom-routine-habits', JSON.stringify(next));
  }

  function getTodayRoutineCount(key) {
    const today = new Date().toISOString().split('T')[0];
    return routineLog[`${key}_${today}`] || 0;
  }

  function getRoutineFreq(key) { return routineFreqs[key] || 1; }

  function setRoutineFreq(key, freq) {
    const updated = { ...routineFreqs, [key]: freq };
    setRoutineFreqs(updated);
    localStorage.setItem('bloom-routine-freqs', JSON.stringify(updated));
  }

  function recordRoutineCompletion(key) {
    const today = new Date().toISOString().split('T')[0];
    const logKey = `${key}_${today}`;
    const updated = { ...routineLog, [logKey]: (routineLog[logKey] || 0) + 1 };
    setRoutineLog(updated);
    localStorage.setItem('bloom-routine-log', JSON.stringify(updated));
  }

  function startRoutine(key) {
    const steps = getSteps(key);
    setRoutine(key);
    setRStep(0);
    setRSecs(steps[0].duration * 60);
    setRRunning(false);
    setShowHabitChecklist(false);
    clearInterval(rTimer.current);
  }

  function toggleTimer() {
    if (rRunning) { clearInterval(rTimer.current); setRRunning(false); }
    else {
      setRRunning(true);
      rTimer.current = setInterval(() => {
        setRSecs(prev => {
          if (prev <= 1) {
            clearInterval(rTimer.current); setRRunning(false);
            setRStep(s => {
              const steps = getSteps(routine);
              if (!steps) return s;
              if (s + 1 < steps.length) {
                setTimeout(() => setRSecs(steps[s + 1].duration * 60), 50);
                toast?.(`✅ Next: ${steps[s + 1].name}`);
                return s + 1;
              } else {
                toast?.('🎉 Routine complete! +20 🪙');
                recordRoutineCompletion(routine);
                const nc = coins + 20;
                supabase.from('user_stats').update({ coins: nc }).eq('user_id', userId).catch(()=>{});
                setStats({ coins: nc });
                setShowHabitChecklist(true);
                return s;
              }
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  function skipStep() {
    clearInterval(rTimer.current); setRRunning(false);
    const steps = getSteps(routine);
    if (!steps) return;
    if (rStep + 1 < steps.length) {
      const n = rStep + 1; setRStep(n); setRSecs(steps[n].duration * 60);
    } else {
      toast?.('🎉 Routine complete! +20 🪙');
      recordRoutineCompletion(routine);
      const nc = coins + 20;
      supabase.from('user_stats').update({ coins: nc }).eq('user_id', userId).catch(()=>{});
      setStats({ coins: nc });
      setShowHabitChecklist(true);
    }
  }

  const activeSteps  = routine ? getSteps(routine) : [];
  const r            = routine ? DEFAULT_ROUTINES[routine] : null;
  const step         = activeSteps[rStep];
  const totalSecs    = step ? step.duration * 60 : 0;
  const elapsed      = totalSecs - rSecs;
  const prog         = totalSecs > 0 ? (elapsed / totalSecs) * 100 : 0;

  const assignedHabitObjects = routine
    ? getAssigned(routine).map(key => allHabits.find(h => h.key === key)).filter(Boolean)
    : [];

  return (
    <div style={{ padding:'22px 26px', maxWidth:860 }}>
      {!routine ? (
        <>
          <div style={{ fontFamily:'Instrument Serif,serif', fontSize:26, marginBottom:6, color:'#1a1a1a' }}>Your Routines</div>
          <p style={{ fontSize:14, color:'#888', marginBottom:22, lineHeight:1.6 }}>
            Guided step-by-step sessions with a built-in timer. Customise the steps, durations, and order for each routine. Add habits so you can mark them complete right after you finish.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
            {Object.entries(DEFAULT_ROUTINES).map(([k, r]) => {
              const steps       = getSteps(k);
              const todayCount  = getTodayRoutineCount(k);
              const freq        = getRoutineFreq(k);
              const pctDone     = Math.min(100, Math.round((todayCount / freq) * 100));
              const allDone     = todayCount >= freq;
              const assigned    = getAssigned(k);
              const assignedObjs = assigned.map(key => allHabits.find(h => h.key === key)).filter(Boolean);
              const totalMins   = steps.reduce((a, s) => a + s.duration, 0);
              const isCustomised = !!customSteps[k];

              return (
                <div key={k} style={{ background:'white', border:`1.5px solid ${allDone?'#8aad8a':'#e8e4de'}`, borderRadius:20, padding:22, transition:'all 0.2s', borderTop:`3px solid ${r.color}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div style={{ fontSize:28 }}>{r.icon}</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      {allDone && <div style={{ fontSize:11, fontWeight:700, color:'#5a7a5a', background:'#f3f8f3', border:'1px solid #b5ceb5', borderRadius:99, padding:'3px 10px' }}>✓ Done today</div>}
                      <button onClick={() => setEditorOpen(k)}
                        style={{ fontSize:11, color:'#888', background:'#f7f3ed', border:'1.5px solid #e8e4de', borderRadius:99, padding:'3px 10px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:600 }}>
                        ✏️ Edit {isCustomised ? '·  custom' : ''}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, marginBottom:4 }}>{r.label}</div>
                  <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>{totalMins} min · {steps.length} steps</div>

                  {/* Daily target */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, color:'#888', marginBottom:6 }}>Daily target</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      {[1,2,3].map(n => (
                        <button key={n} onClick={() => setRoutineFreq(k, n)}
                          style={{ width:32, height:32, borderRadius:8, border:`1.5px solid ${freq===n?r.color:'#e8e4de'}`, background:freq===n?r.color+'22':'white', color:freq===n?r.color:'#888', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.2s' }}>
                          {n}x
                        </button>
                      ))}
                      <div style={{ flex:1, marginLeft:4 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#888', marginBottom:3 }}>
                          <span>Today</span><span style={{ fontWeight:600, color:allDone?'#5a7a5a':'#888' }}>{todayCount}/{freq}</span>
                        </div>
                        <div style={{ height:5, background:'#e8e4de', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pctDone}%`, background:allDone?'#8aad8a':r.color, borderRadius:99, transition:'width 0.4s' }}/>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Steps preview */}
                  <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:14 }}>
                    {steps.map((s, i) => (
                      <div key={s.id || i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#555' }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:r.color, flexShrink:0 }}/>
                        <span style={{ flex:1 }}>{s.name}</span>
                        <span style={{ color:'#aaa', fontSize:11 }}>{s.duration}m</span>
                      </div>
                    ))}
                    {isCustomised && (
                      <button onClick={() => { saveSteps(k, DEFAULT_ROUTINES[k].steps); toast?.('↩️ Reset to default'); }}
                        style={{ marginTop:4, fontSize:10, color:'#bbb', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0, textDecoration:'underline', fontFamily:'DM Sans,sans-serif' }}>
                        Reset to default
                      </button>
                    )}
                  </div>

                  {/* Linked habits */}
                  <div style={{ borderTop:'1px solid #f0ece6', paddingTop:12, marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, color:'#888' }}>
                        Linked habits {assignedObjs.length > 0 ? `(${assignedObjs.length})` : ''}
                      </div>
                      <button onClick={() => setPickerOpen(k)}
                        style={{ fontSize:11, color:r.color, background:'transparent', border:`1px solid ${r.color}30`, borderRadius:99, padding:'3px 10px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:600 }}>
                        + Add
                      </button>
                    </div>
                    {assignedObjs.length === 0 ? (
                      <div style={{ fontSize:11, color:'#bbb', fontStyle:'italic' }}>None yet — link habits so you can mark them after the routine finishes.</div>
                    ) : (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {assignedObjs.map(h => (
                          <div key={h.key} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'#f7f3ed', border:'1px solid #e8e4de', borderRadius:99, fontSize:11 }}>
                            <span>{h.emoji}</span><span style={{ color:'#555' }}>{h.name}</span>
                            <button onClick={e => { e.stopPropagation(); toggleHabitInRoutine(k, h.key); }}
                              style={{ fontSize:11, color:'#bbb', background:'transparent', border:'none', cursor:'pointer', padding:'0 0 0 2px', lineHeight:1 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => startRoutine(k)}
                    style={{ width:'100%', padding:10, background:r.color, color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                    {todayCount > 0 ? `Start again (${todayCount} done)` : `Start ${r.label} →`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Recent completions */}
          {Object.keys(routineLog).length > 0 && (
            <div style={{ marginTop:24, background:'white', border:'1.5px solid #e8e4de', borderRadius:20, padding:20 }}>
              <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'1.2px', color:'#888', marginBottom:14 }}>Recent completions</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {Object.entries(routineLog).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,10).map(([k,v]) => {
                  const parts = k.split('_');
                  const dateStr = parts[parts.length - 1];
                  const routineKey = parts.slice(0,-1).join('_');
                  const rd = DEFAULT_ROUTINES[routineKey];
                  if (!rd) return null;
                  return (
                    <div key={k} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#f7f3ed', borderRadius:12, border:'1px solid #e8e4de' }}>
                      <span style={{ fontSize:20 }}>{rd.icon}</span>
                      <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{rd.label}</div><div style={{ fontSize:11, color:'#888' }}>{dateStr}</div></div>
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'#5a7a5a' }}>{v}x</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step editor modal */}
          {editorOpen && (
            <StepEditorModal
              routineKey={editorOpen}
              steps={getSteps(editorOpen)}
              color={DEFAULT_ROUTINES[editorOpen].color}
              label={DEFAULT_ROUTINES[editorOpen].label}
              icon={DEFAULT_ROUTINES[editorOpen].icon}
              allHabits={allHabits}
              onSave={(steps) => saveSteps(editorOpen, steps)}
              onClose={() => setEditorOpen(null)}
            />
          )}

          {/* Habit picker modal */}
          {pickerOpen && (
            <div onClick={() => setPickerOpen(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:16 }}>
              <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:24, padding:26, width:480, maxWidth:'95vw', maxHeight:'80vh', overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <h3 style={{ fontFamily:'Instrument Serif,serif', fontSize:20 }}>{DEFAULT_ROUTINES[pickerOpen].icon} {DEFAULT_ROUTINES[pickerOpen].label}</h3>
                  <button onClick={() => setPickerOpen(null)} style={{ width:30, height:30, borderRadius:'50%', border:'1.5px solid #e8e4de', background:'transparent', cursor:'pointer', fontSize:14 }}>✕</button>
                </div>
                <p style={{ fontSize:12, color:'#888', marginBottom:18 }}>Habits you link here will appear as a checklist when you finish this routine.</p>
                {allHabits.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'24px 0', color:'#aaa', fontSize:13 }}>No habits in your program yet.</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {allHabits.map(h => {
                      const isIn = getAssigned(pickerOpen).includes(h.key);
                      return (
                        <div key={h.key} onClick={() => toggleHabitInRoutine(pickerOpen, h.key)}
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:13, border:`1.5px solid ${isIn?'#8aad8a':'#e8e4de'}`, background:isIn?'#f3f8f3':'white', cursor:'pointer', transition:'all 0.15s' }}>
                          <span style={{ fontSize:22 }}>{h.emoji}</span>
                          <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{h.name}</div>{h.time && <div style={{ fontSize:10, color:'#aaa', marginTop:1 }}>{h.time}</div>}</div>
                          <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${isIn?'#8aad8a':'#e8e4de'}`, background:isIn?'#8aad8a':'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'white', flexShrink:0 }}>
                            {isIn && '✓'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => setPickerOpen(null)} style={{ width:'100%', marginTop:18, padding:12, background:'#1a2e1a', color:'white', border:'none', borderRadius:12, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>Done</button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Active routine timer ── */
        <div>
          <button onClick={() => { setRoutine(null); clearInterval(rTimer.current); setRRunning(false); setShowHabitChecklist(false); }}
            style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:13, color:'#888', marginBottom:20, display:'flex', alignItems:'center', gap:6, fontFamily:'DM Sans,sans-serif' }}>
            ← Back to routines
          </button>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, alignItems:'start' }} className="routine-grid">
            {/* Timer panel */}
            <div style={{ background:'#1a1a16', borderRadius:24, padding:32, textAlign:'center', color:'white' }}>
              <div style={{ fontSize:11, color:'#444', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:6 }}>{r?.label}</div>
              {showHabitChecklist ? (
                <>
                  <div style={{ fontSize:32, marginBottom:10 }}>🎉</div>
                  <div style={{ fontFamily:'Instrument Serif,serif', fontSize:22, color:'#e8e0d0', marginBottom:4 }}>Routine complete!</div>
                  <div style={{ fontSize:12, color:'#555', marginBottom:20 }}>+20 🪙 earned</div>
                  <button onClick={() => { setRoutine(null); setShowHabitChecklist(false); }}
                    style={{ padding:'11px 26px', background:r?.color, color:'white', border:'none', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                    Back to routines
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, color:'#e8e0d0', marginBottom:4 }}>{step?.name}</div>
                  <div style={{ fontSize:11, color:'#555', marginBottom:22 }}>Step {rStep+1} of {activeSteps.length}</div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:68, fontWeight:700, letterSpacing:-3, color:'white', marginBottom:6 }}>{fmt(rSecs)}</div>
                  <div style={{ height:5, background:'rgba(255,255,255,0.08)', borderRadius:99, marginBottom:24, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${prog}%`, background:r?.color, borderRadius:99, transition:'width 1s linear' }}/>
                  </div>
                  <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                    <button onClick={toggleTimer}
                      style={{ padding:'11px 26px', background:r?.color, color:'white', border:'none', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                      {rRunning ? '⏸ Pause' : '▶ Start'}
                    </button>
                    <button onClick={skipStep}
                      style={{ padding:'11px 18px', background:'rgba(255,255,255,0.06)', color:'#888', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, fontSize:13, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                      Skip →
                    </button>
                  </div>
                  <div style={{ marginTop:20, fontSize:12, color:'#444' }}>
                    Completed today: <strong style={{ color:'#7ac47a' }}>{getTodayRoutineCount(routine)}x</strong> / {getRoutineFreq(routine)}x target
                  </div>
                </>
              )}
            </div>

            {/* Right panel: steps + habit checklist */}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ background:'white', border:'1.5px solid #e8e4de', borderRadius:20, padding:20 }}>
                <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'1.2px', color:'#888', marginBottom:14 }}>Steps</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {activeSteps.map((s, i) => (
                    <div key={s.id || i}
                      onClick={() => { if (!showHabitChecklist) { clearInterval(rTimer.current); setRRunning(false); setRStep(i); setRSecs(activeSteps[i].duration * 60); }}}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:i===rStep?'#f3f8f3':'#f7f3ed', border:`1.5px solid ${i===rStep?'#8aad8a':'#e8e4de'}`, cursor:'pointer', transition:'all 0.2s', opacity:showHabitChecklist?0.5:1 }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:i<rStep||showHabitChecklist?'#8aad8a':i===rStep?r?.color:'#e8e4de', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:i<=rStep||showHabitChecklist?'white':'#888', fontWeight:700, flexShrink:0 }}>
                        {i < rStep || showHabitChecklist ? '✓' : i + 1}
                      </div>
                      <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{s.name}</div><div style={{ fontSize:11, color:'#888' }}>{s.duration} min</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <PostRoutineChecklist
                routineKey={routine}
                assignedHabits={assignedHabitObjects}
                onDone={() => { setRoutine(null); setShowHabitChecklist(false); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
