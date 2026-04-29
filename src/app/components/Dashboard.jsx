'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getHabitsForUser, getCurrentWeek, getDayOfWeek, ARCHETYPE_INFO } from '../lib/springProgram';
import { useStore } from '../lib/store';
import CommunityFeed from './CommunityFeed';
import ProgressStats from './ProgressStats';
import CustomHabitModal from './CustomHabitModal';
import FeedbackModal from './FeedbackModal';
import TabRoadmap from './TabRoadmap';

const ROUTINES = {
  morning: {
    label: 'Morning Routine', icon: '🌅', color: '#d4a84a',
    steps: [
      { name: 'Wake & hydrate', duration: 5 },
      { name: 'Morning light outside', duration: 10 },
      { name: 'Breathwork or meditation', duration: 10 },
      { name: 'Protein breakfast', duration: 15 },
      { name: 'Review today\'s habits', duration: 5 },
    ],
  },
  focus: {
    label: 'Deep Focus', icon: '⏱', color: '#7a9e7e',
    steps: [
      { name: 'Clear your space', duration: 5 },
      { name: 'Deep work block', duration: 25 },
      { name: 'Short break — move', duration: 5 },
      { name: 'Deep work block', duration: 25 },
      { name: 'Rest & reflect', duration: 5 },
    ],
  },
  winddown: {
    label: 'Wind-Down', icon: '🌙', color: '#8a7a9e',
    steps: [
      { name: 'Phone away', duration: 2 },
      { name: 'Light stretching', duration: 10 },
      { name: 'Journalling or reading', duration: 15 },
      { name: 'Breathwork', duration: 5 },
      { name: 'Lights off', duration: 3 },
    ],
  },
  movement: {
    label: 'Movement Block', icon: '🏃', color: '#c4a882',
    steps: [
      { name: 'Warm-up', duration: 5 },
      { name: 'Main workout', duration: 30 },
      { name: 'Cool-down & stretch', duration: 10 },
    ],
  },
};

const SHOP_ITEMS = [
  { key: 'crown',    name: 'Tiny Crown',    icon: '👑', cost: 200, ge: 0 },
  { key: 'scarf',    name: 'Cozy Scarf',    icon: '🧣', cost: 150, ge: 0 },
  { key: 'flowers',  name: 'Flower Garden', icon: '🌸', cost: 300, ge: 0 },
  { key: 'star',     name: 'Starry BG',     icon: '✨', cost: 500, ge: 0 },
  { key: 'hat',      name: 'Sun Hat',       icon: '☀️', cost: 250, ge: 0 },
  { key: 'glasses',  name: 'Round Glasses', icon: '👓', cost: 120, ge: 0 },
  { key: 'backpack', name: 'Tiny Backpack', icon: '🎒', cost: 180, ge: 0 },
  { key: 'bow',      name: 'Floral Bow',    icon: '🌼', cost: 90,  ge: 0 },
  { key: 'wings',    name: 'Green Wings',   icon: '🍃', cost: 0,   ge: 100 },
  { key: 'halo',     name: 'Earth Halo',    icon: '🌍', cost: 0,   ge: 200 },
  { key: 'leaf',     name: 'Leaf Crown',    icon: '🌿', cost: 0,   ge: 150 },
];

const NAV = [
  { key: 'dashboard', icon: '🌿', label: 'Dashboard' },
  { key: 'habits',    icon: '✅', label: 'Habits' },
  { key: 'routines',  icon: '⏱',  label: 'Routines' },
  { key: 'planner',   icon: '📅', label: 'Planner' },
  { key: 'planet',    icon: '🌍', label: 'Planet' },
  { key: 'community', icon: '👥', label: 'Community' },
  { key: 'roadmap',   icon: '🗺️',  label: 'Roadmap' },
];

// ── Paste your UUID from Supabase → users table → id column ──
const ADMIN_USER_ID = '3f5a0efe-6932-4821-b7fa-334a8f0bffc3';

function fmt(secs) {
  return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
}

function toast(msg) {
  const el = document.getElementById('bloom-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Extracted modals — OUTSIDE Dashboard to prevent remount on every keystroke ──

function ReflModal({ week, refl, setRefl, submitRefl }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div style={{background:'white',borderRadius:24,padding:28,width:520,maxWidth:'95vw',maxHeight:'85vh',overflowY:'auto'}}>
        <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:26,marginBottom:6}}>Week {week-1} Reflection ✨</h2>
        <p style={{fontSize:14,color:'#888',marginBottom:20}}>Take a moment before continuing to Week {week}</p>
        {[
          {k:'worked',l:'What worked well?',p:'Share what helped...'},
          {k:'challenging',l:'What was challenging?',p:'What obstacles did you face?'},
        ].map(f=>(
          <div key={f.k} style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,marginBottom:6,textTransform:'uppercase'}}>{f.l}</label>
            <textarea
              value={refl[f.k]}
              onChange={e=>setRefl(p=>({...p,[f.k]:e.target.value}))}
              placeholder={f.p}
              style={{width:'100%',padding:13,borderRadius:12,border:'1.5px solid #e8e4de',fontSize:14,fontFamily:'DM Sans,sans-serif',minHeight:90,resize:'vertical',outline:'none',color:'#2a2a2a',boxSizing:'border-box'}}
              onFocus={e=>e.target.style.borderColor='#8aad8a'}
              onBlur={e=>e.target.style.borderColor='#e8e4de'}
            />
          </div>
        ))}
        <label style={{display:'block',fontSize:11,fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Energy Level (1–5)</label>
        <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:20}}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} type="button" onClick={()=>setRefl(p=>({...p,energy:n}))}
              style={{width:44,height:44,borderRadius:'50%',border:`2px solid ${refl.energy===n?'#8aad8a':'#e8e4de'}`,background:refl.energy===n?'#f3f8f3':'white',cursor:'pointer',fontSize:14,fontWeight:600,color:refl.energy===n?'#8aad8a':'#888'}}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={submitRefl} disabled={!refl.worked||!refl.challenging}
          style={{width:'100%',padding:13,background:!refl.worked||!refl.challenging?'#ccc':'#8aad8a',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
          Continue to Week {week} →
        </button>
      </div>
    </div>
  );
}

const STATS_FIELDS = [
  {key:'sleep',      icon:'😴',label:'Sleep',      placeholder:'e.g. 7.5',  unit:'hrs',   type:'number',step:'0.5'},
  {key:'mindfulness',icon:'🧘',label:'Mindfulness',placeholder:'e.g. 20',   unit:'min',   type:'number',step:'1'},
  {key:'steps',      icon:'🚶',label:'Steps',      placeholder:'e.g. 8000', unit:'steps', type:'number',step:'100'},
  {key:'water',      icon:'💧',label:'Water',      placeholder:'e.g. 2.0',  unit:'litres',type:'number',step:'0.1'},
];

