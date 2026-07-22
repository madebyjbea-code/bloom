'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getHabitsForUser, getCurrentWeek, getDayOfWeek, ARCHETYPE_INFO } from '../lib/springProgram';
import { SUGGESTED_HABITS_TO_BUILD, createGoal, getGoals, logGoalInstance, getGoalWeekCount, getWeekStart } from '../lib/goalsTasks';
import { useStore } from '../lib/store';
import { getMoodExpression } from '../lib/avatarMood';
import CommunityFeed from './CommunityFeed';
import ProgressStats from './ProgressStats';
import CustomHabitModal from './CustomHabitModal';
import FeedbackModal from './FeedbackModal';
import TabRoadmap from './TabRoadmap';
import TabCourses from './TabCourses';
import TabBadHabits from './TabBadHabits';
import BadHabitModal from './BadHabitModal';
import QuizAnalytics from './QuizAnalytics';
import TabHabitReview from './TabHabitReview';
import TabRoutinesEnhanced from './TabRoutines';
import TabNourish from './TabNourish';
import TabCompanion from './TabCompanion';
import EnergyModeModal, { ModeEditor } from './EnergyModeModal';

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

// Shop items — SVG-renderable accessories only
const SHOP_ITEMS = [
  { key: 'bow',           name: 'Floral Bow',    icon: '🎀', cost: 2000,  ge: 0 },
  { key: 'flower_crown',  name: 'Flower Crown',  icon: '🌸', cost: 3500,  ge: 0 },
  { key: 'star_sparkles', name: 'Star Sparkles', icon: '✨', cost: 5000,  ge: 0 },
  { key: 'crown',         name: 'Gold Crown',    icon: '👑', cost: 7500,  ge: 0 },
  { key: 'wings',         name: 'Green Wings',   icon: '🍃', cost: 0,     ge: 500 },
  { key: 'halo',          name: 'Earth Halo',    icon: '🌍', cost: 0,     ge: 800 },
  { key: 'leaf_halo',     name: 'Leaf Halo',     icon: '🌿', cost: 0,     ge: 650 },
];

// Purchasable scenery — pure CSS gradients, no art needed
const SCENES = [
  { key: 'default',       name: 'Default',        gradient: 'linear-gradient(160deg,#e8f0e8,#f0ede8)', emoji: '🌿', cost: 0   },
  { key: 'forest',        name: 'Forest Morning',  gradient: 'linear-gradient(160deg,#c8ddc8,#8aad8a)', emoji: '🌲', cost: 150 },
  { key: 'golden_hour',   name: 'Golden Hour',     gradient: 'linear-gradient(160deg,#f7e0a8,#f0b060)', emoji: '🌅', cost: 150 },
  { key: 'rainy_day',     name: 'Rainy Day',       gradient: 'linear-gradient(160deg,#b8c8d8,#7a8898)', emoji: '🌧️', cost: 150 },
  { key: 'night_sky',     name: 'Night Sky',       gradient: 'linear-gradient(160deg,#1e1e3e,#2a2a5a)', emoji: '🌙', cost: 200 },
  { key: 'snowy_cabin',   name: 'Snowy Cabin',     gradient: 'linear-gradient(160deg,#e8f0f8,#c0d0e0)', emoji: '❄️', cost: 200 },
  { key: 'ocean_dusk',    name: 'Ocean at Dusk',   gradient: 'linear-gradient(160deg,#d8a8c8,#8858a8)', emoji: '🌊', cost: 250 },
  { key: 'spring_bloom',  name: 'Spring Bloom',    gradient: 'linear-gradient(160deg,#f8d8e8,#e8a8c8)', emoji: '🌸', cost: 200 },
  { key: 'autumn_forest', name: 'Autumn Forest',   gradient: 'linear-gradient(160deg,#e8a850,#b86820)', emoji: '🍂', cost: 250 },
];

// Top-level sidebar (5 items). Habits + More expand into sub-tabs below.
const NAV = [
  { key: 'dashboard', icon: '🌿', label: 'Home' },
  { key: 'habits',    icon: '✅', label: 'Habits' },
  { key: 'companion', icon: '🌸', label: 'Companion' },
  { key: 'courses',   icon: '📚', label: 'Courses' },
  { key: 'more',      icon: '☰',  label: 'More' },
];

// Sub-tabs revealed by the horizontal SubNav when you're inside a group.
// (Quit habits already live inside the Habits tab, so no separate entry.)
const GROUPS = {
  habits: [
    { key: 'habits',   icon: '✅', label: 'Habits' },
    { key: 'routines', icon: '⏱', label: 'Routines' },
    { key: 'science',  icon: '🔬', label: 'Science' },
  ],
  more: [
    { key: 'nourish',   icon: '🥗', label: 'Nourish' },
    { key: 'community', icon: '👥', label: 'Community' },
    { key: 'planet',    icon: '🌍', label: 'Planet' },
    { key: 'planner',  icon: '📅', label: 'Planner' },
    { key: 'roadmap',  icon: '🗺️', label: 'Roadmap' },
    { key: 'about',    icon: 'ℹ️', label: 'About' },
    { key: 'settings', icon: '⚙️', label: 'Settings' },
  ],
};

// Which group (if any) a tab belongs to — drives sidebar highlight + SubNav.
const groupOf = (tabKey) => {
  for (const g of Object.keys(GROUPS)) {
    if (GROUPS[g].some(i => i.key === tabKey)) return g;
  }
  return null;
};

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

// ── SVG accessory overlays — drawn in code, render over the avatar circle ──
// size prop lets the tile (96px) and companion tab (130px) both use this.
function AvatarAccessoryOverlay({ itemKey, size=130 }) {
  if (!itemKey) return null;
  const overlays = {
    bow: (
      <svg {...{width:size,height:size}} viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        <path d="M48 30 C44 22 56 18 65 23 C74 18 86 22 82 30 C76 28 70 26 65 23 C60 26 54 28 48 30Z" fill="#e8a8b8"/>
        <path d="M48 30 C44 38 56 40 65 36 C74 40 86 38 82 30 C76 32 70 34 65 36 C60 34 54 32 48 30Z" fill="#e8a8b8"/>
        <circle cx="65" cy="30" r="5" fill="#d4788a"/>
      </svg>
    ),
    flower_crown: (
      <svg {...{width:size,height:size}} viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        {[[65,10],[50,16],[80,16],[38,28],[92,28]].map(([cx,cy],i)=>(
          <g key={i}>
            <circle cx={cx} cy={cy} r="7" fill="#f8c8a0"/>
            <circle cx={cx} cy={cy} r="3.5" fill="#e8882a"/>
          </g>
        ))}
      </svg>
    ),
    star_sparkles: (
      <svg {...{width:size,height:size}} viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        {[[12,22,'#f4d03f',14],[112,18,'#f4d03f',12],[8,72,'#a8d8a8',10],[118,68,'#a8d8a8',10],[65,5,'#f4d03f',16],[30,105,'#f4d03f',10],[100,108,'#e8c0d8',10]].map(([x,y,c,s],i)=>(
          <text key={i} x={x} y={y} fontSize={s} fill={String(c)} textAnchor="middle">✦</text>
        ))}
      </svg>
    ),
    crown: (
      <svg {...{width:size,height:size}} viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        <path d="M42 36 L50 16 L65 28 L80 16 L88 36 Z" fill="#d4af6a"/>
        <rect x="40" y="36" width="50" height="8" rx="2" fill="#c49a50"/>
        <circle cx="50" cy="16" r="4" fill="#f0d080"/>
        <circle cx="65" cy="28" r="4" fill="#f0d080"/>
        <circle cx="80" cy="16" r="4" fill="#f0d080"/>
      </svg>
    ),
    wings: (
      <svg {...{width:size,height:size}} viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1}}>
        <path d="M8 72 C-4 52 18 28 42 50 C32 62 26 72 30 82 C20 80 10 78 8 72Z" fill="#8aad8a" opacity="0.75"/>
        <path d="M122 72 C134 52 112 28 88 50 C98 62 104 72 100 82 C110 80 120 78 122 72Z" fill="#8aad8a" opacity="0.75"/>
      </svg>
    ),
    halo: (
      <svg {...{width:size,height:size}} viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        <ellipse cx="65" cy="16" rx="28" ry="7" fill="none" stroke="#4ecb71" strokeWidth="4" opacity="0.9"/>
      </svg>
    ),
    leaf_halo: (
      <svg {...{width:size,height:size}} viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        {[0,40,80,120,160,200,240,280,320].map((angle,i)=>{
          const rad=(angle-90)*Math.PI/180;
          const cx=65+60*Math.cos(rad), cy=65+60*Math.sin(rad);
          return <ellipse key={i} cx={cx} cy={cy} rx="5" ry="9" fill="#7ab85a" opacity="0.85" transform={`rotate(${angle},${cx},${cy})`}/>;
        })}
      </svg>
    ),
  };
  return overlays[itemKey] || null;
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

// Thresholds required to reach 100% health.
// Shown in the stats modal so users know exactly what to aim for.
const PILLAR_THRESHOLDS = {
  water:       { hit: (v) => v >= 2.5,           label: '2.5L water'        },
  mindfulness: { hit: (v) => v >= 10,             label: '10 min mindfulness' },
  movement:    { hit: (v) => v >= 15,             label: '15 min movement'   },
  sleep:       { hit: (v) => v >= 6,              label: '6+ hours sleep'    },
};

const STAT_GOALS = {
  water:       { icon:'💧', label:'Hydration', reward:1, type:'add', min:0,
                 increments:[{amt:0.25,label:'Glass +250ml'},{amt:0.5,label:'Bottle +500ml'}],
                 fmt:(v)=>`${trimNum(v)}L`, hit:PILLAR_THRESHOLDS.water.hit, goalText:'2.5L' },
  mindfulness: { icon:'🧘', label:'Mindfulness', reward:2, type:'add', min:0,
                 increments:[{amt:5,label:'+5 min'},{amt:10,label:'+10 min'}],
                 fmt:(v)=>`${trimNum(v)} min`, hit:PILLAR_THRESHOLDS.mindfulness.hit, goalText:'10 min' },
  movement:    { icon:'🏃', label:'Movement', reward:1, type:'add', min:0, exact:true,
                 increments:[{amt:10,label:'+10 min'},{amt:30,label:'+30 min'}],
                 fmt:(v)=>`${v} min`, hit:PILLAR_THRESHOLDS.movement.hit, goalText:'15 min' },
  sleep:       { icon:'😴', label:'Sleep', reward:2, type:'stepper', min:0, max:14, step:0.5,
                 fmt:(v)=>`${trimNum(v)}h`, hit:PILLAR_THRESHOLDS.sleep.hit, goalText:'6–9h' },
};
const STAT_ORDER = ['water','mindfulness','movement','sleep'];
function trimNum(n){ return Number.isInteger(Number(n)) ? String(Number(n)) : String(Number(Number(n).toFixed(2))); }

const PILL = {
  padding:'8px 14px', borderRadius:99, fontSize:13, fontWeight:600, cursor:'pointer',
  fontFamily:'DM Sans,sans-serif', border:'1.5px solid #b5ceb5', background:'#f3f8f3',
  color:'#3a6a3a', whiteSpace:'nowrap',
};

