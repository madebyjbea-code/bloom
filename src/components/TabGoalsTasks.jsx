'use client';

// ─────────────────────────────────────────────────────────────────────────────
// TabGoalsTasks.jsx   (REWRITE — goal/is_habit state model)
// Drop into: src/components/TabGoalsTasks.jsx
//
// Requires one new prop from Dashboard.jsx: `allHabits` (the same combined
// baseHabits+customHabits list already computed there) — needed for
// grandfathering, since habit metadata (name/emoji/category) only exists in
// that JS catalog, not in Supabase. Update the routing line to:
//   <TabGoalsTasks userId={userId} toast={toast} allHabits={allHabits}/>
//
// A goal is now ONE thing moving between two states over its life:
//   state='goal'      → being proven, weekly progress from goal_logs
//   state='is_habit'  → established — the REAL habit toggle elsewhere in the
//                        app is how you interact with it now; this screen
//                        just reflects that habit's weekly progress
// Falling off (linked habit's streak breaks) flips it back to 'goal'
// automatically — handled by checkAndProcessGoals, surfaced here gently.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import {
  getGoals, getTasks, createGoal, createTask, logGoalInstance, logTaskInstance,
  getGoalWeekCount, getHabitWeekCount, getTaskDistinctCount, checkAndProcessGoals,
  submitGoalReflection, increaseGoalTarget, grandfatherExistingHabits, getWeekStart,
  SUGGESTED_HABITS_TO_BUILD,
} from '../lib/goalsTasks';


const SUGGESTED_TASKS = {
  optimizer: [{ name: 'Try 2 different workout styles', emoji: '🏋️', category: 'movement', target_count: 2, days: 14, why: 'Cross-training variety reduces plateau risk and overuse injury.' }],
  scattered: [{ name: 'Try 2 focus techniques', emoji: '🧠', category: 'mindfulness', target_count: 2, days: 14, why: 'Different focus techniques suit different tasks.' }],
  default: [
    { name: 'Try 2 different forms of movement', emoji: '🏃', category: 'movement', target_count: 2, days: 14, why: 'Trying variations helps you find movement you actually enjoy, which predicts long-term adherence.' },
    { name: 'Try 2 relaxation methods', emoji: '🧘', category: 'mindfulness', target_count: 2, days: 14, why: 'Not every relaxation method works for every nervous system.' },
  ],
};

const CARD = { background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 18 };
const LABEL = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 14 };

function daysUntil(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return '1 day left';
  return `${diff} days left`;
}