function StatsLogModal({ statsForm, setStatsForm, manualStats, setManualStats, setStatsLogOpen }) {
  function saveStats() {
    const today = new Date().toISOString().split('T')[0];
    const updated = {
      date: today,
      sleep:       statsForm.sleep       ? parseFloat(statsForm.sleep)     : manualStats.sleep,
      mindfulness: statsForm.mindfulness ? parseInt(statsForm.mindfulness) : manualStats.mindfulness,
      steps:       statsForm.steps       ? parseInt(statsForm.steps)       : manualStats.steps,
      water:       statsForm.water       ? parseFloat(statsForm.water)     : manualStats.water,
    };
    setManualStats(updated);
    localStorage.setItem('bloom-daily-stats', JSON.stringify(updated));
    setStatsForm({sleep:'',mindfulness:'',steps:'',water:''});
    setStatsLogOpen(false);
  }

  return (
    <div onClick={()=>setStatsLogOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:24,padding:28,width:420,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:22}}>Log today&apos;s stats</h2>
          <button onClick={()=>setStatsLogOpen(false)} style={{width:30,height:30,borderRadius:'50%',border:'1.5px solid #e8e4de',background:'transparent',cursor:'pointer',fontSize:15}}>✕</button>
        </div>
        <p style={{fontSize:13,color:'#888',marginBottom:20}}>Leave blank to keep today&apos;s existing value</p>
        <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:20}}>
          {STATS_FIELDS.map(f=>(
            <div key={f.key} style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:'#f7f3ed',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{f.icon}</div>
              <div style={{flex:1}}>
                <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,color:'#888',marginBottom:5}}>{f.label}</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input
                    type={f.type}
                    step={f.step}
                    value={statsForm[f.key]}
                    onChange={e=>setStatsForm(p=>({...p,[f.key]:e.target.value}))}
                    placeholder={manualStats[f.key] ? String(manualStats[f.key]) : f.placeholder}
                    style={{flex:1,padding:'9px 12px',border:'1.5px solid #e8e4de',borderRadius:10,fontSize:16,fontFamily:'DM Sans,sans-serif',outline:'none',color:'#2a2a2a'}}
                    onFocus={e=>e.target.style.borderColor='#8aad8a'}
                    onBlur={e=>e.target.style.borderColor='#e8e4de'}
                  />
                  <span style={{fontSize:12,color:'#aaa',flexShrink:0}}>{f.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={saveStats} style={{width:'100%',padding:13,background:'#8aad8a',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
          Save stats →
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab]               = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  );
  const [shopOpen, setShopOpen]     = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [reflOpen, setReflOpen]     = useState(false);
  const [refl, setRefl]             = useState({ worked:'', challenging:'', energy:3 });
  const [inventory, setInventory]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [week, setWeek]             = useState(1);
  const [day, setDay]               = useState(1);
  const [notifs, setNotifs]         = useState({ habits:true, community:true, streaks:true, reflection:false });
  const [customHabitOpen, setCustomHabitOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen]       = useState(false);
  const [statsLogOpen, setStatsLogOpen] = useState(false);
  const [manualStats, setManualStats] = useState(() => {
    try {
      const stored = localStorage.getItem('bloom-daily-stats');
      const parsed = stored ? JSON.parse(stored) : {};
      const today = new Date().toISOString().split('T')[0];
      return parsed.date === today ? parsed : { date: today };
    } catch { return { date: new Date().toISOString().split('T')[0] }; }
  });
  const [statsForm, setStatsForm] = useState({ sleep:'', mindfulness:'', steps:'', water:'' });

  const [routineFreqs, setRoutineFreqs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-routine-freqs') || '{}'); } catch { return {}; }
  });
  const [routineLog, setRoutineLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-routine-log') || '{}'); } catch { return {}; }
  });

  const [selectedDay, setSelectedDay] = useState(null);
  const [dayStats, setDayStats]       = useState(null);
  const [dayStatsLoading, setDayStatsLoading] = useState(false);
  const [streaks, setStreaks]         = useState({}); // { habit_key: { current_streak, longest_streak } }
  const [removedHabits, setRemovedHabits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-removed-habits') || '[]'); } catch { return []; }
  });

  const [routine, setRoutine]   = useState(null);
  const [rStep, setRStep]       = useState(0);
  const [rSecs, setRSecs]       = useState(0);
  const [rRunning, setRRunning] = useState(false);
  const rTimer                  = useRef(null);

  const userId        = useStore(s=>s.userId);
  const name          = useStore(s=>s.name);
  const archetypeKey  = useStore(s=>s.archetypeKey);
  const archetypeName = useStore(s=>s.archetypeName);
  const archetypeIcon = useStore(s=>s.archetypeIcon);
  const chronotype    = useStore(s=>s.chronotype);
  const lvl           = useStore(s=>s.lifestyleLevel);
  const avEmoji       = useStore(s=>s.avatarEmoji);
  const avName        = useStore(s=>s.avatarName);
  const health        = useStore(s=>s.health);
  const coins         = useStore(s=>s.coins);
  const ge            = useStore(s=>s.greenEnergy);
  const level         = useStore(s=>s.level);
  const habits        = useStore(s=>s.habits);
  const done          = useStore(s=>s.completedToday);
  const setStats      = useStore(s=>s.setStats);
  const setHabits     = useStore(s=>s.setHabits);
  const toggleH       = useStore(s=>s.toggleHabit);
  const customHabits  = useStore(s=>s.customHabits);
  const checkDailyReset = useStore(s=>s.checkDailyReset);

  const arch = (archetypeKey && ARCHETYPE_INFO[archetypeKey])
    ? ARCHETYPE_INFO[archetypeKey]
    : { name: archetypeName||'Spring Wellness Program', icon: archetypeIcon||'🌿' };

  const lvMap = { foundation:'Foundation', building:'Building', optimization:'Optimisation' };
  function removeHabit(habitKey){
    const updated=[...removedHabits, habitKey];
    setRemovedHabits(updated);
    localStorage.setItem('bloom-removed-habits', JSON.stringify(updated));
    toast('↩️ Habit removed — add a custom one instead');
  }

  function restoreHabit(habitKey){
    const updated=removedHabits.filter(k=>k!==habitKey);
    setRemovedHabits(updated);
    localStorage.setItem('bloom-removed-habits', JSON.stringify(updated));
    toast('✅ Habit restored');
  }

  const allHabits = [...habits.filter(h=>!removedHabits.includes(h.key)), ...customHabits];
  const pct = allHabits.length>0 ? Math.round((done.length/allHabits.length)*100) : 0;
  const mood = health>70 ? 'Thriving · Streak bonus 🔥' : health>40 ? 'Building momentum 💪' : 'Needs care 🌱';
  const equipped = inventory.find(i=>i.equipped);

  useEffect(()=>{
    checkDailyReset();
    if(userId){ load(); loadInv(); loadStreaks(); }
  },[userId]);

  async function load() {
    try {
      const {data:u} = await supabase.from('users').select('*').eq('id',userId).single();
      if(u){
        let sd = u.program_start_date;
        if(!sd){ sd=new Date().toISOString(); await supabase.from('users').update({program_start_date:sd}).eq('id',userId); }
        const w=getCurrentWeek(sd), d=getDayOfWeek(sd);
        setWeek(w); setDay(d);
        if(d===1&&w>1&&(u.current_week||1)<w){
          const {data:r}=await supabase.from('weekly_reflections').select('id').eq('user_id',userId).eq('week_number',w-1).single();
          if(!r) setReflOpen(true);
        }
        const src = archetypeKey||u.chronotype||'steadybuilder';
        setHabits(getHabitsForUser(src,w));
        if((u.current_week||1)!==w) await supabase.from('users').update({current_week:w}).eq('id',userId);
      }
      const {data:st}=await supabase.from('user_stats').select('*').eq('user_id',userId).single();
      if(st) setStats({health:st.health,coins:st.coins,greenEnergy:st.green_energy,level:st.level});
      const today=new Date().toISOString().split('T')[0];
      const {data:c}=await supabase.from('habit_completions').select('habit_key').eq('user_id',userId).eq('date',today);
      if(c) c.forEach(x=>{ if(!done.includes(x.habit_key)) toggleH(x.habit_key); });
      setLoading(false);
    } catch(e){ console.error(e); setLoading(false); }
  }

  function recordRoutineCompletion(key) {
    const today = new Date().toISOString().split('T')[0];
    const logKey = `${key}_${today}`;
    const current = routineLog[logKey] || 0;
    const updated = { ...routineLog, [logKey]: current + 1 };
    setRoutineLog(updated);
    localStorage.setItem('bloom-routine-log', JSON.stringify(updated));
  }

  function setRoutineFreq(key, freq) {
    const updated = { ...routineFreqs, [key]: freq };
    setRoutineFreqs(updated);
    localStorage.setItem('bloom-routine-freqs', JSON.stringify(updated));
  }

  function getTodayRoutineCount(key) {
    const today = new Date().toISOString().split('T')[0];
    return routineLog[`${key}_${today}`] || 0;
  }

  function getRoutineFreq(key) { return routineFreqs[key] || 1; }

  async function loadDayStats(dateStr) {
    setSelectedDay(dateStr);
    setDayStatsLoading(true);
    setDayStats(null);
    try {
      if (userId) {
        const { data: completions } = await supabase
          .from('habit_completions').select('habit_key').eq('user_id', userId).eq('date', dateStr);
        const keys = completions?.map(c => c.habit_key) || [];
        const completed = allHabits.filter(h => keys.includes(h.key));
        const totalCoins = completed.reduce((a, h) => a + h.coins, 0);
        const totalGE = completed.reduce((a, h) => a + h.ge, 0);
        const routineDone = Object.entries(routineLog)
          .filter(([k]) => k.endsWith(`_${dateStr}`))
          .map(([k, v]) => ({ key: k.replace(`_${dateStr}`, ''), count: v }));
        setDayStats({ date: dateStr, completed, totalCoins, totalGE, routineDone });
      } else {
        const today = new Date().toISOString().split('T')[0];
        if (dateStr === today) {
          const completed = allHabits.filter(h => done.includes(h.key));
          setDayStats({ date: dateStr, completed, totalCoins: completed.reduce((a,h)=>a+h.coins,0), totalGE: completed.reduce((a,h)=>a+h.ge,0), routineDone: [] });
        } else {
          setDayStats({ date: dateStr, completed: [], totalCoins: 0, totalGE: 0, routineDone: [] });
        }
      }
    } catch(e) { console.error(e); }
    setDayStatsLoading(false);
  }

  async function loadInv(){
    const {data}=await supabase.from('user_inventory').select('*').eq('user_id',userId);
    if(data) setInventory(data);
  }

  async function loadStreaks(){
    if(!userId) return;
    const {data}=await supabase.from('habit_streaks').select('*').eq('user_id',userId);
    if(data){
      const map={};
      data.forEach(s=>{ map[s.habit_key]=s; });
      setStreaks(map);
    }
  }

  async function updateStreak(habitKey, completing){
    if(!userId) return;
    const today=new Date().toISOString().split('T')[0];
    const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
    const existing=streaks[habitKey];

    if(completing){
      let newStreak=1;
      let longest=existing?.longest_streak||0;

      if(existing?.last_completed===yesterday){
        // Consecutive day — increment
        newStreak=(existing.current_streak||0)+1;
      } else if(existing?.last_completed===today){
        // Already completed today — don't change
        return;
      }
      // else missed a day — reset to 1

      longest=Math.max(longest, newStreak);

      await supabase.from('habit_streaks').upsert(
        { user_id:userId, habit_key:habitKey, current_streak:newStreak, longest_streak:longest, last_completed:today },
        { onConflict:'user_id,habit_key' }
      );
      setStreaks(prev=>({...prev,[habitKey]:{...prev[habitKey],current_streak:newStreak,longest_streak:longest,last_completed:today}}));

      // Milestone toasts
      if(newStreak===7)  toast(`🔥 7-day streak on ${habitKey.replace(/_/g,' ')}! Keep going!`);
      if(newStreak===14) toast(`⚡ 14-day streak! You're on fire!`);
      if(newStreak===21) toast(`🌟 21 days — this is now a habit!`);
      if(newStreak===30) toast(`🏆 30-day streak! Incredible!`);
    } else {
      // Unmarking — only reset if last_completed was today
      if(existing?.last_completed===today){
        const newStreak=Math.max(0,(existing.current_streak||1)-1);
        await supabase.from('habit_streaks').upsert(
          { user_id:userId, habit_key:habitKey, current_streak:newStreak, longest_streak:existing.longest_streak||0, last_completed:newStreak>0?yesterday:null },
          { onConflict:'user_id,habit_key' }
        );
        setStreaks(prev=>({...prev,[habitKey]:{...prev[habitKey],current_streak:newStreak}}));
      }
    }
  }

  async function toggleHabit(h){
    const isD=done.includes(h.key);
    toggleH(h.key);
    if(h.isCustom){
      if(!isD){
        const nc=coins+h.coins, ng=ge+h.ge, nh=Math.min(100,health+3);
        setStats({coins:nc,greenEnergy:ng,health:nh});
        if(userId) await supabase.from('user_stats').update({coins:nc,green_energy:ng,health:nh}).eq('user_id',userId);
        toast(`✅ +${h.coins} 🪙${h.ge>0?` +${h.ge} ⚡`:''}`);
      } else {
        const nc=Math.max(0,coins-h.coins), ng=Math.max(0,ge-h.ge), nh=Math.max(0,health-2);
        setStats({coins:nc,greenEnergy:ng,health:nh});
        if(userId) await supabase.from('user_stats').update({coins:nc,green_energy:ng,health:nh}).eq('user_id',userId);
        toast('↩️ Habit unmarked');
      }
      return;
    }
    const today=new Date().toISOString().split('T')[0];
    if(!isD){
      if(userId) await supabase.from('habit_completions').insert({user_id:userId,habit_key:h.key,date:today});
      const nc=coins+h.coins,ng=ge+h.ge,nh=Math.min(100,health+3);
      if(userId) await supabase.from('user_stats').update({coins:nc,green_energy:ng,health:nh}).eq('user_id',userId);
      setStats({coins:nc,greenEnergy:ng,health:nh});
      await updateStreak(h.key, true);
      toast(`✅ +${h.coins} 🪙${h.ge>0?` +${h.ge} ⚡`:''}`);
    } else {
      if(userId) await supabase.from('habit_completions').delete().eq('user_id',userId).eq('habit_key',h.key).eq('date',today);
      const nc=Math.max(0,coins-h.coins),ng=Math.max(0,ge-h.ge),nh=Math.max(0,health-2);
      if(userId) await supabase.from('user_stats').update({coins:nc,green_energy:ng,health:nh}).eq('user_id',userId);
      setStats({coins:nc,greenEnergy:ng,health:nh});
      await updateStreak(h.key, false);
      toast('↩️ Habit unmarked');
    }
  }

  async function buyItem(item){
    const isGE=item.ge>0;
    if(isGE&&ge<item.ge){toast('⚡ Not enough GE!');return;}
    if(!isGE&&coins<item.cost){toast('🪙 Not enough coins!');return;}
    if(inventory.some(i=>i.item_key===item.key)){toast('Already owned!');return;}
    if(isGE){const ng=ge-item.ge;await supabase.from('user_stats').update({green_energy:ng}).eq('user_id',userId);setStats({greenEnergy:ng});}
    else{const nc=coins-item.cost;await supabase.from('user_stats').update({coins:nc}).eq('user_id',userId);setStats({coins:nc});}
    await supabase.from('user_inventory').insert({user_id:userId,item_key:item.key,item_name:item.name});
    loadInv(); toast(`🛍 ${item.name} added!`);
  }

  async function equipItem(item){
    await supabase.from('user_inventory').update({equipped:false}).eq('user_id',userId);
    await supabase.from('user_inventory').update({equipped:true}).eq('user_id',userId).eq('item_key',item.item_key);
    loadInv(); toast(`✨ ${item.item_name} equipped!`);
  }

  async function donateGE(org,amt){
    if(ge<amt){toast('⚡ Not enough GE!');return;}
    const ng=ge-amt;
    await supabase.from('user_stats').update({green_energy:ng}).eq('user_id',userId);
    await supabase.from('green_donations').insert({user_id:userId,organization:org,amount_ge:amt});
    await supabase.from('community_posts').insert({user_id:userId,user_name:name,user_avatar_emoji:avEmoji,post_type:'donation',content:`Donated ${amt} GE to ${org} 🌍`});
    setStats({greenEnergy:ng}); toast(`🌍 Donated ${amt} GE to ${org}!`); setDonateOpen(false);
  }

  async function submitRefl(){
    const prev=week-1;
    await supabase.from('weekly_reflections').insert({user_id:userId,week_number:prev,what_worked:refl.worked,what_was_challenging:refl.challenging,energy_level:refl.energy});
    await supabase.from('users').update({current_week:week}).eq('id',userId);
    await supabase.from('community_posts').insert({user_id:userId,user_name:name,user_avatar_emoji:avEmoji,post_type:'week_complete',content:`Completed Week ${prev} of the Spring Wellness Program! 🌱`});
    setReflOpen(false); toast(`✨ Week ${prev} complete!`); load();
  }

  function startRoutine(key){
    setRoutine(key); setRStep(0); setRSecs(ROUTINES[key].steps[0].duration*60);
    setRRunning(false); clearInterval(rTimer.current); setTab('routines');
  }

  function toggleTimer(){
    if(rRunning){ clearInterval(rTimer.current); setRRunning(false); }
    else {
      setRRunning(true);
      rTimer.current=setInterval(()=>{
        setRSecs(prev=>{
          if(prev<=1){
            clearInterval(rTimer.current); setRRunning(false);
            setRStep(s=>{
              const r=ROUTINES[routine];
              if(!r) return s;
              if(s+1<r.steps.length){
                setTimeout(()=>setRSecs(r.steps[s+1].duration*60),50);
                toast(`✅ Next: ${r.steps[s+1].name}`);
                return s+1;
              } else {
                toast('🎉 Routine complete! +20 🪙');
                recordRoutineCompletion(routine);
                const nc=coins+20;
                supabase.from('user_stats').update({coins:nc}).eq('user_id',userId);
                setStats({coins:nc}); setRoutine(null); return s;
              }
            });
            return 0;
          }
          return prev-1;
        });
      },1000);
    }
  }

  function skipStep(){
    clearInterval(rTimer.current); setRRunning(false);
    const r=ROUTINES[routine]; if(!r) return;
    if(rStep+1<r.steps.length){ const n=rStep+1; setRStep(n); setRSecs(r.steps[n].duration*60); }
    else setRoutine(null);
  }

  if(loading) return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f7f3ed'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>🌱</div><p style={{fontSize:14,color:'#888'}}>Loading...</p></div>
    </div>
  );

  // ── Notification button with confirmation state ────────────
  const NotifButton = () => {
    const [notifState, setNotifState] = useState(() => {
      if (typeof window !== 'undefined' && Notification?.permission === 'granted') return 'granted';
      if (typeof window !== 'undefined' && Notification?.permission === 'denied') return 'denied';
      return 'idle';
    });

    async function handleEnable() {
      setNotifState('loading');

      // Safety timeout — never get stuck on loading
      const timeout = setTimeout(() => setNotifState('idle'), 8000);

      try {
        // Use native browser API as primary — resolves reliably on all platforms
        const permission = await Notification.requestPermission();
        clearTimeout(timeout);

        if (permission === 'granted') {
          setNotifState('granted');
          toast('🔔 Notifications enabled!');
          // Register with OneSignal in background
          if (window.OneSignalDeferred) {
            window.OneSignalDeferred.push(async function(OneSignal) {
              try {
                await OneSignal.Notifications.requestPermission();
                const id = OneSignal.User.PushSubscription.id;
                if (id && userId) {
                  await supabase.from('users').update({ onesignal_id: id }).eq('id', userId);
                }
              } catch(e) { console.error('OneSignal secondary error:', e); }
            });
          }
        } else {
          setNotifState('denied');
        }
      } catch(e) {
        clearTimeout(timeout);
        console.error(e);
        setNotifState('denied');
      }
    }

    const states = {
      idle:    { label: '🔔 Enable notifications', bg: '#1a2e1a', color: 'white', clickable: true },
      loading: { label: '⏳ Waiting for permission...', bg: '#3a5a3a', color: 'white', clickable: false },
      granted: { label: '✅ Notifications enabled', bg: '#8aad8a', color: 'white', clickable: false },
      denied:  { label: '❌ Blocked — enable in browser settings', bg: '#e07070', color: 'white', clickable: false },
    };

    const s = states[notifState];

    return (
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={s.clickable ? handleEnable : undefined}
          style={{ width:'100%', padding:'13px 20px', background:s.bg, color:s.color, border:'none', borderRadius:12, fontSize:13, fontWeight:600, cursor:s.clickable?'pointer':'default', fontFamily:'DM Sans, sans-serif', transition:'all 0.3s', textAlign:'center' }}
        >
          {s.label}
        </button>
        {notifState === 'granted' && (
          <p style={{ fontSize:11, color:'#5a7a5a', marginTop:6, textAlign:'center' }}>
            You&apos;ll receive habit reminders and community updates 🌱
          </p>
        )}
        {notifState === 'denied' && (
          <p style={{ fontSize:11, color:'#888', marginTop:6, textAlign:'center' }}>
            iPhone: Settings → Safari → scroll to your site → Notifications → Allow
          </p>
        )}
      </div>
    );
  };

  // ── Dashboard quick post (admin only) ─────────────────────
  const DashboardPostCard=()=>{
    const [text, setText] = useState('');
    const [posting, setPosting] = useState(false);

    async function submit() {
      if (!text.trim() || !userId) return;
      setPosting(true);
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: userId,
          user_name: name || 'J Bea',
          user_avatar_emoji: avEmoji || '🌿',
          content: text.trim(),
          post_type: 'check_in',
          parent_id: null,
        })
        .select()
        .single();
      if (data && !error) { setText(''); toast('✅ Posted to community!'); }
      setPosting(false);
    }

    return (
      <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:20}}>
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:14}}>Post to Community</div>
        <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
          <div style={{width:34,height:34,borderRadius:'50%',background:'#f3f8f3',border:'2px solid #8aad8a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{avEmoji||'🌿'}</div>
          <div style={{flex:1}}>
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Share a tip, recipe, science insight, or encouragement..." rows={2}
              style={{width:'100%',padding:'10px 13px',border:'1.5px solid #e8e4de',borderRadius:12,fontSize:13,fontFamily:'DM Sans,sans-serif',outline:'none',color:'#2a2a2a',background:'#f7f3ed',resize:'vertical',transition:'border-color 0.2s',lineHeight:1.5}}
              onFocus={e=>e.target.style.borderColor='#8aad8a'} onBlur={e=>e.target.style.borderColor='#e8e4de'}/>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
              <button onClick={submit} disabled={posting||!text.trim()}
                style={{padding:'8px 18px',background:text.trim()?'#8aad8a':'#e8e4de',color:text.trim()?'white':'#aaa',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:text.trim()?'pointer':'not-allowed',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s'}}>
                {posting?'Posting...':'Post →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AvatarCard=()=>(
    <div style={{background:'linear-gradient(160deg,#e8f0e8,#f0ede8)',border:'1.5px solid #b5ceb5',borderRadius:20,padding:22,textAlign:'center'}}>
      <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:16}}>Your Companion</div>
      <div style={{position:'relative',width:130,height:130,margin:'0 auto 16px'}}>
        <div style={{width:130,height:130,borderRadius:'50%',background:'linear-gradient(135deg,#c8ddc8,#a8c4a8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:54,border:'3px solid rgba(255,255,255,0.7)',boxShadow:'0 8px 28px rgba(90,122,90,0.18)',animation:'breathe 4s ease-in-out infinite',cursor:'pointer',position:'relative'}}>
          🧑‍🌿
          {equipped&&<div style={{position:'absolute',top:-6,right:-2,fontSize:18}}>{SHOP_ITEMS.find(i=>i.key===equipped.item_key)?.icon}</div>}
        </div>
        <div style={{position:'absolute',bottom:4,right:4,background:'#d4af6a',color:'white',fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:8}}>Lv.{level}</div>
      </div>
      <div style={{fontFamily:'Instrument Serif,serif',fontSize:17,marginBottom:2}}>{name}</div>
      <div style={{fontSize:11,color:'#5a7a5a',marginBottom:3}}>{arch.icon} {arch.name}</div>
      <div style={{fontSize:11,color:'#888',marginBottom:14}}>{mood}</div>
      {[{label:'❤️ Health',val:health,fill:'linear-gradient(90deg,#70c070,#4ea84e)'},{label:'📋 Today',val:pct,fill:'linear-gradient(90deg,#8aad8a,#5a7a5a)'}].map(b=>(
        <div key={b.label} style={{marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:500,marginBottom:3}}><span>{b.label}</span><span>{b.val}%</span></div>
          <div style={{height:6,background:'#e8d9c4',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${b.val}%`,background:b.fill,borderRadius:99,transition:'width 0.8s'}}/></div>
        </div>
      ))}
      <div style={{display:'flex',gap:8,marginTop:14}}>
        {[{v:coins.toLocaleString(),l:'🪙 Coins',c:'#d4af6a'},{v:ge,l:'⚡ GE',c:'#38a855'}].map(x=>(
          <div key={x.l} style={{flex:1,background:'white',border:'1.5px solid #e8e4de',borderRadius:10,padding:'9px 6px',textAlign:'center'}}>
            <div style={{fontSize:15,fontWeight:700,fontFamily:'Syne,sans-serif',color:x.c}}>{x.v}</div>
            <div style={{fontSize:10,color:'#888'}}>{x.l}</div>
          </div>
        ))}
      </div>
      <div style={{background:'#e8d9c4',border:'1px solid #c4a882',borderRadius:10,padding:'8px 10px',fontSize:10,color:'#7a6040',marginTop:12,textAlign:'left',lineHeight:1.5}}>
        🔬 Lally et al. (2010): habits form in 18–254 days — consistency is the key variable.
      </div>
    </div>
  );

  const HabitsGrid=()=>(
    <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888'}}>
          Today&apos;s Habits · Week {week} · {arch.icon} {arch.name}
        </div>
        <button onClick={()=>setCustomHabitOpen(true)}
          style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#f3f8f3',border:'1.5px solid #b5ceb5',borderRadius:99,fontSize:12,fontWeight:600,color:'#5a7a5a',cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s'}}>
          ＋ Add habit
        </button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:10}}>
        {allHabits.map(h=>{
          const d=done.includes(h.key);
          const streak=streaks[h.key]?.current_streak||0;
          const longest=streaks[h.key]?.longest_streak||0;
          return(
            <div key={h.key} style={{border:`1.5px solid ${d?'#8aad8a':'#e8e4de'}`,borderLeft:h.ge>0?'3px solid #4ecb71':h.isCustom?'3px solid #d4af6a':`1.5px solid ${d?'#8aad8a':'#e8e4de'}`,borderRadius:13,padding:13,background:d?'#f3f8f3':'white',transition:'all 0.2s',position:'relative'}}>
              {h.isCustom&&<div style={{position:'absolute',top:8,right:8,fontSize:9,fontWeight:700,color:'#d4af6a',textTransform:'uppercase',letterSpacing:0.5}}>custom</div>}

              {/* Top row — emoji, streak, check */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:7}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:20,cursor:'pointer'}} onClick={()=>toggleHabit(h)}>{h.emoji}</span>
                  {streak>0&&(
                    <div style={{display:'flex',alignItems:'center',gap:3,background:streak>=7?'#fff8e6':streak>=3?'#fff3e0':'#f7f3ed',border:`1px solid ${streak>=7?'#d4af6a':streak>=3?'#e8a43a':'#e8e4de'}`,borderRadius:99,padding:'2px 7px'}}>
                      <span style={{fontSize:10}}>{streak>=7?'🔥':streak>=3?'⚡':'🌱'}</span>
                      <span style={{fontSize:10,fontWeight:700,color:streak>=7?'#d4af6a':streak>=3?'#c47a20':'#888'}}>{streak}d</span>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  {/* Remove button */}
                  {!h.isCustom&&(
                    <button
                      onClick={e=>{e.stopPropagation();if(window.confirm(`Remove "${h.name}" from your plan? You can restore it anytime.`)) removeHabit(h.key);}}
                      title="Remove from plan"
                      style={{width:18,height:18,borderRadius:'50%',border:'1px solid #e8e4de',background:'white',cursor:'pointer',fontSize:10,color:'#bbb',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}
                      onMouseOver={e=>{e.currentTarget.style.borderColor='#e07070';e.currentTarget.style.color='#e07070';}}
                      onMouseOut={e=>{e.currentTarget.style.borderColor='#e8e4de';e.currentTarget.style.color='#bbb';}}
                    >✕</button>
                  )}
                  <div onClick={()=>toggleHabit(h)} style={{width:21,height:21,borderRadius:'50%',border:`2px solid ${d?'#8aad8a':'#e8e4de'}`,background:d?'#8aad8a':'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:d?'white':'transparent',cursor:'pointer'}}>✓</div>
                </div>
              </div>

              <div onClick={()=>toggleHabit(h)} style={{cursor:'pointer'}}>
                <div style={{fontSize:13,fontWeight:500,marginBottom:5}}>{h.name}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  {h.time&&<span style={{fontSize:10,color:'#888'}}>{h.time}</span>}
                  <span style={{fontSize:10,color:'#d4af6a',fontWeight:600}}>+{h.coins} 🪙</span>
                  {h.ge>0&&<span style={{fontSize:10,color:'#38a855',fontWeight:600}}>+{h.ge} ⚡</span>}
                  {longest>0&&<span style={{fontSize:10,color:'#aaa'}}>best: {longest}d</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Removed habits — restore section */}
      {removedHabits.length>0&&(
        <div style={{marginTop:14,padding:'10px 14px',background:'#fdf8f3',border:'1px solid #e8d9c4',borderRadius:12}}>
          <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#c4a882',marginBottom:8}}>Removed from your plan</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {habits.filter(h=>removedHabits.includes(h.key)).map(h=>(
              <button key={h.key} onClick={()=>restoreHabit(h.key)}
                style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',background:'white',border:'1px solid #e8d9c4',borderRadius:99,fontSize:11,color:'#888',cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s'}}
                onMouseOver={e=>e.currentTarget.style.borderColor='#8aad8a'}
                onMouseOut={e=>e.currentTarget.style.borderColor='#e8d9c4'}>
                {h.emoji} {h.name} <span style={{color:'#8aad8a',fontWeight:700}}>+ restore</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{marginTop:14,padding:'11px 14px',background:'#f7f3ed',borderRadius:12}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}><span>Today&apos;s Progress</span><span style={{fontWeight:600}}>{done.length}/{allHabits.length} complete</span></div>
        <div style={{height:7,background:'#e8e4de',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#8aad8a,#5a7a5a)',borderRadius:99,transition:'width 0.5s'}}/></div>
      </div>
    </div>
  );

  const Sidebar=()=>(
    <>
      <button onClick={()=>setSidebarOpen(o=>!o)} title={sidebarOpen?'Collapse':'Expand'}
        style={{position:'fixed',top:'50%',transform:'translateY(-50%)',left:sidebarOpen?220:0,width:20,height:48,borderRadius:'0 8px 8px 0',background:'#1a2e1a',border:'1.5px solid #2d5a2d',borderLeft:'none',cursor:'pointer',fontSize:11,color:'#7ac47a',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',transition:'left 0.25s ease',boxShadow:'2px 0 8px rgba(0,0,0,0.2)'}}>
        {sidebarOpen?'‹':'›'}
      </button>
      <nav style={{position:'fixed',left:0,top:0,bottom:0,width:sidebarOpen?220:0,background:'#1a2e1a',display:'flex',flexDirection:'column',padding:sidebarOpen?'20px 12px 24px':'0',gap:4,zIndex:100,overflow:'hidden',transition:'width 0.25s ease',boxShadow:sidebarOpen?'2px 0 16px rgba(0,0,0,0.15)':'none'}}>
        {sidebarOpen && (
          <>
            <div style={{height:44,marginBottom:8}}/>
            {NAV.map(n=>(
              <button key={n.key} onClick={()=>setTab(n.key)} title={n.label}
                style={{width:'100%',height:44,borderRadius:12,background:tab===n.key?'#2d5a2d':'transparent',border:'none',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:12,padding:'0 14px',color:tab===n.key?'white':'#6a9a6a',transition:'all 0.2s',position:'relative',fontFamily:'DM Sans,sans-serif',fontWeight:tab===n.key?600:400}}>
                <span style={{fontSize:18,flexShrink:0}}>{n.icon}</span>
                <span>{n.label}</span>
                {n.key==='community'&&<div style={{position:'absolute',top:10,left:26,width:7,height:7,background:'#e07070',borderRadius:'50%',border:'2px solid #1a2e1a'}}/>}
              </button>
            ))}
            <div style={{flex:1}}/>
            <button onClick={()=>setShopOpen(true)}
              style={{width:'100%',height:44,borderRadius:12,background:'transparent',border:'none',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:12,padding:'0 14px',color:'#6a9a6a',fontFamily:'DM Sans,sans-serif'}}>
              <span style={{fontSize:18}}>🛍</span><span>Shop</span>
            </button>
            <button onClick={()=>setTab('settings')}
              style={{width:'100%',height:44,borderRadius:12,background:tab==='settings'?'#2d5a2d':'transparent',border:'none',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:12,padding:'0 14px',color:tab==='settings'?'white':'#6a9a6a',fontFamily:'DM Sans,sans-serif',fontWeight:tab==='settings'?600:400}}>
              <span style={{fontSize:18}}>⚙️</span><span>Settings</span>
            </button>
          </>
        )}
      </nav>
    </>
  );

  const TopBar=({title,sub})=>(
    <div style={{background:'white',borderBottom:'1px solid #e8e4de',padding:'13px 26px',paddingTop:'max(13px, calc(13px + env(safe-area-inset-top)))',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50,flexWrap:'wrap',gap:10}}>
      <div>
        <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:21,fontWeight:400,color:'#1a1a1a'}}>{title}</h2>
        {sub&&<p style={{fontSize:12,color:'#888',marginTop:1}}>{sub}</p>}
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <button onClick={()=>setFeedbackOpen(true)}
          style={{display:'flex',alignItems:'center',gap:6,background:'#f7f3ed',border:'1.5px solid #e8e4de',borderRadius:99,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:500,color:'#888',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s'}}
          onMouseOver={e=>e.currentTarget.style.borderColor='#8aad8a'}
          onMouseOut={e=>e.currentTarget.style.borderColor='#e8e4de'}>
          ⭐ Feedback
        </button>
        <div onClick={()=>setShopOpen(true)} style={{display:'flex',alignItems:'center',gap:6,background:'#f7f3ed',border:'1.5px solid #e8e4de',borderRadius:99,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:600}}>
          🪙 {coins.toLocaleString()}
        </div>
        <div onClick={()=>setDonateOpen(true)} style={{display:'flex',alignItems:'center',gap:6,background:'#f0fdf4',border:'1.5px solid #4ecb71',borderRadius:99,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:600,color:'#276a3a'}}>
          ⚡ {ge} GE
        </div>
      </div>
    </div>
  );

  const TabDashboard=()=>{
    const today=new Date();
    const wdays=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-today.getDay()+i);return{n:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],num:d.getDate(),today:d.toDateString()===today.toDateString()};});
    return(
      <div style={{padding:'22px 26px',maxWidth:1200}}>
        <div style={{marginBottom:20}}>
          <h1 style={{fontFamily:'Instrument Serif,serif',fontSize:28,fontWeight:400,color:'#1a1a1a',marginBottom:4}}>Good morning, {name} ✨</h1>
          <p style={{fontSize:13,color:'#888'}}>Week {week} · Day {day} · {habits.length-done.length} habits remaining</p>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f3f8f3',border:'1px solid #b5ceb5',borderRadius:99,padding:'4px 12px',fontSize:12,color:'#5a7a5a',fontWeight:500,marginTop:8}}>
            {arch.icon} {arch.name} · {lvMap[lvl]||'Building'}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'250px 1fr',gap:18,alignItems:'start'}} className="dash-main-grid">
          <div style={{display:'flex',flexDirection:'column',gap:16}}><AvatarCard/></div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}} className="stats-row">
              {[
                {icon:'😴',v:manualStats.sleep||'—',l:'Sleep',key:'sleep'},
                {icon:'🧘',v:manualStats.mindfulness?`${manualStats.mindfulness}min`:'—',l:'Mindfulness',key:'mindfulness'},
                {icon:'🚶',v:manualStats.steps?manualStats.steps.toLocaleString():'—',l:'Steps',key:'steps'},
                {icon:'💧',v:manualStats.water?`${manualStats.water}L`:'—',l:'Hydration',key:'water'},
              ].map(x=>(
                <div key={x.l} onClick={()=>setStatsLogOpen(true)} style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:16,padding:16,cursor:'pointer',transition:'all 0.2s'}}
                  onMouseOver={e=>e.currentTarget.style.borderColor='#8aad8a'}
                  onMouseOut={e=>e.currentTarget.style.borderColor='#e8e4de'}>
                  <div style={{fontSize:18,marginBottom:6}}>{x.icon}</div>
                  <div style={{fontFamily:'Syne,sans-serif',fontSize:19,fontWeight:700,color:x.v==='—'?'#ccc':'#1a1a1a'}}>{x.v}</div>
                  <div style={{fontSize:11,color:'#888',marginTop:1}}>{x.l}</div>
                  <div style={{fontSize:10,color:'#aaa',marginTop:3}}>{x.v==='—'?'tap to log':'logged'}</div>
                </div>
              ))}
            </div>
            <HabitsGrid/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{background:'#1a1a16',border:'1.5px solid rgba(255,255,255,0.06)',borderRadius:20,padding:20,color:'white'}}>
                <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#444438',marginBottom:14}}>Quick Start</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {Object.entries(ROUTINES).map(([k,r])=>(
                    <button key={k} onClick={()=>startRoutine(k)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 13px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,cursor:'pointer',color:'white',fontFamily:'DM Sans,sans-serif',fontSize:13,textAlign:'left',transition:'all 0.2s'}}>
                      <span style={{fontSize:18}}>{r.icon}</span>
                      <div><div style={{fontWeight:500}}>{r.label}</div><div style={{fontSize:10,color:'#555'}}>{r.steps.reduce((a,s)=>a+s.duration,0)} min · {r.steps.length} steps</div></div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{background:'linear-gradient(135deg,#1a2e1a,#1c3620)',border:'1.5px solid rgba(78,203,113,0.15)',borderRadius:20,padding:20,color:'white'}}>
                <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#3a5a3a',marginBottom:14}}>Green Energy</div>
                <div style={{display:'flex',alignItems:'center',gap:13,marginBottom:12}}>
                  <div style={{width:50,height:50,borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,#7ae88a,#2d7a3a)',boxShadow:'0 0 20px rgba(78,203,113,0.35)',flexShrink:0,animation:'pulseGe 3s ease-in-out infinite'}}/>
                  <div><div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,color:'#4ecb71'}}>{ge} GE</div><div style={{fontSize:11,color:'#3a5a3a'}}>This week</div></div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:12}}>
                  {habits.filter(h=>h.ge>0).map(h=>(
                    <div key={h.key} style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:'#6a9a6a'}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:'#4ecb71',flexShrink:0}}/>{h.name}
                    </div>
                  ))}
                </div>
                <button onClick={()=>setDonateOpen(true)} style={{width:'100%',padding:10,background:'linear-gradient(135deg,#3a7a4a,#2d6a3d)',border:'none',borderRadius:10,color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>🌍 Donate GE to Planet</button>
              </div>
            </div>
            <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:20}}>
              <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:12}}>Week at a Glance · Week {week} of 4</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
                {wdays.map(d=>(
                  <div key={d.num} style={{borderRadius:10,padding:'7px 4px',textAlign:'center',border:`1.5px solid ${d.today?'#8aad8a':'#e8e4de'}`,background:d.today?'#f3f8f3':'white',cursor:'pointer'}}>
                    <div style={{fontSize:9,color:'#888',textTransform:'uppercase',letterSpacing:'0.5px'}}>{d.n}</div>
                    <div style={{fontWeight:600,fontSize:13,marginTop:2,color:d.today?'#5a7a5a':'#2a2a2a'}}>{d.num}</div>
                  </div>
                ))}
              </div>
            </div>
            {userId === ADMIN_USER_ID && <DashboardPostCard/>}
          </div>
        </div>
      </div>
    );
  };

  const TabHabits=()=>(
    <div style={{padding:'22px 26px',maxWidth:900}}>
      <HabitsGrid/>
      <div style={{marginTop:18}}><ProgressStats/></div>
    </div>
  );

  const TabRoutines=()=>{
    const r=routine?ROUTINES[routine]:null;
    const step=r?.steps[rStep];
    const totalSecs=step?step.duration*60:0;
    const elapsed=totalSecs-rSecs;
    const prog=totalSecs>0?(elapsed/totalSecs)*100:0;
    return(
      <div style={{padding:'22px 26px',maxWidth:860}}>
        {!routine?(
          <>
            <div style={{fontFamily:'Instrument Serif,serif',fontSize:26,marginBottom:6,color:'#1a1a1a'}}>Your Routines</div>
            <p style={{fontSize:14,color:'#888',marginBottom:22,lineHeight:1.6}}>Guided step-by-step sessions with a built-in timer. Set your daily frequency target and track completions.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
              {Object.entries(ROUTINES).map(([k,r])=>{
                const todayCount=getTodayRoutineCount(k);
                const freq=getRoutineFreq(k);
                const pctDone=Math.min(100,Math.round((todayCount/freq)*100));
                const allDone=todayCount>=freq;
                return(
                  <div key={k} style={{background:'white',border:`1.5px solid ${allDone?'#8aad8a':'#e8e4de'}`,borderRadius:20,padding:22,transition:'all 0.2s',borderTop:`3px solid ${r.color}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div style={{fontSize:28}}>{r.icon}</div>
                      {allDone&&<div style={{fontSize:11,fontWeight:700,color:'#5a7a5a',background:'#f3f8f3',border:'1px solid #b5ceb5',borderRadius:99,padding:'3px 10px'}}>✓ Done today</div>}
                    </div>
                    <div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,marginBottom:4}}>{r.label}</div>
                    <div style={{fontSize:13,color:'#888',marginBottom:12}}>{r.steps.reduce((a,s)=>a+s.duration,0)} min · {r.steps.length} steps</div>
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,color:'#888',marginBottom:6}}>Daily target</div>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        {[1,2,3].map(n=>(
                          <button key={n} onClick={()=>setRoutineFreq(k,n)}
                            style={{width:32,height:32,borderRadius:8,border:`1.5px solid ${freq===n?r.color:'#e8e4de'}`,background:freq===n?r.color+'22':'white',color:freq===n?r.color:'#888',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.2s'}}>
                            {n}x
                          </button>
                        ))}
                        <div style={{flex:1,marginLeft:4}}>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#888',marginBottom:3}}>
                            <span>Today</span><span style={{fontWeight:600,color:allDone?'#5a7a5a':'#888'}}>{todayCount}/{freq}</span>
                          </div>
                          <div style={{height:5,background:'#e8e4de',borderRadius:99,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${pctDone}%`,background:allDone?'#8aad8a':r.color,borderRadius:99,transition:'width 0.4s'}}/>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
                      {r.steps.map((s,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#555'}}>
                          <div style={{width:5,height:5,borderRadius:'50%',background:r.color,flexShrink:0}}/>{s.name} · {s.duration} min
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>startRoutine(k)}
                      style={{width:'100%',padding:10,background:r.color,color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
                      {todayCount>0?`Start again (${todayCount} done)`:`Start ${r.label} →`}
                    </button>
                  </div>
                );
              })}
            </div>
            {Object.keys(routineLog).length>0&&(
              <div style={{marginTop:24,background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:20}}>
                <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:14}}>Recent completions</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {Object.entries(routineLog).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,10).map(([k,v])=>{
                    const parts=k.split('_');
                    const dateStr=parts[parts.length-1];
                    const routineKey=parts.slice(0,-1).join('_');
                    const r=ROUTINES[routineKey];
                    if(!r) return null;
                    return(
                      <div key={k} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'#f7f3ed',borderRadius:12,border:'1px solid #e8e4de'}}>
                        <span style={{fontSize:20}}>{r.icon}</span>
                        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{r.label}</div><div style={{fontSize:11,color:'#888'}}>{dateStr}</div></div>
                        <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#5a7a5a'}}>{v}x</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ):(
          <div>
            <button onClick={()=>{setRoutine(null);clearInterval(rTimer.current);setRRunning(false);}}
              style={{background:'transparent',border:'none',cursor:'pointer',fontSize:13,color:'#888',marginBottom:20,display:'flex',alignItems:'center',gap:6,fontFamily:'DM Sans,sans-serif'}}>← Back to routines</button>
            <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:20,alignItems:'start'}} className="routine-grid">
              <div style={{background:'#1a1a16',borderRadius:24,padding:32,textAlign:'center',color:'white'}}>
                <div style={{fontSize:11,color:'#444',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:6}}>{r.label}</div>
                <div style={{fontFamily:'Instrument Serif,serif',fontSize:20,color:'#e8e0d0',marginBottom:4}}>{step?.name}</div>
                <div style={{fontSize:11,color:'#555',marginBottom:22}}>Step {rStep+1} of {r.steps.length}</div>
                <div style={{fontFamily:'Syne,sans-serif',fontSize:68,fontWeight:700,letterSpacing:-3,color:'white',marginBottom:6}}>{fmt(rSecs)}</div>
                <div style={{height:5,background:'rgba(255,255,255,0.08)',borderRadius:99,marginBottom:24,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${prog}%`,background:r.color,borderRadius:99,transition:'width 1s linear'}}/>
                </div>
                <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                  <button onClick={toggleTimer} style={{padding:'11px 26px',background:r.color,color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
                    {rRunning?'⏸ Pause':'▶ Start'}
                  </button>
                  <button onClick={skipStep} style={{padding:'11px 18px',background:'rgba(255,255,255,0.06)',color:'#888',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,fontSize:13,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Skip →</button>
                </div>
                <div style={{marginTop:20,fontSize:12,color:'#444'}}>
                  Completed today: <strong style={{color:'#7ac47a'}}>{getTodayRoutineCount(routine)}x</strong> / {getRoutineFreq(routine)}x target
                </div>
              </div>
              <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:20}}>
                <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:14}}>Steps</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {r.steps.map((s,i)=>(
                    <div key={i} onClick={()=>{clearInterval(rTimer.current);setRRunning(false);setRStep(i);setRSecs(r.steps[i].duration*60);}}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:i===rStep?'#f3f8f3':'#f7f3ed',border:`1.5px solid ${i===rStep?'#8aad8a':'#e8e4de'}`,cursor:'pointer',transition:'all 0.2s'}}>
                      <div style={{width:24,height:24,borderRadius:'50%',background:i<rStep?'#8aad8a':i===rStep?r.color:'#e8e4de',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:i<=rStep?'white':'#888',fontWeight:700,flexShrink:0}}>
                        {i<rStep?'✓':i+1}
                      </div>
                      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{s.name}</div><div style={{fontSize:11,color:'#888'}}>{s.duration} min</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const TabPlanner=()=>{
    const today=new Date();
    const todayStr=today.toISOString().split('T')[0];
    const startDate=new Date(today);
    startDate.setDate(today.getDate()-today.getDay()-14);
    const allDays=Array.from({length:35},(_,i)=>{
      const d=new Date(startDate); d.setDate(startDate.getDate()+i);
      const ds=d.toISOString().split('T')[0];
      return{n:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],num:d.getDate(),mo:d.toLocaleDateString('en-US',{month:'short'}),dateStr:ds,isToday:ds===todayStr,isFuture:d>today,isSelected:ds===selectedDay};
    });
    return(
      <div style={{padding:'22px 26px',maxWidth:960}}>
        <div style={{fontFamily:'Instrument Serif,serif',fontSize:26,marginBottom:18,color:'#1a1a1a'}}>Monthly Planner</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20,alignItems:'start'}} className="planner-grid-layout">
          <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:20}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,marginBottom:8}}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
                <div key={d} style={{textAlign:'center',fontSize:10,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:0.5,padding:'6px 0'}}>{d}</div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5}}>
              {allDays.map((d,i)=>(
                <div key={i} onClick={()=>!d.isFuture&&loadDayStats(d.dateStr)}
                  style={{borderRadius:10,padding:'8px 4px',textAlign:'center',border:`1.5px solid ${d.isSelected?'#5a7a5a':d.isToday?'#8aad8a':'#e8e4de'}`,background:d.isSelected?'#1a2e1a':d.isToday?'#f3f8f3':'white',cursor:d.isFuture?'default':'pointer',opacity:d.isFuture?0.35:1,transition:'all 0.15s'}}>
                  <div style={{fontSize:9,color:d.isSelected?'#7ac47a':'#bbb'}}>{d.num===1?d.mo:''}</div>
                  <div style={{fontWeight:600,fontSize:13,color:d.isSelected?'white':d.isToday?'#5a7a5a':'#2a2a2a'}}>{d.num}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:11,color:'#aaa',marginTop:12,textAlign:'center'}}>Tap any past day to see your stats</div>
          </div>
          <div>
            {!selectedDay&&(
              <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:24,textAlign:'center'}}>
                <div style={{fontSize:32,marginBottom:12}}>📅</div>
                <div style={{fontFamily:'Instrument Serif,serif',fontSize:18,color:'#1a1a1a',marginBottom:6}}>Select a day</div>
                <div style={{fontSize:13,color:'#888',lineHeight:1.5}}>Tap any date to see habit completions and routine activity.</div>
              </div>
            )}
            {selectedDay&&dayStatsLoading&&(
              <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:24,textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:8}}>⏳</div>
                <div style={{fontSize:13,color:'#888'}}>Loading stats...</div>
              </div>
            )}
            {selectedDay&&!dayStatsLoading&&dayStats&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{background:'#1a2e1a',borderRadius:20,padding:20,color:'white'}}>
                  <div style={{fontSize:11,color:'#4a6a4a',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>
                    {new Date(selectedDay+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})}
                  </div>
                  <div style={{fontFamily:'Instrument Serif,serif',fontSize:22,color:'white',marginBottom:12}}>
                    {new Date(selectedDay+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric'})}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                    {[{v:dayStats.completed.length,l:'Habits done',c:'#7ac47a'},{v:`+${dayStats.totalCoins}`,l:'Coins earned',c:'#d4af6a'},{v:`+${dayStats.totalGE}`,l:'GE generated',c:'#4ecb71'}].map(s=>(
                      <div key={s.l} style={{textAlign:'center',background:'rgba(255,255,255,0.06)',borderRadius:10,padding:'10px 6px'}}>
                        <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:10,color:'#4a6a4a',marginTop:3}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:18}}>
                  <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:12}}>Habits completed ({dayStats.completed.length})</div>
                  {dayStats.completed.length===0?(
                    <div style={{fontSize:13,color:'#bbb',textAlign:'center',padding:'12px 0'}}>No habits recorded</div>
                  ):(
                    <div style={{display:'flex',flexDirection:'column',gap:7}}>
                      {dayStats.completed.map(h=>(
                        <div key={h.key} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'#f3f8f3',borderRadius:10,border:'1px solid #b5ceb5'}}>
                          <span style={{fontSize:18}}>{h.emoji}</span>
                          <span style={{flex:1,fontSize:13,fontWeight:500}}>{h.name}</span>
                          <span style={{fontSize:11,color:'#d4af6a',fontWeight:600}}>+{h.coins} 🪙</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TabPlanet=()=>(
    <div style={{padding:'22px 26px',maxWidth:760}}>
      <div style={{background:'linear-gradient(135deg,#1a2e1a,#1c3620)',borderRadius:24,padding:28,color:'white',marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',gap:18,marginBottom:18}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,#7ae88a,#2d7a3a)',boxShadow:'0 0 28px rgba(78,203,113,0.4)',flexShrink:0}}/>
          <div><div style={{fontFamily:'Syne,sans-serif',fontSize:34,fontWeight:700,color:'#4ecb71'}}>{ge} GE</div><div style={{fontSize:13,color:'#3a5a3a'}}>Total Green Energy</div></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {[{l:'Plant-based meals',v:12},{l:'Days walked',v:8},{l:'GE donated',v:200}].map(s=>(
            <div key={s.l} style={{background:'rgba(255,255,255,0.05)',borderRadius:12,padding:'13px 10px',textAlign:'center'}}>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#4ecb71'}}>{s.v}</div>
              <div style={{fontSize:11,color:'#3a5a3a',marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:20,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:14}}>Donate to Planet</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {['Ocean Conservancy','Rainforest Alliance','World Wildlife Fund','Amazon Watch'].map(o=>(
            <div key={o} onClick={()=>donateGE(o,100)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 16px',border:'1.5px solid #e8e4de',borderRadius:14,cursor:'pointer',transition:'all 0.2s'}}
              onMouseOver={e=>e.currentTarget.style.borderColor='#4ecb71'} onMouseOut={e=>e.currentTarget.style.borderColor='#e8e4de'}>
              <div><div style={{fontSize:14,fontWeight:500}}>{o}</div><div style={{fontSize:11,color:'#888',marginTop:2}}>100 GE</div></div>
              <span style={{fontSize:22}}>🌍</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'#f0fdf4',border:'1.5px solid rgba(78,203,113,0.3)',borderRadius:14,padding:'13px 16px',fontSize:12,color:'#276a3a',lineHeight:1.6}}>
        🔬 Poore &amp; Nemecek (2018, Science): plant-based food choices reduce individual food emissions by up to 73%.
      </div>
    </div>
  );

  const TabCommunity=()=>(
    <div style={{padding:'22px 26px',maxWidth:900}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 270px',gap:18,alignItems:'start'}} className="community-grid">
        <CommunityFeed/>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:18}}>
            <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:14}}>Your Stats</div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:'#f3f8f3',border:'1px solid #b5ceb5',marginBottom:8}}>
              <span style={{fontSize:20}}>{avEmoji||'🧑‍🌿'}</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{name}</div><div style={{fontSize:10,color:'#888'}}>Lv.{level} · {arch.icon} {arch.name}</div></div>
              <div style={{display:'flex',gap:8}}>
                <div style={{textAlign:'center'}}><div style={{fontFamily:'Syne,sans-serif',fontSize:12,fontWeight:700}}>{coins.toLocaleString()}</div><div style={{fontSize:9,color:'#888'}}>🪙</div></div>
                <div style={{textAlign:'center'}}><div style={{fontFamily:'Syne,sans-serif',fontSize:12,fontWeight:700}}>{ge}</div><div style={{fontSize:9,color:'#888'}}>⚡</div></div>
              </div>
            </div>
          </div>
          <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:18}}>
            <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:14}}>Community Leaderboard</div>
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:28,marginBottom:10}}>🌱</div>
              <div style={{fontSize:13,fontWeight:500,color:'#2a2a2a',marginBottom:6}}>Leaderboard unlocks with members</div>
              <div style={{fontSize:12,color:'#aaa',lineHeight:1.5}}>As the cohort grows, GE rankings will appear here.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const TabSettings=()=>(
    <div style={{padding:'22px 26px',maxWidth:680}}>
      <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:24,padding:26,display:'flex',gap:18,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#c8ddc8,#a8c4a8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,border:'3px solid rgba(255,255,255,0.7)',flexShrink:0}}>🧑‍🌿</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'Instrument Serif,serif',fontSize:22,color:'#1a1a1a',marginBottom:6}}>{name}</div>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f3f8f3',border:'1px solid #b5ceb5',borderRadius:99,padding:'4px 12px',fontSize:12,color:'#5a7a5a',fontWeight:500}}>{arch.icon} {arch.name}</div>
        </div>
        <div style={{display:'flex',gap:20}}>
          {[{v:done.length,l:'today'},{v:coins.toLocaleString(),l:'coins'},{v:`Lv.${level}`,l:'level'}].map(s=>(
            <div key={s.l} style={{textAlign:'center'}}>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:'#1a1a1a'}}>{s.v}</div>
              <div style={{fontSize:11,color:'#888',marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'linear-gradient(135deg,#1a2e1a,#2a3a2a)',borderRadius:20,padding:20,color:'white',marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#3a5a3a',marginBottom:14}}>Program Progress</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[{n:'Week 1',s:'Foundation'},{n:'Week 2',s:'Build'},{n:'Week 3',s:'Optimise'},{n:'Week 4',s:'Integrate'}].map((w,i)=>(
            <div key={i} style={{background:i+1===week?'rgba(78,203,113,0.1)':i+1<week?'rgba(122,158,126,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${i+1===week?'rgba(78,203,113,0.3)':i+1<week?'rgba(122,158,126,0.25)':'rgba(255,255,255,0.08)'}`,borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:10,color:'#3a5a3a',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>{w.n}</div>
              <div style={{fontSize:12,color:'#8aba8a',marginBottom:6}}>{w.s}</div>
              <div style={{fontSize:16}}>{i+1<week?'✅':i+1===week?'🌱':'🔒'}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:20,marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:14}}>Your Program</div>
        {[
          {l:'Wellness Archetype',v:`${arch.icon} ${arch.name}`},
          {l:'Lifestyle Level',v:lvMap[lvl]||'Building'},
          {l:'Chronotype',v:chronotype?chronotype.charAt(0).toUpperCase()+chronotype.slice(1):'Bear'},
          {l:'Program',v:'Spring Wellness 2026'},
          {l:'Access',v:'Founding Beta · Lifetime'},
        ].map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f0ece6'}}>
            <span style={{fontSize:13,color:'#555'}}>{r.l}</span>
            <span style={{fontSize:13,color:'#1a1a1a',fontWeight:500}}>{r.v}</span>
          </div>
        ))}
      </div>

      {/* Notification button with confirmation */}
      <NotifButton/>

      <div style={{background:'#f7f3ed',border:'1.5px solid #e8e4de',borderRadius:20,padding:20,textAlign:'center'}}>
        <div style={{fontSize:22,marginBottom:10}}>⚙️</div>
        <div style={{fontSize:14,fontWeight:500,color:'#2a2a2a',marginBottom:6}}>More settings coming soon</div>
        <div style={{fontSize:13,color:'#888',lineHeight:1.6,marginBottom:14}}>
          Notification preferences, device sync, and account management are on the roadmap. Your feedback shapes what gets built first.
        </div>
        <a href="https://instagram.com/byjbea" target="_blank" rel="noreferrer"
          style={{display:'inline-flex',alignItems:'center',gap:6,background:'#1a2e1a',color:'white',padding:'10px 20px',borderRadius:99,fontSize:13,fontWeight:600,textDecoration:'none'}}>
          DM @byjbea with requests →
        </a>
      </div>

      {/* Sign out */}
      <button
        onClick={()=>{
          if(window.confirm('Are you sure you want to sign out?')){
            localStorage.removeItem('bloom-storage');
            localStorage.removeItem('bloom-daily-stats');
            localStorage.removeItem('bloom-routine-log');
            localStorage.removeItem('bloom-routine-freqs');
            window.location.reload();
          }
        }}
        style={{width:'100%',marginTop:12,padding:'13px',background:'transparent',border:'1.5px solid #e8e4de',borderRadius:12,fontSize:13,fontWeight:600,color:'#888',cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s'}}
        onMouseOver={e=>{e.currentTarget.style.borderColor='#e07070';e.currentTarget.style.color='#e07070';}}
        onMouseOut={e=>{e.currentTarget.style.borderColor='#e8e4de';e.currentTarget.style.color='#888';}}
      >
        Sign out
      </button>
    </div>
  );

  const ShopModal=()=>(
    <div onClick={()=>setShopOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:24,padding:26,width:560,maxWidth:'95vw',maxHeight:'82vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:22}}>Avatar Shop 🛍</h2>
          <button onClick={()=>setShopOpen(false)} style={{width:30,height:30,borderRadius:'50%',border:'1.5px solid #e8e4de',background:'transparent',cursor:'pointer',fontSize:15}}>✕</button>
        </div>
        <div style={{background:'#f7f3ed',borderRadius:12,padding:'10px 14px',marginBottom:18,display:'flex',gap:18,fontSize:13}}>
          <span>🪙 <strong>{coins.toLocaleString()}</strong></span><span>⚡ <strong>{ge}</strong> GE</span>
        </div>
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:10}}>Coin Items</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
          {SHOP_ITEMS.filter(i=>i.cost>0).map(item=>{
            const owned=inventory.some(iv=>iv.item_key===item.key);
            return(<div key={item.key} onClick={()=>!owned&&buyItem(item)} style={{border:`1.5px solid ${owned?'#8aad8a':'#e8e4de'}`,background:owned?'#f3f8f3':'white',borderRadius:13,padding:'12px 8px',textAlign:'center',cursor:owned?'default':'pointer',transition:'all 0.2s'}}>
              <div style={{fontSize:28,marginBottom:7}}>{item.icon}</div>
              <div style={{fontSize:11,fontWeight:500,marginBottom:4}}>{item.name}</div>
              <div style={{fontSize:11,color:owned?'#8aad8a':'#d4af6a',fontWeight:600}}>{owned?'✓ Owned':`🪙 ${item.cost}`}</div>
            </div>);
          })}
        </div>
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:10}}>GE Items</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>
          {SHOP_ITEMS.filter(i=>i.ge>0).map(item=>{
            const owned=inventory.some(iv=>iv.item_key===item.key);
            return(<div key={item.key} onClick={()=>!owned&&buyItem(item)} style={{border:`1.5px solid ${owned?'#8aad8a':'#e8e4de'}`,background:owned?'#f3f8f3':'white',borderRadius:13,padding:'12px 8px',textAlign:'center',cursor:owned?'default':'pointer',transition:'all 0.2s'}}>
              <div style={{fontSize:28,marginBottom:7}}>{item.icon}</div>
              <div style={{fontSize:11,fontWeight:500,marginBottom:4}}>{item.name}</div>
              <div style={{fontSize:11,color:owned?'#8aad8a':'#38a855',fontWeight:600}}>{owned?'✓ Owned':`⚡ ${item.ge} GE`}</div>
            </div>);
          })}
        </div>
        {inventory.length>0&&(
          <>
            <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:10}}>Your Inventory</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
              {inventory.map(item=>{const si=SHOP_ITEMS.find(s=>s.key===item.item_key);return(
                <div key={item.id} onClick={()=>equipItem(item)} style={{border:`1.5px solid ${item.equipped?'#d4af6a':'#e8e4de'}`,background:item.equipped?'#fdf8ed':'white',borderRadius:13,padding:'12px 8px',textAlign:'center',cursor:'pointer',transition:'all 0.2s'}}>
                  <div style={{fontSize:26,marginBottom:5}}>{si?.icon||'✨'}</div>
                  <div style={{fontSize:11,fontWeight:500}}>{item.item_name}</div>
                  <div style={{fontSize:10,color:item.equipped?'#d4af6a':'#888',marginTop:3}}>{item.equipped?'✓ Equipped':'Tap to equip'}</div>
                </div>
              );})}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const DonateModal=()=>(
    <div onClick={()=>setDonateOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:24,padding:26,width:460,maxWidth:'95vw'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:22}}>Donate GE 🌍</h2>
          <button onClick={()=>setDonateOpen(false)} style={{width:30,height:30,borderRadius:'50%',border:'1.5px solid #e8e4de',background:'transparent',cursor:'pointer',fontSize:15}}>✕</button>
        </div>
        <div style={{background:'#f0fdf4',borderRadius:12,padding:'10px 14px',marginBottom:16,border:'1px solid #4ecb71',fontSize:14}}>⚡ <strong>{ge}</strong> GE available</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {['Ocean Conservancy','Rainforest Alliance','World Wildlife Fund','Amazon Watch'].map(o=>(
            <div key={o} onClick={()=>donateGE(o,100)} style={{border:'1.5px solid #e8e4de',borderRadius:13,padding:'13px 16px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'all 0.2s'}}
              onMouseOver={e=>e.currentTarget.style.borderColor='#4ecb71'} onMouseOut={e=>e.currentTarget.style.borderColor='#e8e4de'}>
              <div><div style={{fontSize:14,fontWeight:500}}>{o}</div><div style={{fontSize:11,color:'#888',marginTop:2}}>100 GE</div></div>
              <span style={{fontSize:22}}>🌍</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const titles={
    dashboard:{t:`Good morning, ${name} ✨`,s:`Week ${week} · Day ${day} · ${arch.icon} ${arch.name}`},
    habits:{t:'Habits ✅',s:`${done.length}/${habits.length} complete today`},
    routines:{t:routine?`${ROUTINES[routine]?.label} ${ROUTINES[routine]?.icon}`:'Routines ⏱',s:routine?`Step ${rStep+1} of ${ROUTINES[routine]?.steps.length}`:'Guided step-by-step sessions'},
    planner:{t:'Planner 📅',s:`Week ${week} of 4`},
    planet:{t:'Planet 🌍',s:`${ge} GE generated`},
    community:{t:'Community 👥',s:'Spring Wellness Program cohort'},
    settings:{t:'Profile & Settings ⚙️',s:`${arch.icon} ${arch.name} · ${lvMap[lvl]||'Building'}`},
    roadmap:{t:'Roadmap 🗺️',s:"Vote for features · suggest ideas · see what's coming"},
  };
  const cur=titles[tab]||titles.dashboard;

  return(
    <div style={{display:'flex',minHeight:'100vh',background:'#f7f3ed',overflowX:'hidden'}}>
      <Sidebar/>
      <div style={{marginLeft:sidebarOpen?220:0,flex:1,minWidth:0,transition:'margin-left 0.25s ease'}}>
        <TopBar title={cur.t} sub={cur.s}/>
        <div style={{overflowX:'hidden'}}>
          {tab==='dashboard'  && <TabDashboard/>}
          {tab==='habits'     && <TabHabits/>}
          {tab==='routines'   && <TabRoutines/>}
          {tab==='planner'    && <TabPlanner/>}
          {tab==='planet'     && <TabPlanet/>}
          {tab==='community'  && <TabCommunity/>}
          {tab==='settings'   && <TabSettings/>}
          {tab==='roadmap'    && <TabRoadmap onFeedback={()=>setFeedbackOpen(true)}/>}
        </div>
      </div>
      {shopOpen    && <ShopModal/>}
      {donateOpen  && <DonateModal/>}
      {reflOpen    && <ReflModal week={week} refl={refl} setRefl={setRefl} submitRefl={submitRefl}/>}
      {customHabitOpen && <CustomHabitModal onClose={()=>setCustomHabitOpen(false)}/>}
      {statsLogOpen && <StatsLogModal statsForm={statsForm} setStatsForm={setStatsForm} manualStats={manualStats} setManualStats={setManualStats} setStatsLogOpen={setStatsLogOpen}/>}
      {feedbackOpen && <FeedbackModal onClose={()=>setFeedbackOpen(false)}/>}
      <div id="bloom-toast" className="toast" style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%) translateY(20px)',background:'#1a1a16',color:'white',padding:'12px 20px',borderRadius:99,fontSize:13,fontWeight:500,opacity:0,transition:'all 0.3s',zIndex:300,whiteSpace:'nowrap',pointerEvents:'none'}}/>
      <style>{`
        @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
        @keyframes pulseGe{0%,100%{box-shadow:0 0 20px rgba(78,203,113,0.35)}50%{box-shadow:0 0 36px rgba(78,203,113,0.5)}}
        .toast.show{opacity:1!important;transform:translateX(-50%) translateY(0)!important;}
        *{min-width:0;}
        /* Safe area for iPhone notch/dynamic island */
        body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
        @supports (padding-top: env(safe-area-inset-top)) {
          .topbar-safe { padding-top: calc(13px + env(safe-area-inset-top)) !important; }
        }
        @media(max-width:1100px){.dash-main-grid{grid-template-columns:1fr!important}.stats-row{grid-template-columns:repeat(2,1fr)!important}.routine-grid{grid-template-columns:1fr!important}.community-grid{grid-template-columns:1fr!important}.planner-grid-layout{grid-template-columns:1fr!important}}
        @media(max-width:600px){
          .dash-main-grid{grid-template-columns:1fr!important}
          #bloom-toast{white-space:normal!important;text-align:center;max-width:80vw}
        }
      `}</style>
    </div>
  );
}