function StatsLogModal({ manualStats, setManualStats, awardStatHealth, setStatsLogOpen }) {
  const today = new Date().toISOString().split('T')[0];
  const val = (k) => Number(manualStats[k] || 0);

  async function applyChange(key, raw) {
    const g = STAT_GOALS[key];
    let v = Math.max(g.min ?? 0, raw);
    if (g.max != null) v = Math.min(g.max, v);
    v = Number(v.toFixed(2));
    const updated = { ...manualStats, date: today, [key]: v };
    const afterAward = await awardStatHealth(updated);
    setManualStats(afterAward);
    localStorage.setItem('bloom-daily-stats', JSON.stringify(afterAward));
  }

  return (
    <div onClick={()=>setStatsLogOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:24,padding:28,width:440,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:22}}>Today&apos;s wellbeing</h2>
          <button onClick={()=>setStatsLogOpen(false)} style={{width:30,height:30,borderRadius:'50%',border:'1.5px solid #e8e4de',background:'transparent',cursor:'pointer',fontSize:15}}>✕</button>
        </div>
        {/* 100% health requirements — always visible so users know exactly what to aim for */}
        <div style={{background:'linear-gradient(135deg,#f3f8f3,#e8f0e8)',border:'1.5px solid #b5ceb5',borderRadius:14,padding:'12px 14px',marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#5a7a5a',marginBottom:8}}>To reach 100% health today</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            {[
              {icon:'💧',label:'2.5L water',      k:'water'},
              {icon:'🧘',label:'10 min mindful',  k:'mindfulness'},
              {icon:'🏃',label:'15 min movement', k:'movement'},
              {icon:'😴',label:'6+ hours sleep',  k:'sleep'},
            ].map(({icon,label,k})=>{
              const met = PILLAR_THRESHOLDS[k].hit(Number(manualStats[k]||0));
              return (
                <div key={k} style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:met?'#3a6a3a':'#888'}}>
                  <div style={{width:18,height:18,borderRadius:'50%',background:met?'#8aad8a':'#e8e4de',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'white',flexShrink:0,fontWeight:700}}>
                    {met?'✓':''}
                  </div>
                  <span style={{fontWeight:met?600:400}}>{icon} {label}</span>
                </div>
              );
            })}
          </div>
          <div style={{fontSize:11,color:'#7a9a7a',marginTop:10,paddingTop:8,borderTop:'1px solid #c5ddc5'}}>
            + always −5% health if no meals logged in Nourish today
          </div>
        </div>
        <p style={{fontSize:13,color:'#888',marginBottom:16}}>Log as you go — each goal earns health ❤️</p>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {STAT_ORDER.map(key=>{
            const g = STAT_GOALS[key];
            const v = val(key);
            const done = g.hit(v);
            return (
              <div key={key} style={{border:`1.5px solid ${done?'#8aad8a':'#e8e4de'}`,background:done?'#f8fcf8':'white',borderRadius:16,padding:14,transition:'all 0.2s'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:34,height:34,borderRadius:10,background:'#f7f3ed',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>{g.icon}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'#2a2a2a'}}>{g.label}</div>
                      <div style={{fontSize:11,color:done?'#5a7a5a':'#aaa'}}>Target {g.goalText} for 100%{done?'  ·  ✓':''}</div>
                    </div>
                  </div>
                  <div style={{fontFamily:'Instrument Serif,serif',fontSize:22,color:done?'#5a7a5a':'#1a1a1a'}}>{g.fmt(v)}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {g.type==='stepper' ? (
                    <>
                      <button onClick={()=>applyChange(key, v - g.step)} style={{...PILL,width:42,padding:'8px 0',textAlign:'center'}}>−</button>
                      <button onClick={()=>applyChange(key, v + g.step)} style={{...PILL,width:42,padding:'8px 0',textAlign:'center'}}>+</button>
                      <span style={{fontSize:11,color:'#bbb'}}>half-hour steps</span>
                    </>
                  ) : (
                    <>
                      {g.increments.map(inc=>(
                        <button key={inc.label} onClick={()=>applyChange(key, v + inc.amt)} style={PILL}>{inc.label}</button>
                      ))}
                      {g.exact && (
                        <input type="number" inputMode="numeric" placeholder="exact"
                          onKeyDown={e=>{ if(e.key==='Enter' && e.target.value){ applyChange(key, parseFloat(e.target.value)); e.target.value=''; e.target.blur(); } }}
                          onBlur={e=>{ if(e.target.value){ applyChange(key, parseFloat(e.target.value)); e.target.value=''; } }}
                          style={{width:80,padding:'7px 10px',border:'1.5px solid #e8e4de',borderRadius:99,fontSize:13,fontFamily:'DM Sans,sans-serif',outline:'none',color:'#2a2a2a'}} />
                      )}
                    </>
                  )}
                  {v>0 && (
                    <button onClick={()=>applyChange(key, 0)} title="Reset" style={{marginLeft:'auto',width:34,height:34,borderRadius:'50%',border:'1.5px solid #e8e4de',background:'transparent',cursor:'pointer',fontSize:14,color:'#aaa',flexShrink:0}}>↺</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{fontSize:11,color:'#bbb',textAlign:'center',marginTop:16}}>Each goal rewards health once per day. Resetting keeps what you already earned.</p>
      </div>
    </div>
  );
}

function NotionSyncCard({ toast }) {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);

  async function runSync() {
    setStatus('loading');
    setResult(null);
    try {
      // NOTE: uses a NEXT_PUBLIC_ copy of the sync secret so this button can
      // call the route directly from the browser. That means the secret is
      // visible in the client bundle to anyone who inspects it — consistent
      // with this app's existing security model (permissive RLS, gating done
      // at the component level, no real auth layer) rather than a new
      // weaker pattern. The route itself is unchanged and still works via
      // the plain URL + server-side NOTION_SYNC_SECRET for manual/cron use.
      const secret = process.env.NEXT_PUBLIC_NOTION_SYNC_SECRET;
      const res = await fetch(`/api/admin/sync-notion?secret=${encodeURIComponent(secret || '')}`);
      const data = await res.json();
      if (data.ok) {
        setStatus('done');
        setResult(data);
        toast('✅ Notion sync complete');
      } else {
        setStatus('error');
        setResult(data);
        toast('⚠️ Sync failed — see details below');
      }
    } catch (e) {
      setStatus('error');
      setResult({ error: 'Network error', notionError: String(e) });
      toast('⚠️ Sync failed — see details below');
    }
  }

  return (
    <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:'18px 20px',marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:10}}>Notion Library (admin)</div>
      <p style={{fontSize:12,color:'#888',marginBottom:14,lineHeight:1.5}}>Pulls your Virtual Pantry and published recipes from Notion into the app.</p>
      <button onClick={runSync} disabled={status==='loading'}
        style={{width:'100%',padding:'11px',borderRadius:10,border:'none',background:status==='loading'?'#c8ddc8':'#5a7a5a',color:'white',fontWeight:600,fontSize:13,cursor:status==='loading'?'default':'pointer',fontFamily:'DM Sans,sans-serif'}}>
        {status==='loading' ? 'Syncing…' : '🔄 Sync Notion Library'}
      </button>
      {status==='done' && result && (
        <div style={{marginTop:12,fontSize:12,color:'#5a7a5a',lineHeight:1.7}}>
          🌿 Pantry: {result.pantry?.synced}/{result.pantry?.total} synced<br/>
          📖 Recipes: {result.recipes?.synced}/{result.recipes?.total} synced
          {result.recipes?.skippedNotPublished > 0 && <> · {result.recipes.skippedNotPublished} not yet published</>}
        </div>
      )}
      {status==='error' && result && (
        <div style={{marginTop:12,fontSize:12,color:'#a04040',lineHeight:1.6,wordBreak:'break-word'}}>
          {result.notionError || result.error || 'Unknown error'}
        </div>
      )}
    </div>
  );
}