export default function TabGoalsTasks({ userId, toast, allHabits }) {
  const archetypeKey = useStore(s => s.archetypeKey) || 'default';
  const addCustomHabit = useStore(s => s.addCustomHabit);

  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [weekCounts, setWeekCounts] = useState({});     // goal-state goals: goalId -> goal_logs count
  const [habitWeekCounts, setHabitWeekCounts] = useState({}); // is_habit-state goals: goalId -> habit_completions count
  const [taskCounts, setTaskCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [grandfathering, setGrandfathering] = useState(false);

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', weekly_target: 3, due_date: '' });
  const [newTask, setNewTask] = useState({ name: '', target_count: 2, due_date: '' });
  const [taskEntryDrafts, setTaskEntryDrafts] = useState({});
  const [pushForMoreId, setPushForMoreId] = useState(null); // goal id currently showing the "push for more" input
  const [pushTarget, setPushTarget] = useState('');

  const [reflectionQueue, setReflectionQueue] = useState([]);
  const [reflectionDrafts, setReflectionDrafts] = useState({});
  const [celebration, setCelebration] = useState(null);
  const [fellOffQueue, setFellOffQueue] = useState([]);

  const suggestedGoals = SUGGESTED_HABITS_TO_BUILD[archetypeKey] || SUGGESTED_HABITS_TO_BUILD.default;
  const suggestedTasks = SUGGESTED_TASKS[archetypeKey] || SUGGESTED_TASKS.default;

  useEffect(() => { if (userId) loadAll(); }, [userId]);

  async function loadAll() {
    setLoading(true);
    const processed = await checkAndProcessGoals(userId);
    const needsReflection = [];
    const felloff = [];
    for (const p of processed) {
      for (const wk of p.weeksEvaluated) {
        if (!wk) continue; // defensive — shouldn't happen after the goalsTasks.ts fix, but never crash on it
        if (wk.reflection_prompted && !wk.reflection_response) needsReflection.push(wk);
      }
      if (p.graduation) {
        if (p.graduation.habitToCreate) addCustomHabit(p.graduation.habitToCreate);
        setCelebration(p.graduation);
      }
      if (p.fellOff) felloff.push(p.fellOff);
    }
    if (needsReflection.length > 0) setReflectionQueue(needsReflection);
    if (felloff.length > 0) setFellOffQueue(felloff);

    const [g, t] = await Promise.all([getGoals(userId), getTasks(userId)]);
    setGoals(g); setTasks(t);

    const weekStart = getWeekStart();
    const wc = {}; const hwc = {};
    for (const goal of g) {
      if (goal.state === 'is_habit' && goal.linked_habit_key) {
        hwc[goal.id] = await getHabitWeekCount(goal.linked_habit_key, userId, weekStart);
      } else {
        wc[goal.id] = await getGoalWeekCount(goal.id, weekStart);
      }
    }
    setWeekCounts(wc); setHabitWeekCounts(hwc);

    const tc = {};
    for (const task of t) tc[task.id] = await getTaskDistinctCount(task.id);
    setTaskCounts(tc);

    setLoading(false);
  }

  async function handleImportHabits() {
    setGrandfathering(true);
    const count = await grandfatherExistingHabits(userId, allHabits || []);
    setGrandfathering(false);
    if (count > 0) { toast(`🌟 Imported ${count} existing habit${count > 1 ? 's' : ''}`); loadAll(); }
    else toast('Nothing new to import — already up to date');
  }

  async function adoptSuggestedGoal(sg) {
    const goal = await createGoal(userId, { name: sg.name, emoji: sg.emoji, category: sg.category, weekly_target: sg.weekly_target, is_custom: false });
    if (goal) { setGoals(prev => [...prev, goal]); setWeekCounts(prev => ({ ...prev, [goal.id]: 0 })); toast(`🎯 ${sg.name} added`); }
  }
  async function adoptSuggestedTask(st) {
    const due = new Date(); due.setDate(due.getDate() + st.days);
    const task = await createTask(userId, { name: st.name, emoji: st.emoji, category: st.category, target_count: st.target_count, due_date: due.toISOString().split('T')[0], is_custom: false });
    if (task) { setTasks(prev => [...prev, task]); setTaskCounts(prev => ({ ...prev, [task.id]: 0 })); toast(`📌 ${st.name} added`); }
  }
  async function submitCustomGoal() {
    if (!newGoal.name.trim()) return;
    const goal = await createGoal(userId, { name: newGoal.name.trim(), weekly_target: Number(newGoal.weekly_target) || 1, due_date: newGoal.due_date || null, emoji: '🎯' });
    if (goal) { setGoals(prev => [...prev, goal]); setWeekCounts(prev => ({ ...prev, [goal.id]: 0 })); toast(`🎯 ${goal.name} added`); setNewGoal({ name: '', weekly_target: 3, due_date: '' }); setShowGoalForm(false); }
  }
  async function submitCustomTask() {
    if (!newTask.name.trim() || !newTask.due_date) return;
    const task = await createTask(userId, { name: newTask.name.trim(), target_count: Number(newTask.target_count) || 1, due_date: newTask.due_date, emoji: '📌' });
    if (task) { setTasks(prev => [...prev, task]); setTaskCounts(prev => ({ ...prev, [task.id]: 0 })); toast(`📌 ${task.name} added`); setNewTask({ name: '', target_count: 2, due_date: '' }); setShowTaskForm(false); }
  }

  async function logGoal(goal) {
    const ok = await logGoalInstance(goal.id, userId);
    if (ok) { setWeekCounts(prev => ({ ...prev, [goal.id]: (prev[goal.id] || 0) + 1 })); toast(`✓ ${goal.name} logged`); }
  }
  async function logTask(task) {
    const label = (taskEntryDrafts[task.id] || '').trim();
    if (!label) { toast('Add what you tried first'); return; }
    const ok = await logTaskInstance(task.id, userId, label);
    if (ok) {
      const newCount = await getTaskDistinctCount(task.id);
      setTaskCounts(prev => ({ ...prev, [task.id]: newCount }));
      setTaskEntryDrafts(prev => ({ ...prev, [task.id]: '' }));
      toast(newCount >= task.target_count ? `🎉 ${task.name} complete!` : `✓ "${label}" logged`);
      if (newCount >= task.target_count) setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed' } : t));
    }
  }

  async function handleReflectionSubmit(wk, skip) {
    if (!skip) await submitGoalReflection(wk.id, reflectionDrafts[wk.id] || '');
    setReflectionQueue(prev => prev.filter(r => r.id !== wk.id));
  }

  async function handlePushForMore(goal) {
    const target = Number(pushTarget);
    if (!target || target <= goal.weekly_target) { toast('Set a higher number than the current target'); return; }
    const ok = await increaseGoalTarget(goal.id, target);
    if (ok) { toast(`🎯 New target set — proving it again at ${target}x/week`); setPushForMoreId(null); setPushTarget(''); loadAll(); }
  }

  async function releaseHabit(goalId) {
    // Soft delete: mark goal as archived/completed rather than truly deleting
    try {
      const { error } = await supabase
        .from('goals')
        .update({ status: 'archived' })
        .eq('id', goalId);
      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== goalId));
      toast('✓ Habit released — no pressure to re-prove it');
      setFellOffQueue(prev => prev.filter(f => f.goal.id !== goalId));
    } catch (err) {
      console.error('Error releasing habit:', err);
      toast('Could not release habit — try again');
    }
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  const activeTasks = tasks.filter(t => t.status === 'active');
  const provenHabitsAvailable = (allHabits || []).length > 0;

  return (
    <div style={{ padding: '22px 26px', maxWidth: 800, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, fontWeight: 400, color: '#1a1a16', marginBottom: 4 }}>Goals & Tasks 🎯</h2>
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>Prove a goal consistently and it becomes a real habit. Tasks are quick experiments.</p>
        {provenHabitsAvailable && (
          <button onClick={handleImportHabits} disabled={grandfathering}
            style={{ marginTop: 8, background: 'none', border: 'none', fontSize: 11, color: '#8aad8a', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'DM Sans,sans-serif' }}>
            {grandfathering ? 'Importing…' : 'Already have habits going? Import them →'}
          </button>
        )}
      </div>

      {/* ── Graduation celebration ─────────────────────────────────────────── */}
      {celebration && (
        <div style={{ ...CARD, background: 'linear-gradient(135deg,#fdf3e0,#f7f3ed)', border: '1.5px solid #d4af6a', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, marginBottom: 6 }}>Set in stone</div>
          <p style={{ fontSize: 13, color: '#7a6040', marginBottom: 14, lineHeight: 1.6 }}>
            "{celebration.goal.name}" is now a real habit — {celebration.goal.graduation_threshold || 6} weeks running.
          </p>
          <button onClick={() => setCelebration(null)} style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: '#d4af6a', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Nice ✓</button>
        </div>
      )}

      {/* ── Fell off — gentle, dismissible with release option ─────────────── */}
      {fellOffQueue.map(f => (
        <div key={f.goal.id} style={{ ...CARD, background: '#f7f3ed', border: '1.5px solid #e8e4de' }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>🌱 {f.goal.name} slipped — totally normal. Rebuild the streak or release it for now?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setFellOffQueue(prev => prev.filter(x => x.goal.id !== f.goal.id))} style={{ flex: 1, fontSize: 11, color: 'white', background: '#8aad8a', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>Rebuild Streak →</button>
            <button onClick={() => releaseHabit(f.goal.id)} style={{ flex: 1, fontSize: 11, color: '#8aad8a', background: '#f0f7f0', border: '1.5px solid #8aad8a', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>Release for Now</button>
          </div>
        </div>
      ))}

      {/* ── Reflection prompts (non-blocking) ─────────────────────────────── */}
      {reflectionQueue.map(wk => {
        const goal = goals.find(g => g.id === wk.goal_id);
        return (
          <div key={wk.id} style={{ ...CARD, background: '#f7f3ed', border: '1.5px solid #d4af6a' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9a7a2a', marginBottom: 6 }}>
              {goal?.name || 'Your goal'} · {wk.achieved_count}/{wk.target} this week — still counts toward your streak 🌱
            </div>
            <p style={{ fontSize: 12, color: '#8a7550', marginBottom: 10 }}>No pressure — just curious what the week looked like, if you feel like sharing.</p>
            <textarea value={reflectionDrafts[wk.id] || ''} onChange={e => setReflectionDrafts(prev => ({ ...prev, [wk.id]: e.target.value }))}
              placeholder="What got in the way, or what worked?" rows={2}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e8d4b0', fontSize: 13, fontFamily: 'DM Sans,sans-serif', marginBottom: 10, boxSizing: 'border-box', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleReflectionSubmit(wk, false)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#d4af6a', color: 'white', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Share</button>
              <button onClick={() => handleReflectionSubmit(wk, true)} style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px solid #e8d4b0', background: 'white', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Skip</button>
            </div>
          </div>
        );
      })}

      {/* ── Goals ──────────────────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ ...LABEL, marginBottom: 0 }}>Goals</div>
          <button onClick={() => setShowGoalForm(s => !s)} style={{ fontSize: 11, color: '#5a7a5a', background: '#f0f7f0', border: '1px solid #b5ceb5', borderRadius: 99, padding: '5px 12px', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 600 }}>+ Custom</button>
        </div>

        {showGoalForm && (
          <div style={{ marginBottom: 16, padding: 14, background: '#f7f3ed', borderRadius: 12 }}>
            <input value={newGoal.name} onChange={e => setNewGoal(g => ({ ...g, name: e.target.value }))} placeholder="e.g. 30 min cardio"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #e8e4de', fontSize: 13, marginBottom: 8, boxSizing: 'border-box', fontFamily: 'DM Sans,sans-serif' }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: '#888' }}>Times per week</label>
                <input type="number" min={1} max={14} value={newGoal.weekly_target} onChange={e => setNewGoal(g => ({ ...g, weekly_target: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: '1.5px solid #e8e4de', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: '#888' }}>Target date (optional)</label>
                <input type="date" value={newGoal.due_date} onChange={e => setNewGoal(g => ({ ...g, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: '1.5px solid #e8e4de', fontSize: 12, boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={submitCustomGoal} style={{ width: '100%', padding: 10, borderRadius: 9, border: 'none', background: '#5a7a5a', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Add Goal</button>
          </div>
        )}

        {activeGoals.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {suggestedGoals.map(sg => (
              <button key={sg.name} onClick={() => adoptSuggestedGoal(sg)} title={sg.why}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#f0f7f0', border: '1.5px solid #b5ceb5', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#3a6a3a', fontFamily: 'DM Sans,sans-serif' }}>
                {sg.emoji} {sg.name} · {sg.weekly_target}x/wk
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: activeGoals.length > 0 ? 0 : 12 }}>
          {activeGoals.map(goal => {
            const isHabit = goal.state === 'is_habit';
            const count = isHabit ? (habitWeekCounts[goal.id] || 0) : (weekCounts[goal.id] || 0);
            const pct = Math.min(100, Math.round((count / goal.weekly_target) * 100));
            return (
              <div key={goal.id} style={{ border: `1.5px solid ${isHabit ? '#d4af6a' : '#e8e4de'}`, borderRadius: 13, padding: '12px 14px', background: isHabit ? '#fdfaf3' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{goal.emoji} {goal.name}</div>
                  {isHabit ? (
                    <div style={{ fontSize: 11, color: '#d4af6a', fontWeight: 600 }}>🌟 Established</div>
                  ) : goal.consecutive_weeks_hit > 0 ? (
                    <div style={{ fontSize: 11, color: '#8aad8a', fontWeight: 600 }}>🔥 {goal.consecutive_weeks_hit}/{goal.graduation_threshold} wks</div>
                  ) : null}
                </div>
                <div style={{ height: 7, background: '#f0ede8', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: isHabit ? 'linear-gradient(90deg,#e8c890,#d4af6a)' : 'linear-gradient(90deg,#8aad8a,#5a7a5a)', borderRadius: 99, transition: 'width 0.4s' }} />
                </div>

                {isHabit ? (
                  <div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: pushForMoreId === goal.id ? 8 : 0 }}>
                      {count} of {goal.weekly_target} this week · tracked via your daily habit
                    </div>
                    {pushForMoreId === goal.id ? (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input type="number" min={goal.weekly_target + 1} max={14} value={pushTarget} onChange={e => setPushTarget(e.target.value)} placeholder={`>${goal.weekly_target}`}
                          style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e8e4de', fontSize: 12 }} />
                        <button onClick={() => handlePushForMore(goal)} style={{ fontSize: 11, fontWeight: 600, color: 'white', background: '#d4af6a', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Set</button>
                        <button onClick={() => setPushForMoreId(null)} style={{ fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setPushForMoreId(goal.id)} style={{ marginTop: 6, fontSize: 11, color: '#9a7a2a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'DM Sans,sans-serif' }}>Push for more →</button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#888' }}>{count} of {goal.weekly_target} this week{goal.due_date ? ` · target ${goal.due_date}` : ''}</span>
                    <button onClick={() => logGoal(goal)} style={{ fontSize: 11, fontWeight: 600, color: 'white', background: '#5a7a5a', border: 'none', borderRadius: 99, padding: '6px 14px', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>+ Log one</button>
                  </div>
                )}
              </div>
            );
          })}
          {activeGoals.length === 0 && !showGoalForm && <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', textAlign: 'center', margin: '8px 0 0' }}>Pick a suggestion above, or add your own.</p>}
        </div>
      </div>

      {/* ── Tasks ──────────────────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ ...LABEL, marginBottom: 0 }}>Tasks</div>
          <button onClick={() => setShowTaskForm(s => !s)} style={{ fontSize: 11, color: '#5a7a5a', background: '#f0f7f0', border: '1px solid #b5ceb5', borderRadius: 99, padding: '5px 12px', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 600 }}>+ Custom</button>
        </div>

        {showTaskForm && (
          <div style={{ marginBottom: 16, padding: 14, background: '#f7f3ed', borderRadius: 12 }}>
            <input value={newTask.name} onChange={e => setNewTask(t => ({ ...t, name: e.target.value }))} placeholder="e.g. Try 2 different forms of movement"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #e8e4de', fontSize: 13, marginBottom: 8, boxSizing: 'border-box', fontFamily: 'DM Sans,sans-serif' }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: '#888' }}>How many distinct?</label>
                <input type="number" min={1} max={10} value={newTask.target_count} onChange={e => setNewTask(t => ({ ...t, target_count: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: '1.5px solid #e8e4de', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: '#888' }}>Due date</label>
                <input type="date" value={newTask.due_date} onChange={e => setNewTask(t => ({ ...t, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: '1.5px solid #e8e4de', fontSize: 12, boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={submitCustomTask} style={{ width: '100%', padding: 10, borderRadius: 9, border: 'none', background: '#5a7a5a', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Add Task</button>
          </div>
        )}

        {activeTasks.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {suggestedTasks.map(st => (
              <button key={st.name} onClick={() => adoptSuggestedTask(st)} title={st.why}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fdf8ed', border: '1.5px solid #d4af6a', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#9a7a2a', fontFamily: 'DM Sans,sans-serif' }}>
                {st.emoji} {st.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: activeTasks.length > 0 ? 0 : 12 }}>
          {activeTasks.map(task => {
            const count = taskCounts[task.id] || 0;
            return (
              <div key={task.id} style={{ border: '1.5px solid #e8e4de', borderRadius: 13, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{task.emoji} {task.name}</div>
                  <div style={{ fontSize: 11, color: daysUntil(task.due_date) === 'overdue' ? '#c47a2a' : '#888' }}>{daysUntil(task.due_date)}</div>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{count} of {task.target_count} tried</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={taskEntryDrafts[task.id] || ''} onChange={e => setTaskEntryDrafts(prev => ({ ...prev, [task.id]: e.target.value }))}
                    placeholder="What did you try?" onKeyDown={e => e.key === 'Enter' && logTask(task)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e8e4de', fontSize: 12, fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }} />
                  <button onClick={() => logTask(task)} style={{ fontSize: 11, fontWeight: 600, color: 'white', background: '#d4af6a', border: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Log</button>
                </div>
              </div>
            );
          })}
          {activeTasks.length === 0 && !showTaskForm && <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', textAlign: 'center', margin: '8px 0 0' }}>Pick a suggestion above, or add your own.</p>}
        </div>
      </div>

      {loading && <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center' }}>Loading…</p>}
    </div>
  );
}