function StreakHistoryModal({ habit, streakData, onClose }) {
  if (!habit) return null;
  const current = streakData?.current_streak || 0;
  const longest = streakData?.longest_streak || 0;
  const lastCompleted = streakData?.last_completed || 'Never';

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:24,padding:28,width:460,maxWidth:'95vw',maxHeight:'85vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:24,marginBottom:4}}>{habit.emoji} {habit.name}</h2>
            <p style={{fontSize:13,color:'#888'}}>Streak History</p>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:'50%',border:'1.5px solid #e8e4de',background:'transparent',cursor:'pointer',fontSize:15}}>✕</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:24}}>
          <div style={{background:'#f3f8f3',border:'1.5px solid #8aad8a',borderRadius:16,padding:18,textAlign:'center'}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#5a7a5a',marginBottom:8}}>Current Streak</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:700,color:'#8aad8a',marginBottom:4}}>{current}</div>
            <div style={{fontSize:12,color:'#888'}}>days</div>
          </div>
          <div style={{background:'#fdf8ed',border:'1.5px solid #d4af6a',borderRadius:16,padding:18,textAlign:'center'}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#c4a882',marginBottom:8}}>Longest Streak</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:700,color:'#d4af6a',marginBottom:4}}>{longest}</div>
            <div style={{fontSize:12,color:'#888'}}>days</div>
          </div>
        </div>
        <div style={{background:'#f7f3ed',borderRadius:14,padding:16,marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#888',marginBottom:10}}>Last Completed</div>
          <div style={{fontSize:14,fontWeight:500,color:'#2a2a2a'}}>{lastCompleted==='Never'?'Not yet completed':new Date(lastCompleted).toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        </div>
        {longest > 0 && (
          <div style={{background:'linear-gradient(135deg,#f3f8f3,#e8f0e8)',borderRadius:14,padding:16,border:'1px solid #b5ceb5'}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#5a7a5a',marginBottom:8}}>Milestones</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[{days:7,emoji:'🔥',label:'Week Warrior'},{days:14,emoji:'⚡',label:'Fortnight Force'},{days:21,emoji:'🌟',label:'Habit Formed'},{days:30,emoji:'🏆',label:'Month Master'},{days:60,emoji:'💎',label:'Diamond Streak'},{days:90,emoji:'👑',label:'Legend Status'}].map(m=>{
                const achieved=longest>=m.days;
                return(
                  <div key={m.days} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:achieved?'white':'transparent',borderRadius:10,border:achieved?'1px solid #b5ceb5':'1px dashed #e8e4de'}}>
                    <span style={{fontSize:20,opacity:achieved?1:0.3}}>{m.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:achieved?'#5a7a5a':'#aaa'}}>{m.label}</div>
                      <div style={{fontSize:11,color:'#888'}}>{m.days} days</div>
                    </div>
                    {achieved&&<div style={{fontSize:11,fontWeight:700,color:'#8aad8a'}}>✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <button onClick={onClose} style={{width:'100%',marginTop:20,padding:13,background:'#8aad8a',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
          Close
        </button>
      </div>
    </div>
  );
}

function SustainUnlockModal({ onClose }) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:250}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(135deg,#f3f8f3,#e8f0e8)',borderRadius:24,padding:36,width:520,maxWidth:'95vw',textAlign:'center',border:'2px solid #8aad8a',boxShadow:'0 8px 32px rgba(90,122,90,0.3)'}}>
        <div style={{fontSize:48,marginBottom:16}}>🌟</div>
        <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:28,marginBottom:12,color:'#1a1a1a'}}>Sustain Mode Unlocked!</h2>
        <p style={{fontSize:15,color:'#5a7a5a',lineHeight:1.7,marginBottom:24}}>
          You&apos;ve completed your 4-week wellness foundation! Your baseline is built. Now it&apos;s time to sustain what you&apos;ve created.
        </p>
        <div style={{background:'white',borderRadius:16,padding:20,marginBottom:24,textAlign:'left'}}>
          <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#888',marginBottom:14}}>What&apos;s Next</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {icon:'✅',text:'Keep tracking your Week 4 habits — they\'re your core stack now'},
              {icon:'➕',text:'Add custom habits anytime to expand your routine'},
              {icon:'🔥',text:'Build streaks and earn rewards indefinitely'},
              {icon:'🌍',text:'Continue generating Green Energy for the planet'},
            ].map((item,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
                <span style={{fontSize:13,color:'#444',lineHeight:1.6}}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#8aad8a,#5a7a5a)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',boxShadow:'0 4px 14px rgba(90,122,90,0.3)'}}>
          Continue Building 🌱
        </button>
      </div>
    </div>
  );
}

function HabitIntroModal({ onClose }) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:250}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(135deg,#f3f8f3,#e8f0e8)',borderRadius:24,padding:36,width:520,maxWidth:'95vw',textAlign:'center',border:'2px solid #8aad8a',boxShadow:'0 8px 32px rgba(90,122,90,0.3)'}}>
        <div style={{fontSize:48,marginBottom:16}}>🌿</div>
        <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:26,marginBottom:12,color:'#1a1a1a'}}>How habits work here</h2>
        <p style={{fontSize:14,color:'#5a7a5a',lineHeight:1.7,marginBottom:22}}>
          Bloom treats habits as something you earn, not something you're assigned.
        </p>
        <div style={{background:'white',borderRadius:16,padding:20,marginBottom:22,textAlign:'left'}}>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {[
              {icon:'🌱',title:'Start with a frequency',text:'Every new habit begins by setting a weekly target — 3x a week, daily, whatever fits your life right now. No pressure to go all-in from day one.'},
              {icon:'📈',title:'Prove it on your own terms',text:'Research puts habit formation at 18–254 days, averaging around 66. Hit your target consistently and the habit graduates — it becomes part of who you are.'},
              {icon:'↩️',title:'Slip without guilt',text:"Miss a week? The habit quietly goes back to building mode, ready to re-earn. Nothing resets your history. Nothing punishes you. It's just honest about where things stand."},
            ].map((item,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12}}>
                <span style={{fontSize:20,flexShrink:0}}>{item.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'#2a2a2a',marginBottom:2}}>{item.title}</div>
                  <div style={{fontSize:12.5,color:'#666',lineHeight:1.6}}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#8aad8a,#5a7a5a)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',boxShadow:'0 4px 14px rgba(90,122,90,0.3)'}}>
          Got it 🌱
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
  const [suggestedHabits, setSuggestedHabits] = useState([]); // Home "Build Toward" section
  const [linkedGoalsByHabitKey, setLinkedGoalsByHabitKey] = useState({}); // habit_key -> goal row, for habits currently being re-proven
  const [linkedGoalWeekCounts, setLinkedGoalWeekCounts] = useState({}); // goal id -> count logged this week
  const [goalsLoggedToday, setGoalsLoggedToday]     = useState(() => {
    // Persist which goals were logged today so page refresh doesn't reset progress
    try {
      const today = new Date().toISOString().split('T')[0];
      const raw = JSON.parse(localStorage.getItem('bloom-goals-today') || '{}');
      return new Set(raw[today] || []);
    } catch { return new Set(); }
  });
  const [companionView, setCompanionView] = useState('companion'); // 'companion' | 'decorate'
  const [donateOpen, setDonateOpen] = useState(false);
  const [reflOpen, setReflOpen]     = useState(false);
  const [refl, setRefl]             = useState({ worked:'', challenging:'', energy:3 });
  const [inventory, setInventory]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [week, setWeek]             = useState(1);
  const [day, setDay]               = useState(1);
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

  const [ownedScenes, setOwnedScenes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-owned-scenes') || '["default"]'); } catch { return ['default']; }
  });
  const [tapState, setTapState] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('bloom-love-taps') || '{}');
      const THREE_HOURS = 3 * 60 * 60 * 1000;
      if (!s.windowStart || (Date.now() - s.windowStart) >= THREE_HOURS) return { windowStart: Date.now(), count: 0 };
      return s;
    } catch { return { windowStart: Date.now(), count: 0 }; }
  });

  const [routineFreqs, setRoutineFreqs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-routine-freqs') || '{}'); } catch { return {}; }
  });
  const [routineLog, setRoutineLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-routine-log') || '{}'); } catch { return {}; }
  });

  const [selectedDay, setSelectedDay] = useState(null);
  const [dayStats, setDayStats]       = useState(null);
  const [dayStatsLoading, setDayStatsLoading] = useState(false);
  const [streaks, setStreaks]         = useState({});
  const [removedHabits, setRemovedHabits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-removed-habits') || '[]'); } catch { return []; }
  });
  const [weeklyData, setWeeklyData]   = useState({});
  const [streakHistoryOpen, setStreakHistoryOpen] = useState(false);
  const [streakHistoryHabit, setStreakHistoryHabit] = useState(null);
  const [sustainMode, setSustainMode] = useState(false);
  const [sustainUnlockOpen, setSustainUnlockOpen] = useState(false);
  const [habitIntroOpen, setHabitIntroOpen] = useState(false);
  const [badHabitOpen, setBadHabitOpen] = useState(false);
  const [modeEditorOpen, setModeEditorOpen] = useState(false);

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
  const checkBadHabitDailyReset = useStore(s=>s.checkBadHabitDailyReset);
  const applyDailyDecay  = useStore(s=>s.applyDailyDecay);
  const lastDecayDate    = useStore(s=>s.lastDecayDate);
  const energyMode          = useStore(s=>s.energyMode);
  const habitsByMode        = useStore(s=>s.habitsByMode);
  const energyModeSetupDone = useStore(s=>s.energyModeSetupDone);
  const avatarSkin      = useStore(s=>s.avatarSkin);
  const avatarHair      = useStore(s=>s.avatarHair);
  const avatarHairColor = useStore(s=>s.avatarHairColor);
  const avatarEyes      = useStore(s=>s.avatarEyes);
  const avatarMouth     = useStore(s=>s.avatarMouth);
  const avatarAccessory = useStore(s=>s.avatarAccessory);
  const avatarBg        = useStore(s=>s.avatarBg);
  const avatarScene     = useStore(s=>s.avatarScene);
  const setAvatarScene  = useStore(s=>s.setAvatarScene);
  const isRestDayToday  = useStore(s=>s.isRestDayToday);

  const isAdmin = userId === ADMIN_USER_ID;

  const arch = (archetypeKey && ARCHETYPE_INFO[archetypeKey])
    ? ARCHETYPE_INFO[archetypeKey]
    : { name: archetypeName||'Wellness Journey', icon: archetypeIcon||'🌿' };

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

  async function releaseHabitFromCard(habitKey, goalId){
    if(goalId){
      const { error } = await supabase.from('goals').update({ status: 'archived' }).eq('id', goalId);
      if(error){ toast('Could not release — try again'); return; }
    }
    const updated=[...removedHabits, habitKey];
    setRemovedHabits(updated);
    localStorage.setItem('bloom-removed-habits', JSON.stringify(updated));
    setLinkedGoalsByHabitKey(prev=>{ const n={...prev}; delete n[habitKey]; return n; });
    toast("✓ Released — restore it from the removed list whenever you're ready");
  }

  const baseHabits = habits.filter(h => !removedHabits.includes(h.key));
  const allHabits = (() => {
    if (!energyModeSetupDone || !energyMode || !habitsByMode) return [...baseHabits, ...customHabits];
    const modeKeys = habitsByMode[energyMode] || [];
    const filtered = baseHabits.filter(h => modeKeys.includes(h.key));
    // Defensive fallback — if the mode's saved habit stack has gone stale
    // (e.g. this week's habits carry different keys than whenever Energy
    // Mode was set up), never silently render zero habits. Show the full
    // base list instead of an empty screen.
    return (filtered.length > 0 ? filtered : baseHabits).concat(customHabits);
  })();
  // Progress: normal habits from done[], re-proving habits by frequency-aware check
  //   daily (7x/week): logged today counts as done
  //   sub-daily:       on track for the week counts as done
  //                    (logsThisWeek >= target × daysElapsed/7, min 1)
  const dayOfWeek = new Date().getDay(); // 0=Sun … 6=Sat
  const daysElapsed = dayOfWeek === 0 ? 7 : dayOfWeek; // days into current week
  const reProvingDoneCount = allHabits.filter(h => {
    const lg = linkedGoalsByHabitKey[h.key];
    if (!lg || lg.state !== 'goal') return false;
    const target = lg.weekly_target || 1;
    const logsThisWeek = linkedGoalWeekCounts[lg.id] || 0;
    if (target >= 7) {
      // Daily habit — did they log today?
      return goalsLoggedToday.has(lg.id);
    } else {
      // Sub-daily — are they on track proportionally?
      const expectedSoFar = Math.max(1, Math.round(target * daysElapsed / 7));
      return logsThisWeek >= expectedSoFar;
    }
  }).length;
  const doneCount = done.filter(k => !linkedGoalsByHabitKey[k]).length + reProvingDoneCount;
  const pct = allHabits.length>0 ? Math.round((doneCount/allHabits.length)*100) : 0;
  const mood = health>70 ? 'Thriving · Streak bonus 🔥' : health>40 ? 'Building momentum 💪' : 'Needs care 🌱';
  const equipped = inventory.find(i=>i.equipped);

  useEffect(()=>{
    checkDailyReset();
    checkBadHabitDailyReset();
    if(userId){ load(); loadInv(); loadStreaks(); loadWeeklyData(); loadBadHabitsFromDb(); loadSuggestedHabits(); loadLinkedGoals(); }
  },[userId]);

  // Re-check suggestions + re-proving state every time Home is actually
  // viewed — not just once per session. Without this, adopting a suggestion
  // from the Goals tab (or anywhere else) never gets reflected back here,
  // since nothing else ever tells this list to recompute.
  useEffect(()=>{
    if(userId && tab==='dashboard'){ loadSuggestedHabits(); loadLinkedGoals(); }
  },[tab, userId]);

  // ── Award health when a self-care goal is reached (once/day per stat) ──
  // The 4 pillars that must all be recorded before health can reach 100
  const CORE_PILLARS = ['water', 'mindfulness', 'movement', 'sleep'];

  function corePillarsCap(stats) {
    // Step 1: pillars determine the base ceiling (90 or 100)
    const allPillarsMet = CORE_PILLARS.every(k => PILLAR_THRESHOLDS[k].hit(Number(stats[k] || 0)));
    const pillarCap = allPillarsMet ? 100 : 90;

    // Step 2: nourish is always an independent -5% if nothing logged today,
    // regardless of whether pillars are met or not.
    let nourishLogged = false;
    try {
      const today = new Date().toISOString().split('T')[0];
      const foods = JSON.parse(localStorage.getItem('bloom-nourish-foods') || '{}');
      const todayFoods = foods[today] || [];
      const all = JSON.parse(localStorage.getItem('bloom-nourish') || '{}');
      const todayData = all[today] || {};
      nourishLogged = todayFoods.length > 0 || (todayData.categories || []).length > 0;
    } catch {}

    return nourishLogged ? pillarCap : Math.max(0, pillarCap - 5);
    // Examples:
    //   pillars met + nourish logged     → 100%
    //   pillars met + no nourish         →  95%
    //   pillars not met + nourish logged →  90%
    //   pillars not met + no nourish     →  85%
  }

  function getPillarStatus(stats) {
    // Returns array of { key, label, threshold, met, value } for display in modal
    return CORE_PILLARS.map(k => ({
      key: k,
      icon: STAT_GOALS[k].icon,
      label: STAT_GOALS[k].label,
      threshold: PILLAR_THRESHOLDS[k].label,
      met: PILLAR_THRESHOLDS[k].hit(Number(stats[k] || 0)),
      value: STAT_GOALS[k].fmt(Number(stats[k] || 0)),
    }));
  }

  async function awardStatHealth(stats) {
    const awarded = { ...(stats.awarded || {}) };
    let gained = 0;
    const labels = [];
    for (const key of Object.keys(STAT_GOALS)) {
      const v = stats[key];
      if (v != null && !awarded[key] && STAT_GOALS[key].hit(v)) {
        awarded[key] = true;
        gained += STAT_GOALS[key].reward;
        labels.push(STAT_GOALS[key].label);
      }
    }
    if (!gained) return stats;
    // Cap at 99 unless all 4 pillars have been recorded today
    const cap = corePillarsCap(stats);
    const nh = Math.min(cap, health + gained);
    setStats({ health: nh });
    if (userId) {
      try { await supabase.from('user_stats').update({ health: nh }).eq('user_id', userId); } catch {}
    }
    toast(labels.length === 1
      ? `${labels[0]} goal reached · +${gained} health ❤️`
      : `${labels.length} goals reached · +${gained} health ❤️`);
    // If they just hit 99 with all habits done, nudge them to log pillars
    if (cap <= 90) {
      setTimeout(() => toast('💡 Hit 2.5L water · 10 min mindfulness · 15 min movement · 6h sleep to unlock health above 90%'), 2500);
    } else if (cap === 95) {
      setTimeout(() => toast('🍽️ Log a meal in Nourish to reach 100% health'), 2500);
    }
    return { ...stats, awarded };
  }

  // ── Show yourself some love tap mechanic ──
  async function handleLoveTap(e) {
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const now = Date.now();
    let current = tapState;
    if ((now - current.windowStart) >= THREE_HOURS) current = { windowStart: now, count: 0 };
    if (current.count >= 10) {
      const minsLeft = Math.ceil((THREE_HOURS - (now - current.windowStart)) / 60000);
      toast(`💕 Come back in ${minsLeft} min for more self-love!`);
      return;
    }
    const newCount = current.count + 1;
    const newState = { windowStart: current.windowStart, count: newCount };
    setTapState(newState);
    localStorage.setItem('bloom-love-taps', JSON.stringify(newState));
    // Floating heart
    const container = document.getElementById('avatar-hearts');
    if (container) {
      const heart = document.createElement('div');
      heart.textContent = ['💕','❤️','💚','🌿','✨'][Math.floor(Math.random()*5)];
      const rect = container.getBoundingClientRect();
      const x = e ? (e.clientX - rect.left - 10) : 55;
      const y = e ? (e.clientY - rect.top - 10) : 55;
      heart.style.cssText = `position:absolute;left:${x}px;top:${y}px;font-size:22px;pointer-events:none;animation:heartFloat 1.2s ease-out forwards;z-index:10;`;
      container.appendChild(heart);
      setTimeout(()=>heart.remove(), 1200);
    }
    if (newCount === 10) {
      const nh = Math.min(100, health + 1);
      setStats({ health: nh });
      if (userId) { try { await supabase.from('user_stats').update({ health: nh }).eq('user_id', userId); } catch {} }
      toast('💕 10 taps of self-love · +1 health!');
    }
  }

  // ── Buy or activate a scenery ──
  async function buyScene(scene) {
    const alreadyOwned = ownedScenes.includes(scene.key) || scene.cost === 0;
    if (!alreadyOwned) {
      if (coins < scene.cost) { toast('🪙 Not enough coins!'); return; }
      const nc = coins - scene.cost;
      await supabase.from('user_stats').update({ coins: nc }).eq('user_id', userId);
      setStats({ coins: nc });
      const updated = [...ownedScenes, scene.key];
      setOwnedScenes(updated);
      localStorage.setItem('bloom-owned-scenes', JSON.stringify(updated));
      toast(`🎨 ${scene.name} unlocked!`);
    }
    setAvatarScene(scene.key);
    if (userId) { try { await supabase.from('users').update({ avatar_scene: scene.key }).eq('id', userId); } catch {} }
  }

  async function load() {
    try {
      const {data:u} = await supabase.from('users').select('*').eq('id',userId).single();
      if(u){
        let sd = u.program_start_date;
        if(!sd){ sd=new Date().toISOString(); await supabase.from('users').update({program_start_date:sd}).eq('id',userId); }
        const w=getCurrentWeek(sd), d=getDayOfWeek(sd);
        const inSustainMode = u.sustain_mode !== undefined ? (u.sustain_mode || false) : false;
        setSustainMode(inSustainMode);
        // Load saved scene
        if (u.avatar_scene) setAvatarScene(u.avatar_scene);
        if(w > 4 && !inSustainMode){
          try {
            await supabase.from('users').update({sustain_mode:true}).eq('id',userId);
            setSustainMode(true);
            setSustainUnlockOpen(true);
          } catch(e) {
            console.warn('sustain_mode column not found - run add_sustain_mode.sql migration');
          }
        }
        // One-time intro for the Habit > Goal > Task system — shows once per
        // account, ever. Falls back to always-show if the column isn't run
        // yet (same defensive pattern as sustain_mode above), so it degrades
        // safely rather than crashing if the migration hasn't landed.
        if(!u.seen_habit_intro){
          setHabitIntroOpen(true);
        }
        const displayWeek = inSustainMode ? 4 : Math.min(w, 4);
        setWeek(displayWeek);
        setDay(d);
        if(!inSustainMode && d===1&&w>1&&w<=4&&(u.current_week||1)<w){
          const {data:r}=await supabase.from('weekly_reflections').select('id').eq('user_id',userId).eq('week_number',w-1).single();
          if(!r) setReflOpen(true);
        }
        const src = archetypeKey||u.chronotype||'steadybuilder';
        setHabits(getHabitsForUser(src, displayWeek));
        if((u.current_week||1)!==displayWeek && !inSustainMode) await supabase.from('users').update({current_week:displayWeek}).eq('id',userId);
      }
      const {data:st}=await supabase.from('user_stats').select('*').eq('user_id',userId).single();
      if(st) setStats({health:st.health,coins:st.coins,greenEnergy:st.green_energy,level:st.level});
      const { decayed, newHealth } = applyDailyDecay();
      if(decayed){
        await supabase.from('user_stats').update({ health: newHealth }).eq('user_id', userId);
      }
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

  async function loadWeeklyData(){
    if(!userId) return;
    const dates = [];
    for(let i=6; i>=0; i--){
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const {data} = await supabase.from('habit_completions')
      .select('date, habit_key')
      .eq('user_id', userId)
      .in('date', dates);
    if(data){
      const map = {};
      data.forEach(c => {
        if(!map[c.date]) map[c.date] = [];
        map[c.date].push(c.habit_key);
      });
      setWeeklyData(map);
    }
  }

  async function loadBadHabitsFromDb(){
    if(!userId) return;
    try {
      const {data} = await supabase.from('bad_habits').select('*').eq('user_id', userId);
      if(data && data.length > 0){
        const { badHabits: existing } = useStore.getState();
        data.forEach(row => {
          const bh = { key:row.key, name:row.name, emoji:row.emoji, type:row.type, unit:row.unit, threshold:row.threshold, healthPenalty:row.health_penalty };
          if(!existing.some(h => h.key === row.key)) useStore.getState().addBadHabit(bh);
        });
      }
    } catch(e){ console.error('loadBadHabitsFromDb', e); }
  }

  // ── Home: "Build Toward" — suggested habits, leading with the destination,
  // not the weekly mechanics. Adopting one creates the underlying Goal with
  // a sensible starting frequency already set — no form, one tap.
  async function loadSuggestedHabits(){
    if(!userId) return;
    try{
      const existingGoals = await getGoals(userId);
      const existingNames = new Set(existingGoals.map(g=>g.name.toLowerCase()));
      const src = archetypeKey || 'default';
      const pool = SUGGESTED_HABITS_TO_BUILD[src] || SUGGESTED_HABITS_TO_BUILD.default;
      setSuggestedHabits(pool.filter(sg=>!existingNames.has(sg.name.toLowerCase())));
    } catch(e){ console.error('loadSuggestedHabits', e); }
  }

  async function adoptSuggestedHabit(sg){
    const goal = await createGoal(userId, { name: sg.name, emoji: sg.emoji, category: sg.category, weekly_target: sg.weekly_target, is_custom: false });
    if(goal){
      setSuggestedHabits(prev=>prev.filter(h=>h.name!==sg.name));
      toast(`🎯 Building toward: ${sg.name}`);
      setTab('habits');
    }
  }

  // ── Demoted habits: any habit with no recent streak gets a goal-styled
  // prompt instead of a checkbox — never silently guessing a frequency for
  // them. Loaded once alongside everything else on userId.
  async function loadLinkedGoals(){
    if(!userId) return;
    try{
      const allGoals = await getGoals(userId);
      const byKey = {};
      allGoals.forEach(g => { if(g.linked_habit_key) byKey[g.linked_habit_key] = g; });
      setLinkedGoalsByHabitKey(byKey);

      const weekStart = getWeekStart();
      const counts = {};
      for(const g of Object.values(byKey)){
        if(g.state === 'goal') counts[g.id] = await getGoalWeekCount(g.id, weekStart);
      }
      setLinkedGoalWeekCounts(counts);
    } catch(e){ console.error('loadLinkedGoals', e); }
  }

  // A habit reads as "stale" — needs a goal prompt instead of a checkbox —
  // when it has no recent completion. Recency, not just streak value, since
  // an old frozen streak number can otherwise lie about something abandoned.
  function isHabitStale(habitKey){
    const s = streaks[habitKey];
    // New habit with zero history — show normal checkbox, not a "slipped" prompt.
    // Only show the frequency picker if the user has previously done this habit
    // (longest_streak > 0) but hasn't touched it recently.
    if(!s || !s.longest_streak) return false;
    if(!s.current_streak) return true;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now()-86400000).toISOString().split('T')[0];
    return s.last_completed !== today && s.last_completed !== yesterday;
  }

  async function setHabitGoalFrequency(h, weeklyTarget){
    const goal = await createGoal(userId, {
      name: h.name, emoji: h.emoji, category: h.category,
      weekly_target: weeklyTarget, is_custom: false, linked_habit_key: h.key,
    });
    if(goal){
      setLinkedGoalsByHabitKey(prev=>({...prev,[h.key]:goal}));
      setLinkedGoalWeekCounts(prev=>({...prev,[goal.id]:0}));
      const isFirstTime = !streaks[h.key]?.longest_streak;
      toast(`🎯 ${isFirstTime ? `Goal set` : `Building back up`} — ${h.name} ${weeklyTarget}x/week`);
    }
  }

  async function logLinkedGoalProgress(goal){
    const ok = await logGoalInstance(goal.id, userId);
    if(ok){
      setLinkedGoalWeekCounts(prev=>({...prev,[goal.id]:(prev[goal.id]||0)+1}));
      setGoalsLoggedToday(prev=>{
        const next = new Set(prev);
        next.add(goal.id);
        // Persist to localStorage so progress survives a page refresh
        try {
          const today = new Date().toISOString().split('T')[0];
          const raw = JSON.parse(localStorage.getItem('bloom-goals-today') || '{}');
          raw[today] = [...next];
          // Only keep today's entry — auto-clears yesterday
          localStorage.setItem('bloom-goals-today', JSON.stringify({[today]: raw[today]}));
        } catch {}
        return next;
      });
      toast(`✓ ${goal.name} logged`);
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
      if(existing?.last_completed===yesterday){ newStreak=(existing.current_streak||0)+1; }
      else if(existing?.last_completed===today){ return; }
      longest=Math.max(longest, newStreak);
      await supabase.from('habit_streaks').upsert(
        { user_id:userId, habit_key:habitKey, current_streak:newStreak, longest_streak:longest, last_completed:today },
        { onConflict:'user_id,habit_key' }
      );
      setStreaks(prev=>({...prev,[habitKey]:{...prev[habitKey],current_streak:newStreak,longest_streak:longest,last_completed:today}}));
      if(newStreak===7)  toast(`🔥 7-day streak on ${habitKey.replace(/_/g,' ')}! Keep going!`);
      if(newStreak===14) toast(`⚡ 14-day streak! You're on fire!`);
      if(newStreak===21) toast(`🌟 21 days — this is now a habit!`);
      if(newStreak===30) toast(`🏆 30-day streak! Incredible!`);
    } else {
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
    const today=new Date().toISOString().split('T')[0];
    if(!isD){
      if(userId) await supabase.from('habit_completions').insert({user_id:userId,habit_key:h.key,date:today});
      const nc=coins+h.coins,ng=ge+h.ge;
      const habitCap=corePillarsCap(manualStats);
      const nh=Math.min(habitCap,health+3);
      if(userId) await supabase.from('user_stats').update({coins:nc,green_energy:ng,health:nh}).eq('user_id',userId);
      setStats({coins:nc,greenEnergy:ng,health:nh});
      await updateStreak(h.key, true);
      loadWeeklyData();
      toast(`✅ +${h.coins} 🪙${h.ge>0?` +${h.ge} ⚡`:''}`);
    } else {
      if(userId) await supabase.from('habit_completions').delete().eq('user_id',userId).eq('habit_key',h.key).eq('date',today);
      const nc=Math.max(0,coins-h.coins),ng=Math.max(0,ge-h.ge),nh=Math.max(0,health-2);
      if(userId) await supabase.from('user_stats').update({coins:nc,green_energy:ng,health:nh}).eq('user_id',userId);
      setStats({coins:nc,greenEnergy:ng,health:nh});
      await updateStreak(h.key, false);
      loadWeeklyData();
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
    await supabase.from('community_posts').insert({user_id:userId,user_name:name,user_avatar_emoji:avEmoji,post_type:'week_complete',content:`Completed Week ${prev} of my wellness journey! 🌱`});
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

  const NotifButton = () => {
    const [notifState, setNotifState] = useState(() => {
      if (typeof window !== 'undefined' && Notification?.permission === 'granted') return 'granted';
      if (typeof window !== 'undefined' && Notification?.permission === 'denied') return 'denied';
      return 'idle';
    });
    async function handleEnable() {
      setNotifState('loading');
      const timeout = setTimeout(() => setNotifState('idle'), 8000);
      try {
        const permission = await Notification.requestPermission();
        clearTimeout(timeout);
        if (permission === 'granted') {
          setNotifState('granted');
          toast('🔔 Notifications enabled!');
          if (window.OneSignalDeferred) {
            window.OneSignalDeferred.push(async function(OneSignal) {
              try {
                await OneSignal.Notifications.requestPermission();
                const id = OneSignal.User.PushSubscription.id;
                if (id && userId) await supabase.from('users').update({ onesignal_id: id }).eq('id', userId);
              } catch(e) { console.error('OneSignal secondary error:', e); }
            });
          }
        } else { setNotifState('denied'); }
      } catch(e) { clearTimeout(timeout); console.error(e); setNotifState('denied'); }
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
        <button onClick={s.clickable ? handleEnable : undefined}
          style={{ width:'100%', padding:'13px 20px', background:s.bg, color:s.color, border:'none', borderRadius:12, fontSize:13, fontWeight:600, cursor:s.clickable?'pointer':'default', fontFamily:'DM Sans, sans-serif', transition:'all 0.3s', textAlign:'center' }}>
          {s.label}
        </button>
        {notifState === 'granted' && <p style={{ fontSize:11, color:'#5a7a5a', marginTop:6, textAlign:'center' }}>You&apos;ll receive habit reminders and community updates 🌱</p>}
        {notifState === 'denied' && <p style={{ fontSize:11, color:'#888', marginTop:6, textAlign:'center' }}>iPhone: Settings → Safari → scroll to your site → Notifications → Allow</p>}
      </div>
    );
  };

  const DashboardPostCard=()=>{
    const [text, setText] = useState('');
    const [posting, setPosting] = useState(false);
    async function submit() {
      if (!text.trim() || !userId) return;
      setPosting(true);
      const { data, error } = await supabase.from('community_posts').insert({ user_id:userId, user_name:name||'J Bea', user_avatar_emoji:avEmoji||'🌿', content:text.trim(), post_type:'check_in', parent_id:null }).select().single();
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

  const AvatarCard=()=>{
    const THREE_HOURS = 3*60*60*1000;
    const now = Date.now();
    const windowExpired = (now - tapState.windowStart) >= THREE_HOURS;
    const activeTaps = windowExpired ? 0 : tapState.count;
    const tapsFull = activeTaps >= 10;

    const baseEyes = (avatarEyes==='glasses'||avatarEyes==='sunglasses') ? avatarEyes : 'open';
    const { mouth:moodMouth, eyes:moodEyes, label:moodLabel } = getMoodExpression(health, baseEyes, { isRestDay: isRestDayToday });

    const p = new URLSearchParams();
    p.set('seed', name||'wellness');
    p.set('skinColor', avatarSkin);
    p.set('hair', avatarHair);
    p.set('hairColor', avatarHairColor);
    p.set('eyes', moodEyes);
    p.set('mouth', moodMouth);
    p.set('backgroundColor', avatarBg);
    p.set('body', avatarAccessory||'rounded');
    p.set('facialHairProbability','0');
    const dicebearUrl = `https://api.dicebear.com/9.x/personas/svg?${p.toString()}`;

    const currentScene = SCENES.find(s=>s.key===avatarScene) || SCENES[0];

    return(
      <div style={{background:currentScene.gradient,border:'1.5px solid #b5ceb5',borderRadius:20,padding:22,textAlign:'center',transition:'background 0.6s ease'}}>
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'rgba(0,0,0,0.4)',marginBottom:16}}>Your Companion</div>

        {/* Tappable avatar with hearts overlay */}
        <div id="avatar-hearts" onClick={handleLoveTap}
          style={{position:'relative',width:130,height:130,margin:'0 auto 10px',cursor:tapsFull?'default':'pointer'}}>
          <div style={{width:130,height:130,borderRadius:'50%',background:'linear-gradient(135deg,#c8ddc8,#a8c4a8)',display:'flex',alignItems:'center',justifyContent:'center',border:'3px solid rgba(255,255,255,0.7)',boxShadow:'0 8px 28px rgba(90,122,90,0.18)',animation:'breathe 4s ease-in-out infinite',position:'relative',overflow:'hidden'}}>
            <object type="image/svg+xml" data={dicebearUrl} style={{width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}>
              <span style={{fontSize:54}}>🧑‍🌿</span>
            </object>
          </div>
          <AvatarAccessoryOverlay itemKey={equipped?.item_key||null}/>
          <div style={{position:'absolute',bottom:4,right:4,background:'#d4af6a',color:'white',fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:8,zIndex:3}}>Lv.{level}</div>
        </div>

        {/* Tap progress bar */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:tapsFull?'rgba(0,0,0,0.3)':'#c4789a',marginBottom:5,fontWeight:500}}>
            {tapsFull ? '💕 Come back later for more' : '💕 Show yourself some love'}
          </div>
          <div style={{display:'flex',gap:3,justifyContent:'center'}}>
            {Array.from({length:10},(_,i)=>(
              <div key={i} style={{width:7,height:7,borderRadius:'50%',background:i<activeTaps?'#e8a8b8':'rgba(0,0,0,0.12)',transition:'background 0.2s'}}/>
            ))}
          </div>
        </div>

        <div style={{fontFamily:'Instrument Serif,serif',fontSize:17,marginBottom:2}}>{name}</div>
        <div style={{fontSize:11,color:'rgba(0,0,0,0.5)',marginBottom:2}}>{arch.icon} {arch.name}</div>
        <div style={{fontSize:11,color:'rgba(0,0,0,0.35)',marginBottom:10}}>{moodLabel}</div>

        <button onClick={()=>setTab('settings')} style={{fontSize:11,color:'#5a7a5a',background:'rgba(255,255,255,0.5)',border:'1px solid #b5ceb5',borderRadius:99,padding:'4px 12px',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:600,marginBottom:12}}>
          ✏️ Customise avatar
        </button>

        {[{label:'❤️ Health',val:health,fill:health>60?'linear-gradient(90deg,#70c070,#4ea84e)':health>30?'linear-gradient(90deg,#e8b84a,#d4a030)':'linear-gradient(90deg,#e07070,#c04040)'},{label:'📋 Today',val:pct,fill:'linear-gradient(90deg,#8aad8a,#5a7a5a)'}].map(b=>(
          <div key={b.label} style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:500,marginBottom:3}}><span>{b.label}</span><span>{b.val}%</span></div>
            <div style={{height:6,background:'rgba(0,0,0,0.1)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${b.val}%`,background:b.fill,borderRadius:99,transition:'width 0.8s'}}/></div>
          </div>
        ))}

        <div style={{display:'flex',gap:8,marginTop:14}}>
          {[{v:coins.toLocaleString(),l:'🪙 Coins',c:'#d4af6a'},{v:ge,l:'⚡ GE',c:'#38a855'}].map(x=>(
            <div key={x.l} style={{flex:1,background:'rgba(255,255,255,0.6)',border:'1.5px solid rgba(255,255,255,0.8)',borderRadius:10,padding:'9px 6px',textAlign:'center'}}>
              <div style={{fontSize:15,fontWeight:700,fontFamily:'Syne,sans-serif',color:x.c}}>{x.v}</div>
              <div style={{fontSize:10,color:'#888'}}>{x.l}</div>
            </div>
          ))}
        </div>

        <div style={{background:'rgba(232,217,196,0.6)',border:'1px solid rgba(196,168,130,0.5)',borderRadius:10,padding:'8px 10px',fontSize:10,color:'#7a6040',marginTop:12,textAlign:'left',lineHeight:1.5}}>
          🔬 Lally et al. (2010): habits form in 18–254 days — consistency is the key variable.
        </div>
        {isAdmin && lastDecayDate && (
          <div style={{marginTop:8,fontSize:9,color:'rgba(0,0,0,0.2)',textAlign:'center'}}>🕐 Decay last ran: {lastDecayDate}</div>
        )}
      </div>
    );
  };

  const HabitsGrid=()=>(
    <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:8,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888'}}>
            Today&apos;s Habits · {sustainMode ? '🌟 Sustain Mode' : `Week ${week}`} · {arch.icon} {arch.name}
          </div>
          {energyModeSetupDone && energyMode && (() => {
            const cfg = {low:{e:'🌙',c:'#8a7a9e',b:'#f3f0f8'},normal:{e:'🌿',c:'#5a7a5a',b:'#f0f7f0'},high:{e:'⚡',c:'#c4880a',b:'#fdf8ed'}};
            const lbl = {low:'Low Energy',normal:'Normal',high:'High Energy'};
            const m = cfg[energyMode];
            return <button onClick={()=>setModeEditorOpen(true)} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',background:m.b,border:`1px solid ${m.c}40`,borderRadius:99,fontSize:11,fontWeight:600,color:m.c,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>{m.e} {lbl[energyMode]} <span style={{fontSize:9,opacity:0.6}}>✏️</span></button>;
          })()}
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
          const linkedGoal = linkedGoalsByHabitKey[h.key];
          const isReProving = linkedGoal && linkedGoal.state === 'goal';
          // Show goal frequency picker if:
          // (a) stale — had history but gone quiet, OR
          // (b) brand new — no linked goal and no streak history yet
          const isNewHabit = !linkedGoal && !streaks[h.key]?.longest_streak;
          const needsGoalPrompt = !linkedGoal && (isHabitStale(h.key) || isNewHabit);

          // ── State 2: re-proving — goal-styled progress card, no checkbox ──
          if(isReProving){
            const count = linkedGoalWeekCounts[linkedGoal.id]||0;
            const pct = Math.min(100, Math.round((count/linkedGoal.weekly_target)*100));
            return(
              <div key={h.key} style={{border:'1.5px solid #d4af6a',borderRadius:13,padding:13,background:'#fdfaf3'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:20}}>{h.emoji}</span><span style={{fontSize:13,fontWeight:500}}>{h.name}</span></div>
                  <div style={{fontSize:10,color:'#c47a2a',fontWeight:700}}>{linkedGoal.consecutive_weeks_hit === 0 && !streaks[h.key]?.longest_streak ? '🌱 building' : '🌱 re-proving'}</div>
                </div>
                <div style={{height:6,background:'#f0ede8',borderRadius:99,overflow:'hidden',marginBottom:7}}>
                  <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#e8c890,#d4af6a)',borderRadius:99}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:10,color:'#aaa'}}>{count} of {linkedGoal.weekly_target} this week</span>
                  <button onClick={()=>logLinkedGoalProgress(linkedGoal)}
                    style={{fontSize:10,fontWeight:600,color:'white',background:goalsLoggedToday.has(linkedGoal.id)?'#8aad8a':'#d4af6a',border:'none',borderRadius:99,padding:'4px 11px',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
                    {goalsLoggedToday.has(linkedGoal.id)
                      ? (linkedGoal.weekly_target >= 7 ? '✓ Done today' : '✓ Logged')
                      : '+ Log'}
                  </button>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                  <button onClick={()=>{ if(window.confirm(`Release "${h.name}" for now? It'll move to your removed list — restore it anytime.`)) releaseHabitFromCard(h.key, linkedGoal.id); }}
                    style={{fontSize:10,color:'#ccc',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline',fontFamily:'DM Sans,sans-serif'}}>
                    Release for now
                  </button>
                  <button onClick={()=>{
                    const next = window.prompt(`Current target: ${linkedGoal.weekly_target}x/week. Set a new higher target:`, linkedGoal.weekly_target + 1);
                    const n = parseInt(next);
                    if(n && n > linkedGoal.weekly_target){
                      import('../lib/goalsTasks').then(({increaseGoalTarget})=>{
                        increaseGoalTarget(linkedGoal.id, n).then(ok=>{
                          if(ok){ toast(`🎯 New target: ${n}x/week`); loadLinkedGoals(); }
                        });
                      });
                    }
                  }}
                    style={{fontSize:10,color:'#9a7a2a',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline',fontFamily:'DM Sans,sans-serif'}}>
                    Push for more →
                  </button>
                </div>
              </div>
            );
          }

          // ── State 3: needs a goal set — prompt, not a checkbox ──
          if(needsGoalPrompt){
            return(
              <div key={h.key} style={{border:'1.5px dashed #c4a882',borderRadius:13,padding:13,background:'#fdf8f3'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}><span style={{fontSize:20,opacity:0.6}}>{h.emoji}</span><span style={{fontSize:13,fontWeight:500,color:'#a08860'}}>{h.name}</span></div>
                <p style={{fontSize:11,color:'#b09870',marginBottom:9}}>{isNewHabit ? 'How often do you want to build this habit? Pick a weekly target to start.' : 'Slipped a while back — pick a starting frequency to build it back up.'}</p>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {[1,2,3,4,5,7].map(n=>(
                    <button key={n} onClick={()=>setHabitGoalFrequency(h,n)} style={{fontSize:11,fontWeight:600,padding:'5px 10px',borderRadius:99,border:'1.5px solid #d4af6a',background:'white',color:'#9a7a2a',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>{n===7?'Daily':`${n}x`}</button>
                  ))}
                </div>
                <button onClick={()=>{ if(window.confirm(`Release "${h.name}" for now? It'll move to your removed list — restore it anytime.`)) releaseHabitFromCard(h.key, null); }}
                  style={{marginTop:8,fontSize:10,color:'#ccc',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline',fontFamily:'DM Sans,sans-serif'}}>
                  Release for now
                </button>
              </div>
            );
          }

          // ── State 1: normal — unchanged ──
          return(
            <div key={h.key} style={{border:`1.5px solid ${d?'#8aad8a':'#e8e4de'}`,borderLeft:h.ge>0?'3px solid #4ecb71':h.isCustom?'3px solid #d4af6a':`1.5px solid ${d?'#8aad8a':'#e8e4de'}`,borderRadius:13,padding:13,background:d?'#f3f8f3':'white',transition:'all 0.2s',position:'relative'}}>
              {h.isCustom&&<div style={{position:'absolute',top:8,right:8,fontSize:9,fontWeight:700,color:'#d4af6a',textTransform:'uppercase',letterSpacing:0.5}}>custom</div>}
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
                  {!h.isCustom&&(
                    <button onClick={e=>{e.stopPropagation();if(window.confirm(`Remove "${h.name}" from your plan? You can restore it anytime.`)) removeHabit(h.key);}}
                      title="Remove from plan"
                      style={{width:18,height:18,borderRadius:'50%',border:'1px solid #e8e4de',background:'white',cursor:'pointer',fontSize:10,color:'#bbb',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}
                      onMouseOver={e=>{e.currentTarget.style.borderColor='#e07070';e.currentTarget.style.color='#e07070';}}
                      onMouseOut={e=>{e.currentTarget.style.borderColor='#e8e4de';e.currentTarget.style.color='#bbb';}}>✕</button>
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
              {longest>0&&(
                <button onClick={e=>{e.stopPropagation();setStreakHistoryHabit(h);setStreakHistoryOpen(true);}}
                  style={{width:'100%',marginTop:8,padding:'6px',background:'transparent',border:'1px dashed #e8e4de',borderRadius:8,fontSize:10,fontWeight:600,color:'#888',cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s'}}
                  onMouseOver={e=>{e.currentTarget.style.borderColor='#8aad8a';e.currentTarget.style.color='#5a7a5a';}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor='#e8e4de';e.currentTarget.style.color='#888';}}>
                  📊 View streak history
                </button>
              )}
            </div>
          );
        })}
      </div>
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
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}><span>Today&apos;s Progress</span><span style={{fontWeight:600}}>{doneCount}/{allHabits.length} complete</span></div>
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
            {NAV.filter(n => !n.adminOnly || isAdmin).map(n=>{
              const active = tab===n.key || groupOf(tab)===n.key;
              const go = ()=>{
                if(n.key==='more'){ setTab('nourish'); return; }
                if(n.key==='companion'){ setCompanionView('companion'); }
                setTab(n.key);
              };
              return(
              <button key={n.key} onClick={go} title={n.label}
                style={{width:'100%',height:44,borderRadius:12,background:active?'#2d5a2d':'transparent',border:'none',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:12,padding:'0 14px',color:active?'white':'#6a9a6a',transition:'all 0.2s',position:'relative',fontFamily:'DM Sans,sans-serif',fontWeight:active?600:400}}>
                <span style={{fontSize:18,flexShrink:0}}>{n.icon}</span>
                <span>{n.label}</span>
                {n.key==='community'&&<div style={{position:'absolute',top:10,left:26,width:7,height:7,background:'#e07070',borderRadius:'50%',border:'2px solid #1a2e1a'}}/>}
              </button>
              );
            })}
            <div style={{flex:1}}/>

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
        <div onClick={()=>{ setCompanionView('decorate'); setTab('companion'); }} style={{display:'flex',alignItems:'center',gap:6,background:'#f7f3ed',border:'1.5px solid #e8e4de',borderRadius:99,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:600}}>
          🪙 {coins.toLocaleString()}
        </div>
        <div onClick={()=>setDonateOpen(true)} style={{display:'flex',alignItems:'center',gap:6,background:'#f0fdf4',border:'1.5px solid #4ecb71',borderRadius:99,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:600,color:'#276a3a'}}>
          ⚡ {ge} GE
        </div>
      </div>
    </div>
  );

  // Compact companion entry on Home — taps through to the Companion page.
  const CompanionTile=()=>{
    const baseEyes=(avatarEyes==='glasses'||avatarEyes==='sunglasses')?avatarEyes:'open';
    const {mouth:mM,eyes:mE}=getMoodExpression(health,baseEyes,{isRestDay:isRestDayToday});
    const p=new URLSearchParams();
    p.set('seed',name||'wellness');p.set('skinColor',avatarSkin);p.set('hair',avatarHair);
    p.set('hairColor',avatarHairColor);p.set('eyes',mE);p.set('mouth',mM);
    p.set('backgroundColor',avatarBg);p.set('body',avatarAccessory||'rounded');p.set('facialHairProbability','0');
    const url=`https://api.dicebear.com/9.x/personas/svg?${p.toString()}`;
    const cs=SCENES.find(s=>s.key===avatarScene)||SCENES[0];
    // Nourish fullness from today's log
    let fullness=0;
    try{
      const all=JSON.parse(localStorage.getItem('bloom-nourish')||'{}');
      const tk=new Date().toISOString().split('T')[0];
      const d=all[tk]||{categories:[],meals:{}};
      const M={whole:25,mixed:22,processed:18,skipped:15};
      const mp=['breakfast','lunch','dinner'].reduce((s,x)=>s+(M[d.meals?.[x]]||0),0);
      const cp=(Math.min((d.categories||[]).length,5)/5)*25;
      fullness=Math.min(100,Math.round(mp+cp));
    }catch{}
    const nourishLabel=fullness>=80?'Well nourished 🌿':fullness>=40?'Nicely nourished':'Needs nourishing 🍽️';
    const nourishColor=fullness>=80?'linear-gradient(90deg,#70c070,#4ea84e)':fullness>=40?'linear-gradient(90deg,#e8b84a,#d4a030)':'linear-gradient(90deg,#e07070,#c04040)';
    return(
      <div onClick={()=>{setCompanionView('companion');setTab('companion');}}
        style={{background:cs.gradient,border:'1.5px solid #b5ceb5',borderRadius:20,padding:18,textAlign:'center',cursor:'pointer',transition:'transform 0.15s'}}
        onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'}
        onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
        <div style={{position:'relative',width:96,height:96,margin:'0 auto 10px'}}>
          <div style={{width:96,height:96,borderRadius:'50%',background:'linear-gradient(135deg,#c8ddc8,#a8c4a8)',display:'flex',alignItems:'center',justifyContent:'center',border:'3px solid rgba(255,255,255,0.7)',boxShadow:'0 6px 20px rgba(90,122,90,0.18)',overflow:'hidden',animation:'breathe 4s ease-in-out infinite'}}>
            <object type="image/svg+xml" data={url} style={{width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}><span style={{fontSize:40}}>🧑‍🌿</span></object>
          </div>
          {/* Accessory overlay — scaled to 96px tile */}
          {equipped?.item_key && (
            <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
              <AvatarAccessoryOverlay itemKey={equipped.item_key} size={96}/>
            </div>
          )}
          <div style={{position:'absolute',bottom:2,right:2,background:'#d4af6a',color:'white',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:8,zIndex:3}}>Lv.{level}</div>
        </div>
        <div style={{fontFamily:'Instrument Serif,serif',fontSize:16,marginBottom:8}}>{name}</div>
        {[
          {label:'❤️ Health',val:health,fill:health>60?'linear-gradient(90deg,#70c070,#4ea84e)':health>30?'linear-gradient(90deg,#e8b84a,#d4a030)':'linear-gradient(90deg,#e07070,#c04040)'},
          {label:'🍽️ Nourish',val:fullness,fill:nourishColor,sub:nourishLabel},
        ].map(b=>(
          <div key={b.label} style={{textAlign:'left',marginBottom:7}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,fontWeight:500,marginBottom:3}}><span>{b.label}</span><span>{b.val}%</span></div>
            <div style={{height:5,background:'rgba(0,0,0,0.1)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${b.val}%`,background:b.fill,borderRadius:99,transition:'width 0.8s'}}/></div>
          </div>
        ))}
        <div style={{display:'flex',gap:6,marginBottom:10}}>
          {[{v:coins.toLocaleString(),l:'🪙',c:'#d4af6a'},{v:ge,l:'⚡',c:'#38a855'}].map(x=>(
            <div key={x.l} style={{flex:1,background:'rgba(255,255,255,0.6)',borderRadius:9,padding:'6px 4px'}}><div style={{fontSize:13,fontWeight:700,fontFamily:'Syne,sans-serif',color:x.c}}>{x.v}</div><div style={{fontSize:9,color:'#888'}}>{x.l}</div></div>
          ))}
        </div>
        <div style={{fontSize:11,color:'#5a7a5a',fontWeight:600,background:'rgba(255,255,255,0.55)',border:'1px solid #b5ceb5',borderRadius:99,padding:'6px 12px'}}>Visit your companion →</div>
      </div>
    );
  };

  const TabDashboard=()=>{
    const today=new Date();
    const wdays=Array.from({length:7},(_,i)=>{
      const d=new Date(today);
      d.setDate(today.getDate()-today.getDay()+i);
      const dateStr=d.toISOString().split('T')[0];
      const completedKeys=weeklyData[dateStr]||[];
      const completedCount=completedKeys.length;
      return{ n:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], num:d.getDate(), today:d.toDateString()===today.toDateString(), dateStr, completedCount, totalHabits:allHabits.length };
    });
    return(
      <div style={{padding:'22px 26px',maxWidth:1200}}>
        <div style={{marginBottom:20}}>
          <h1 style={{fontFamily:'Instrument Serif,serif',fontSize:28,fontWeight:400,color:'#1a1a1a',marginBottom:4}}>Good morning, {name} ✨</h1>
          <p style={{fontSize:13,color:'#888'}}>{sustainMode?'🌟 Sustain Mode':`Week ${week} of 4`} · Day {day} · {Math.max(0, allHabits.length - doneCount)} habits remaining</p>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:sustainMode?'#f8fcf8':'#f3f8f3',border:`1px solid ${sustainMode?'#8aad8a':'#b5ceb5'}`,borderRadius:99,padding:'4px 12px',fontSize:12,color:'#5a7a5a',fontWeight:500,marginTop:8}}>
            {arch.icon} {arch.name} · {sustainMode?'Building Forever':lvMap[lvl]||'Building'}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'250px 1fr',gap:18,alignItems:'start'}} className="dash-main-grid">
          <div style={{display:'flex',flexDirection:'column',gap:16}}><CompanionTile/></div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}} className="stats-row">
              {[
                {icon:'😴',v:manualStats.sleep||'—',l:'Sleep',key:'sleep'},
                {icon:'🧘',v:manualStats.mindfulness?`${manualStats.mindfulness}min`:'—',l:'Mindfulness',key:'mindfulness'},
                {icon:'🏃',v:manualStats.movement?`${manualStats.movement} min`:'—',l:'Movement',key:'movement'},
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
            {suggestedHabits.length > 0 && (
              <div style={{background:'linear-gradient(135deg,#f3f8f3,#f7f3ed)',border:'1.5px solid #b5ceb5',borderRadius:20,padding:20}}>
                <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#5a7a5a',marginBottom:4}}>Build Toward</div>
                <p style={{fontSize:12,color:'#7a8a7a',marginBottom:14}}>Prove one of these consistently and it becomes a real habit.</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {suggestedHabits.map(sg=>(
                    <button key={sg.name} onClick={()=>adoptSuggestedHabit(sg)} title={sg.why}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',background:'white',border:'1.5px solid #b5ceb5',borderRadius:99,cursor:'pointer',fontSize:13,fontWeight:600,color:'#3a6a3a',fontFamily:'DM Sans,sans-serif'}}>
                      {sg.emoji} {sg.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <HabitsGrid/>
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
            <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:20}}>
              <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:12}}>
                Week at a Glance · {sustainMode?'🌟 Sustain Mode':`Week ${week} of 4`}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
                {wdays.map(d=>{
                  const pct=d.totalHabits>0?Math.round((d.completedCount/d.totalHabits)*100):0;
                  const allDone=d.completedCount===d.totalHabits&&d.totalHabits>0;
                  return(
                    <div key={d.num} style={{borderRadius:10,padding:'8px 4px',textAlign:'center',border:`1.5px solid ${d.today?'#8aad8a':allDone?'#b5ceb5':'#e8e4de'}`,background:d.today?'#f3f8f3':allDone?'#f8fcf8':'white',cursor:'pointer'}}>
                      <div style={{fontSize:9,color:'#888',textTransform:'uppercase',letterSpacing:'0.5px'}}>{d.n}</div>
                      <div style={{fontWeight:600,fontSize:13,marginTop:2,marginBottom:4,color:d.today?'#5a7a5a':allDone?'#8aad8a':'#2a2a2a'}}>{d.num}</div>
                      <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:2,flexWrap:'wrap'}}>
                        {d.completedCount>0&&<div style={{fontSize:9,fontWeight:700,color:allDone?'#8aad8a':'#d4af6a'}}>{allDone?'✓':d.completedCount}</div>}
                        {!allDone&&d.completedCount===0&&<div style={{width:4,height:4,borderRadius:'50%',background:'#e8e4de'}}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {userId === ADMIN_USER_ID && <DashboardPostCard/>}
          </div>
        </div>
      </div>
    );
  };

  // ── About — plain-language explainer + a slot for a screen-recording walk-
  // through video. Edit ABOUT_VIDEO_URL below once you've recorded one —
  // paste a YouTube embed URL (https://www.youtube.com/embed/VIDEO_ID) or a
  // direct video file link. Leave it empty and the placeholder shows instead.
  // Same video can double as marketing content elsewhere — no separate cut needed.
  const ABOUT_VIDEO_URL = '';

  const TabAbout=()=>(
    <div style={{padding:'22px 26px',maxWidth:760}}>
      <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:'20px 24px',marginBottom:20}}>
        <div style={{aspectRatio:'16/9',background:'#1a1a16',borderRadius:14,marginBottom:18,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
          {ABOUT_VIDEO_URL ? (
            ABOUT_VIDEO_URL.includes('youtube.com/embed')
              ? <iframe src={ABOUT_VIDEO_URL} title="How Bloom works" style={{width:'100%',height:'100%',border:'none'}} allowFullScreen/>
              : <video src={ABOUT_VIDEO_URL} controls style={{width:'100%',height:'100%'}}/>
          ) : (
            <div style={{textAlign:'center',color:'#666'}}>
              <div style={{fontSize:32,marginBottom:8}}>🎬</div>
              <div style={{fontSize:13}}>A walkthrough video goes here</div>
            </div>
          )}
        </div>
        <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:24,marginBottom:10,color:'#1a1a1a'}}>How Bloom works</h2>
        <p style={{fontSize:14,color:'#555',lineHeight:1.7,marginBottom:18}}>
          Bloom is built around one idea: habits are earned, not assigned.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {[
            {emoji:'🌱',title:'Start with a frequency',body:"Every habit begins by setting a weekly target — 3x a week, daily, whatever fits your life. No pressure to go all-in from day one."},
            {emoji:'📈',title:'Prove it consistently',body:'Research puts habit formation at 18–254 days, averaging around 66. Hit your target week after week and the habit graduates — it becomes established, tracked with your streak and your health score.'},
            {emoji:'↩️',title:'Slip without guilt',body:"Miss a week? The habit quietly goes back to building mode. Nothing resets your history, nothing punishes you — it's just honest about where things stand. Pick back up when you're ready."},
            {emoji:'🌟',title:'Established habits',body:'Once a habit is established it lives in your daily list as a simple checkbox. Consistency is the only thing that matters here — coins, streaks, and your avatar all reflect it.'},
          ].map(x=>(
            <div key={x.title} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
              <div style={{fontSize:22,flexShrink:0}}>{x.emoji}</div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#2a2a2a',marginBottom:3}}>{x.title}</div>
                <div style={{fontSize:13,color:'#777',lineHeight:1.6}}>{x.body}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{fontSize:13,color:'#555',lineHeight:1.7,marginTop:18}}>
          Everything else — routines, nourish logging, your companion — builds on top of this foundation.
        </p>
      </div>

      <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:'20px 24px',marginBottom:20}}>
        <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:20,marginBottom:14,color:'#1a1a1a'}}>🔒 Your Data & Privacy</h2>
        <p style={{fontSize:13,color:'#555',lineHeight:1.7,marginBottom:14}}>
          Your wellness data is yours. Bloom is built to respect your privacy — we don't sell data, track you, or share your health information with anyone.
        </p>
        <p style={{fontSize:13,color:'#555',lineHeight:1.7,marginBottom:16}}>
          <strong>GDPR Rights:</strong> You can access, edit, export, or delete your data anytime. Go to Settings → Delete My Data, or read the full <a href="/privacy" target="_blank" style={{color:'#8aad8a',fontWeight:600,textDecoration:'none'}}>Privacy Policy</a>.
        </p>
        <div style={{background:'#f7f3ed',borderRadius:12,padding:12,fontSize:12,color:'#666',lineHeight:1.6}}>
          Built by Jess (MSc Biomedical Sciences & Public Health). Every habit is backed by peer-reviewed research.
        </div>
      </div>
    </div>
  );

  const TabHabits=()=>(
    <div style={{padding:'22px 26px',maxWidth:900}}>
      <HabitsGrid/>
      <div style={{marginTop:18}}><ProgressStats/></div>
      <div style={{marginTop:24}}><TabBadHabits onAdd={()=>setBadHabitOpen(true)} onToast={toast}/></div>
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
                    <button onClick={()=>startRoutine(k)} style={{width:'100%',padding:10,background:r.color,color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
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
                    const parts=k.split('_'); const dateStr=parts[parts.length-1]; const routineKey=parts.slice(0,-1).join('_'); const r=ROUTINES[routineKey];
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
                <div style={{fontSize:24,marginBottom:8}}>⏳</div><div style={{fontSize:13,color:'#888'}}>Loading stats...</div>
              </div>
            )}
            {selectedDay&&!dayStatsLoading&&dayStats&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{background:'#1a2e1a',borderRadius:20,padding:20,color:'white'}}>
                  <div style={{fontSize:11,color:'#4a6a4a',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{new Date(selectedDay+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})}</div>
                  <div style={{fontFamily:'Instrument Serif,serif',fontSize:22,color:'white',marginBottom:12}}>{new Date(selectedDay+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric'})}</div>
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

  const TabSettings=()=>{
    const setUser = useStore(s=>s.setUser);
    const SKIN_OPTIONS = [{v:'eeb4a4',l:'Light'},{v:'e5a07e',l:'Light Brown'},{v:'d78774',l:'Brown'},{v:'b16a5b',l:'Medium'},{v:'92594b',l:'Deep Brown'},{v:'623d36',l:'Deep'}];
    const HAIR_OPTIONS = [{v:'long',l:'Long'},{v:'extraLong',l:'Extra Long'},{v:'bobCut',l:'Bob'},{v:'bobBangs',l:'Bob Bangs'},{v:'curly',l:'Curly'},{v:'curlyBun',l:'Curly Bun'},{v:'pigtails',l:'Pigtails'},{v:'straightBun',l:'Straight Bun'},{v:'shortCombover',l:'Short'},{v:'buzzcut',l:'Buzzcut'},{v:'fade',l:'Fade'},{v:'bald',l:'Bald'}];
    const HAIR_COLORS  = [{v:'362c47',l:'Black'},{v:'6c4545',l:'Dark Brown'},{v:'e15c66',l:'Auburn'},{v:'f27d65',l:'Red'},{v:'f29c65',l:'Blonde'},{v:'dee1f5',l:'Silver'}];
    // Eyewear only — expressive eyes are system-owned (driven by health/mood)
    const EYE_OPTIONS  = [{v:'open',l:'None'},{v:'glasses',l:'Glasses'},{v:'sunglasses',l:'Sunnies'}];
    // Mouth is system-owned — not shown to user
    const BG_OPTIONS   = [{v:'b6e3f4',l:'Sky Blue'},{v:'c0aede',l:'Lavender'},{v:'d1f4d0',l:'Mint'},{v:'ffd5dc',l:'Rose'},{v:'ffdfba',l:'Peach'},{v:'f0ece6',l:'Cream'}];
    const BODY_OPTIONS = [{v:'rounded',l:'Rounded'},{v:'squared',l:'Squared'},{v:'small',l:'Small'},{v:'checkered',l:'Patterned'}];

    const baseEyes = (avatarEyes==='glasses'||avatarEyes==='sunglasses') ? avatarEyes : 'open';
    const { mouth:moodMouth, eyes:moodEyes } = getMoodExpression(health, baseEyes, { isRestDay: isRestDayToday });
    const p2 = new URLSearchParams();
    p2.set('seed', name||'wellness'); p2.set('skinColor', avatarSkin);
    p2.set('hair', avatarHair); p2.set('hairColor', avatarHairColor);
    p2.set('eyes', moodEyes); p2.set('mouth', moodMouth);
    p2.set('backgroundColor', avatarBg); p2.set('body', avatarAccessory||'rounded');
    p2.set('facialHairProbability','0');
    const dicebearUrl = `https://api.dicebear.com/9.x/personas/svg?${p2.toString()}`;

    function OptionRow({ label, options, current, field }) {
      return (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,color:'#888',marginBottom:8}}>{label}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {options.map(o=>(
              <button key={String(o.v)} onClick={()=>setUser({[field]:o.v})}
                style={{padding:'6px 12px',borderRadius:99,border:`1.5px solid ${current===o.v?'#8aad8a':'#e8e4de'}`,background:current===o.v?'#f3f8f3':'white',color:current===o.v?'#5a7a5a':'#888',fontSize:12,fontWeight:current===o.v?600:400,cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.15s'}}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return(
      <div style={{padding:'22px 26px',maxWidth:680}}>
        <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:24,padding:26,display:'flex',gap:18,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#c8ddc8,#a8c4a8)',overflow:'hidden',border:'3px solid rgba(255,255,255,0.7)',flexShrink:0}}>
            <object type="image/svg+xml" data={dicebearUrl} style={{width:'100%',height:'100%',pointerEvents:'none'}}><span>🧑‍🌿</span></object>
          </div>
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

        <div style={{background:'white',border:'1.5px solid #e8e4de',borderRadius:20,padding:20,marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:4}}>Customise Your Avatar</div>
          <div style={{fontSize:11,color:'#aaa',marginBottom:16}}>Expression is driven by your health — the happier you are, the happier your avatar!</div>
          <div style={{display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}>
            <div style={{width:120,height:120,borderRadius:'50%',background:'linear-gradient(135deg,#c8ddc8,#a8c4a8)',overflow:'hidden',border:'3px solid #b5ceb5',flexShrink:0,alignSelf:'center'}}>
              <object type="image/svg+xml" data={dicebearUrl} style={{width:'100%',height:'100%',pointerEvents:'none'}}><span style={{fontSize:40}}>🧑‍🌿</span></object>
            </div>
            <div style={{flex:1,minWidth:240}}>
              <OptionRow label="Skin Tone" options={SKIN_OPTIONS} current={avatarSkin} field="avatarSkin"/>
              <OptionRow label="Hair Style" options={HAIR_OPTIONS} current={avatarHair} field="avatarHair"/>
              <OptionRow label="Hair Colour" options={HAIR_COLORS} current={avatarHairColor} field="avatarHairColor"/>
              <OptionRow label="Eyewear" options={EYE_OPTIONS} current={avatarEyes} field="avatarEyes"/>
              <OptionRow label="Body Shape" options={BODY_OPTIONS} current={avatarAccessory||'rounded'} field="avatarAccessory"/>
              <OptionRow label="Background" options={BG_OPTIONS} current={avatarBg} field="avatarBg"/>
            </div>
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
            {l:'Program',v:'Wellness Guide'},
            {l:'Access',v:'Founding Beta · Lifetime'},
          ].map(r=>(
            <div key={r.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f0ece6'}}>
              <span style={{fontSize:13,color:'#555'}}>{r.l}</span>
              <span style={{fontSize:13,color:'#1a1a1a',fontWeight:500}}>{r.v}</span>
            </div>
          ))}
        </div>

        <NotifButton/>

        <div style={{background:'#f7f3ed',border:'1.5px solid #e8e4de',borderRadius:20,padding:20,textAlign:'center'}}>
          <div style={{fontSize:22,marginBottom:10}}>⚙️</div>
          <div style={{fontSize:14,fontWeight:500,color:'#2a2a2a',marginBottom:6}}>More settings coming soon</div>
          <div style={{fontSize:13,color:'#888',lineHeight:1.6,marginBottom:14}}>Notification preferences, device sync, and account management are on the roadmap. Your feedback shapes what gets built first.</div>
          <a href="https://instagram.com/byjbea" target="_blank" rel="noreferrer"
            style={{display:'inline-flex',alignItems:'center',gap:6,background:'#1a2e1a',color:'white',padding:'10px 20px',borderRadius:99,fontSize:13,fontWeight:600,textDecoration:'none'}}>
            DM @byjbea with requests →
          </a>
        </div>

        {isAdmin && <NotionSyncCard toast={toast} />}

        <div style={{background:'#fff5f5',border:'1.5px solid #e8c8c8',borderRadius:20,padding:20,marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#c85a5a',marginBottom:8}}>🔒 Privacy & Data</div>
          <p style={{fontSize:13,color:'#555',lineHeight:1.6,marginBottom:12}}>
            Your data is always yours. Read our <a href="/privacy" target="_blank" style={{color:'#8aad8a',fontWeight:600,textDecoration:'none'}}>Privacy Policy</a> and GDPR rights.
          </p>
          <button onClick={()=>{ 
            const userId = useStore.getState().userId;
            if(!userId) { toast('Error: User ID not found'); return; }
            if(window.confirm('⚠️ Delete all your data?\n\nThis includes:\n• All habit logs\n• Nutrition data\n• Profile & avatar\n• Community posts\n\nThis action CANNOT be undone.')) {
              if(window.confirm('Last chance! Click OK to permanently delete everything.')) {
                fetch('/api/gdpr/delete-user', {
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({userId})
                }).then(r=>r.json()).then(data=>{
                  if(data.success) {
                    toast('✅ Your data has been deleted.');
                    setTimeout(()=>{
                      localStorage.removeItem('bloom-storage'); 
                      localStorage.removeItem('bloom-daily-stats'); 
                      localStorage.removeItem('bloom-routine-log'); 
                      localStorage.removeItem('bloom-routine-freqs'); 
                      window.location.href='/';
                    },1000);
                  } else {
                    toast('❌ Deletion failed: '+data.error);
                  }
                }).catch(e=>{toast('❌ Error: '+e.message);});
              }
            }
          }}
            style={{width:'100%',padding:'10px 16px',background:'#fff5f5',border:'1.5px solid #e8c8c8',borderRadius:10,fontSize:12,fontWeight:600,color:'#c85a5a',cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s'}}
            onMouseOver={e=>{e.currentTarget.style.background='#f5e8e8';e.currentTarget.style.borderColor='#d8b8b8';}}
            onMouseOut={e=>{e.currentTarget.style.background='#fff5f5';e.currentTarget.style.borderColor='#e8c8c8';}}>
            Delete All My Data
          </button>
        </div>

        <button onClick={()=>{ if(window.confirm('Are you sure you want to sign out?')){ localStorage.removeItem('bloom-storage'); localStorage.removeItem('bloom-daily-stats'); localStorage.removeItem('bloom-routine-log'); localStorage.removeItem('bloom-routine-freqs'); window.location.reload(); } }}
          style={{width:'100%',marginTop:0,padding:'13px',background:'transparent',border:'1.5px solid #e8e4de',borderRadius:12,fontSize:13,fontWeight:600,color:'#888',cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s'}}
          onMouseOver={e=>{e.currentTarget.style.borderColor='#e07070';e.currentTarget.style.color='#e07070';}}
          onMouseOut={e=>{e.currentTarget.style.borderColor='#e8e4de';e.currentTarget.style.color='#888';}}>
          Sign out
        </button>
      </div>
    );
  };

  const ShopModal=()=>(
    <div onClick={()=>setShopOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:24,padding:26,width:580,maxWidth:'95vw',maxHeight:'84vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:22}}>Companion Shop 🛍</h2>
          <button onClick={()=>setShopOpen(false)} style={{width:30,height:30,borderRadius:'50%',border:'1.5px solid #e8e4de',background:'transparent',cursor:'pointer',fontSize:15}}>✕</button>
        </div>
        <div style={{background:'#f7f3ed',borderRadius:12,padding:'10px 14px',marginBottom:18,display:'flex',gap:18,fontSize:13}}>
          <span>🪙 <strong>{coins.toLocaleString()}</strong></span><span>⚡ <strong>{ge}</strong> GE</span>
        </div>

        {/* Scenery */}
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:10}}>Scenery 🎨</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:22}}>
          {SCENES.map(scene=>{
            const owned = ownedScenes.includes(scene.key) || scene.cost===0;
            const active = (avatarScene===scene.key) || (!avatarScene && scene.key==='default');
            return(
              <div key={scene.key} onClick={()=>buyScene(scene)}
                style={{border:`1.5px solid ${active?'#8aad8a':owned?'#b5ceb5':'#e8e4de'}`,borderRadius:13,padding:'10px 8px',textAlign:'center',cursor:'pointer',transition:'all 0.2s'}}>
                <div style={{width:'100%',height:32,borderRadius:8,background:scene.gradient,marginBottom:7}}/>
                <div style={{fontSize:11,fontWeight:500,marginBottom:4}}>{scene.name}</div>
                <div style={{fontSize:11,fontWeight:600,color:active?'#5a7a5a':owned?'#8aad8a':'#d4af6a'}}>
                  {active?'✓ Active':owned?'Tap to use':scene.cost===0?'Free':`🪙 ${scene.cost}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Accessories — coin */}
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:10}}>Accessories 🪄</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
          {SHOP_ITEMS.filter(i=>i.cost>0).map(item=>{
            const owned=inventory.some(iv=>iv.item_key===item.key);
            return(
              <div key={item.key} onClick={()=>!owned&&buyItem(item)}
                style={{border:`1.5px solid ${owned?'#8aad8a':'#e8e4de'}`,background:owned?'#f3f8f3':'white',borderRadius:13,padding:'12px 8px',textAlign:'center',cursor:owned?'default':'pointer',transition:'all 0.2s'}}>
                <div style={{fontSize:28,marginBottom:7}}>{item.icon}</div>
                <div style={{fontSize:11,fontWeight:500,marginBottom:4}}>{item.name}</div>
                <div style={{fontSize:11,color:owned?'#8aad8a':'#d4af6a',fontWeight:600}}>{owned?'✓ Owned':`🪙 ${item.cost}`}</div>
              </div>
            );
          })}
        </div>

        {/* Green Rewards — GE */}
        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:10}}>Green Rewards ⚡</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>
          {SHOP_ITEMS.filter(i=>i.ge>0).map(item=>{
            const owned=inventory.some(iv=>iv.item_key===item.key);
            return(
              <div key={item.key} onClick={()=>!owned&&buyItem(item)}
                style={{border:`1.5px solid ${owned?'#8aad8a':'#e8e4de'}`,background:owned?'#f3f8f3':'white',borderRadius:13,padding:'12px 8px',textAlign:'center',cursor:owned?'default':'pointer',transition:'all 0.2s'}}>
                <div style={{fontSize:28,marginBottom:7}}>{item.icon}</div>
                <div style={{fontSize:11,fontWeight:500,marginBottom:4}}>{item.name}</div>
                <div style={{fontSize:11,color:owned?'#8aad8a':'#38a855',fontWeight:600}}>{owned?'✓ Owned':`⚡ ${item.ge} GE`}</div>
              </div>
            );
          })}
        </div>

        {/* Inventory */}
        {inventory.length>0&&(
          <>
            <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'1.2px',color:'#888',marginBottom:10}}>Your Accessories</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
              {inventory.map(item=>{
                const si=SHOP_ITEMS.find(s=>s.key===item.item_key);
                return(
                  <div key={item.id} onClick={()=>equipItem(item)}
                    style={{border:`1.5px solid ${item.equipped?'#d4af6a':'#e8e4de'}`,background:item.equipped?'#fdf8ed':'white',borderRadius:13,padding:'12px 8px',textAlign:'center',cursor:'pointer',transition:'all 0.2s'}}>
                    <div style={{fontSize:26,marginBottom:5}}>{si?.icon||'✨'}</div>
                    <div style={{fontSize:11,fontWeight:500}}>{item.item_name}</div>
                    <div style={{fontSize:10,color:item.equipped?'#d4af6a':'#888',marginTop:3}}>{item.equipped?'✓ Equipped':'Tap to equip'}</div>
                  </div>
                );
              })}
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
    community:{t:'Community 👥',s:'Your wellness cohort'},
    settings:{t:'Profile & Settings ⚙️',s:`${arch.icon} ${arch.name} · ${lvMap[lvl]||'Building'}`},
    badhabits:{t:'Quit Habits 🚫',s:"Track what you're reducing · slips cost health · awareness is the first step"},
    science:{t:'Habit Science 🔬',s:'The research behind every habit in your program'},
    nourish:{t:'Nourish 🥗',s:'Track what you ate today — real-life amounts, zero guilt'},
    companion:{t:'Your Companion 🌸',s:'Tend to your companion · feed · decorate'},
    courses:{t:'Courses & Coaching 📚',s:'Living Well · 1:1 sessions · what\'s coming'},
    roadmap:{t:'Roadmap 🗺️',s:"Vote for features · suggest ideas · see what's coming"},
    about:{t:'About Bloom ℹ️',s:'How the app works, and why'},
    analytics:{t:'Quiz Analytics 📊',s:'Conversion funnel & drop-off analysis'},
  };
  const cur=titles[tab]||titles.dashboard;

  // Horizontal sub-tabs shown when inside the Habits or More group.
  const SubNav=()=>{
    const g=groupOf(tab);
    if(!g) return null;
    let items=GROUPS[g];
    if(g==='more' && isAdmin) items=[...items,{key:'analytics',icon:'📊',label:'Analytics'}];
    return(
      <div style={{display:'flex',gap:6,overflowX:'auto',padding:'12px 26px 0'}}>
        {items.map(it=>(
          <button key={it.key} onClick={()=>setTab(it.key)}
            style={{flexShrink:0,display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:99,border:`1.5px solid ${tab===it.key?'#8aad8a':'#e8e4de'}`,background:tab===it.key?'#f0f7f0':'white',color:tab===it.key?'#3a6a3a':'#888',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:600,transition:'all 0.2s'}}>
            <span>{it.icon}</span>{it.label}
          </button>
        ))}
      </div>
    );
  };

  return(
    <div style={{display:'flex',minHeight:'100vh',background:'#f7f3ed',overflowX:'hidden'}}>
      <Sidebar/>
      <div style={{marginLeft:sidebarOpen?220:0,flex:1,minWidth:0,transition:'margin-left 0.25s ease'}}>
        <TopBar title={cur.t} sub={cur.s}/>
        <SubNav/>
        <div style={{overflowX:'hidden'}}>
          {tab==='dashboard'  && <TabDashboard/>}
          {tab==='habits'     && <TabHabits/>}
          {tab==='companion'  && <TabCompanion key={companionView} userId={userId} toast={toast} initialView={companionView} onCustomise={()=>setTab('settings')} onNavigate={(t)=>setTab(t)}/>}

          {tab==='science'    && <TabHabitReview habits={habits} customHabits={customHabits}/>}
          {tab==='nourish'    && <TabNourish userId={userId} coins={coins} setStats={setStats} toast={toast}/>}
          {tab==='routines'   && <TabRoutinesEnhanced routineLog={routineLog} setRoutineLog={setRoutineLog} routineFreqs={routineFreqs} setRoutineFreqs={setRoutineFreqs} coins={coins} userId={userId} toast={toast} allHabits={allHabits}/>}
          {tab==='planner'    && <TabPlanner/>}
          {tab==='planet'     && <TabPlanet/>}
          {tab==='community'  && <TabCommunity/>}
          {tab==='settings'   && <TabSettings/>}
          {tab==='courses'    && <TabCourses userId={userId} toast={toast}/>}
          {tab==='roadmap'    && <TabRoadmap onFeedback={()=>setFeedbackOpen(true)}/>}
          {tab==='about'      && <TabAbout/>}
          {tab==='analytics'  && isAdmin && <QuizAnalytics/>}
        </div>
      </div>
      {badHabitOpen  && <BadHabitModal onClose={()=>setBadHabitOpen(false)}/>}
      {shopOpen      && <ShopModal/>}
      {donateOpen    && <DonateModal/>}
      {reflOpen      && <ReflModal week={week} refl={refl} setRefl={setRefl} submitRefl={submitRefl}/>}
      {customHabitOpen && <CustomHabitModal onClose={()=>setCustomHabitOpen(false)}/>}
      {statsLogOpen  && <StatsLogModal manualStats={manualStats} setManualStats={setManualStats} awardStatHealth={awardStatHealth} setStatsLogOpen={setStatsLogOpen}/>}
      {feedbackOpen  && <FeedbackModal onClose={()=>setFeedbackOpen(false)}/>}
      {streakHistoryOpen && <StreakHistoryModal habit={streakHistoryHabit} streakData={streaks[streakHistoryHabit?.key]} onClose={()=>setStreakHistoryOpen(false)}/>}
      {sustainUnlockOpen && <SustainUnlockModal onClose={()=>setSustainUnlockOpen(false)}/>}
      {habitIntroOpen && <HabitIntroModal onClose={async()=>{
        setHabitIntroOpen(false);
        if(userId){
          try{ await supabase.from('users').update({seen_habit_intro:true}).eq('id',userId); }
          catch(e){ console.warn('seen_habit_intro column not found - run the migration to persist this'); }
        }
      }}/>}
      <EnergyModeModal habits={baseHabits} archetypeKey={archetypeKey}/>
      {modeEditorOpen && <ModeEditor habits={baseHabits} archetypeKey={archetypeKey} onClose={()=>setModeEditorOpen(false)}/>}
      <div id="bloom-toast" className="toast" style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%) translateY(20px)',background:'#1a1a16',color:'white',padding:'12px 20px',borderRadius:99,fontSize:13,fontWeight:500,opacity:0,transition:'all 0.3s',zIndex:300,whiteSpace:'nowrap',pointerEvents:'none'}}/>
      <style>{`
        @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
        @keyframes pulseGe{0%,100%{box-shadow:0 0 20px rgba(78,203,113,0.35)}50%{box-shadow:0 0 36px rgba(78,203,113,0.5)}}
        @keyframes heartFloat{0%{transform:translateY(0) scale(0.5);opacity:0}20%{opacity:1;transform:scale(1.2)}100%{transform:translateY(-80px) scale(0.8);opacity:0}}
        .toast.show{opacity:1!important;transform:translateX(-50%) translateY(0)!important;}
        *{min-width:0;}
        body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);}
        @supports(padding-top:env(safe-area-inset-top)){.topbar-safe{padding-top:calc(13px + env(safe-area-inset-top))!important;}}
        @media(max-width:1100px){.dash-main-grid{grid-template-columns:1fr!important}.stats-row{grid-template-columns:repeat(2,1fr)!important}.routine-grid{grid-template-columns:1fr!important}.community-grid{grid-template-columns:1fr!important}.planner-grid-layout{grid-template-columns:1fr!important}}
        @media(max-width:600px){.dash-main-grid{grid-template-columns:1fr!important}#bloom-toast{white-space:normal!important;text-align:center;max-width:80vw}}
      `}</style>
    </div>
  );
}
