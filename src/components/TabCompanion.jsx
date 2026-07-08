'use client';

// ─────────────────────────────────────────────────────────────────────────────
// TabCompanion.jsx
// Drop into: src/components/TabCompanion.jsx
//
// The dedicated home for the user's companion — pulls the avatar (previously a
// card inside the dashboard) and the shop (previously ShopModal) into one place.
//
// Two views via a segmented toggle:
//   🌸 Companion — big tappable avatar, love-tap hearts, health/coins/GE, mood
//   🎨 Decorate  — scenery, accessories, green rewards, equip/unequip
//
// Fully self-contained: reads the store directly, writes the SAME Supabase
// tables + localStorage keys the old Dashboard code used, so nothing downstream
// changes and no earned progress is ever reset.
//
// Props:
//   userId       — string, required for persistence
//   toast        — optional (msg)=>void ; falls back to the global #bloom-toast
//   onCustomise  — optional ()=>void ; wires the "Customise avatar" button
//                  (Dashboard passes () => setTab('settings'))
//
// NOTE: SCENES / SHOP_ITEMS / AvatarAccessoryOverlay are duplicated here from
// Dashboard for now so this page is drop-in and standalone. Once the old
// AvatarCard + ShopModal are removed from Dashboard, lift these three into a
// shared lib/companion.ts and import from both. (Flagged for the cleanup pass.)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { getMoodExpression } from '../lib/avatarMood';

// ─── SHOP DATA (mirrors Dashboard) ───────────────────────────────────────────
const SHOP_ITEMS = [
  { key: 'bow',           name: 'Floral Bow',    icon: '🎀', cost: 90,  ge: 0 },
  { key: 'flower_crown',  name: 'Flower Crown',  icon: '🌸', cost: 150, ge: 0 },
  { key: 'star_sparkles', name: 'Star Sparkles', icon: '✨', cost: 200, ge: 0 },
  { key: 'crown',         name: 'Gold Crown',    icon: '👑', cost: 250, ge: 0 },
  { key: 'wings',         name: 'Green Wings',   icon: '🍃', cost: 0,   ge: 100 },
  { key: 'halo',          name: 'Earth Halo',    icon: '🌍', cost: 0,   ge: 200 },
  { key: 'leaf_halo',     name: 'Leaf Halo',     icon: '🌿', cost: 0,   ge: 150 },
];

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

// ─── ACCESSORY OVERLAYS (mirrors Dashboard) ──────────────────────────────────
function AvatarAccessoryOverlay({ itemKey }) {
  if (!itemKey) return null;
  const overlays = {
    bow: (
      <svg width="130" height="130" viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        <path d="M48 30 C44 22 56 18 65 23 C74 18 86 22 82 30 C76 28 70 26 65 23 C60 26 54 28 48 30Z" fill="#e8a8b8"/>
        <path d="M48 30 C44 38 56 40 65 36 C74 40 86 38 82 30 C76 32 70 34 65 36 C60 34 54 32 48 30Z" fill="#e8a8b8"/>
        <circle cx="65" cy="30" r="5" fill="#d4788a"/>
      </svg>
    ),
    flower_crown: (
      <svg width="130" height="130" viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        {[[65,10],[50,16],[80,16],[38,28],[92,28]].map(([cx,cy],i)=>(
          <g key={i}>
            <circle cx={cx} cy={cy} r="7" fill="#f8c8a0"/>
            <circle cx={cx} cy={cy} r="3.5" fill="#e8882a"/>
          </g>
        ))}
      </svg>
    ),
    star_sparkles: (
      <svg width="130" height="130" viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        {[[12,22,'#f4d03f',14],[112,18,'#f4d03f',12],[8,72,'#a8d8a8',10],[118,68,'#a8d8a8',10],[65,5,'#f4d03f',16],[30,105,'#f4d03f',10],[100,108,'#e8c0d8',10]].map(([x,y,c,s],i)=>(
          <text key={i} x={x} y={y} fontSize={s} fill={String(c)} textAnchor="middle">✦</text>
        ))}
      </svg>
    ),
    crown: (
      <svg width="130" height="130" viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        <path d="M42 36 L50 16 L65 28 L80 16 L88 36 Z" fill="#d4af6a"/>
        <rect x="40" y="36" width="50" height="8" rx="2" fill="#c49a50"/>
        <circle cx="50" cy="16" r="4" fill="#f0d080"/>
        <circle cx="65" cy="28" r="4" fill="#f0d080"/>
        <circle cx="80" cy="16" r="4" fill="#f0d080"/>
      </svg>
    ),
    wings: (
      <svg width="130" height="130" viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1}}>
        <path d="M8 72 C-4 52 18 28 42 50 C32 62 26 72 30 82 C20 80 10 78 8 72Z" fill="#8aad8a" opacity="0.75"/>
        <path d="M122 72 C134 52 112 28 88 50 C98 62 104 72 100 82 C110 80 120 78 122 72Z" fill="#8aad8a" opacity="0.75"/>
      </svg>
    ),
    halo: (
      <svg width="130" height="130" viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
        <ellipse cx="65" cy="16" rx="28" ry="7" fill="none" stroke="#4ecb71" strokeWidth="4" opacity="0.9"/>
      </svg>
    ),
    leaf_halo: (
      <svg width="130" height="130" viewBox="0 0 130 130" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
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

const THREE_HOURS = 3 * 60 * 60 * 1000;
const LABEL = { fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'1.2px', color:'#888', marginBottom:12 };

// ─────────────────────────────────────────────────────────────────────────────
export default function TabCompanion({ userId, toast: toastProp, onCustomise, onNavigate, initialView }) {
  // Toast — use the passed one, else drive the global #bloom-toast element.
  const toast = toastProp || ((msg) => {
    const el = document.getElementById('bloom-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  });

  // ── Store ──────────────────────────────────────────────────────────────────
  const name           = useStore(s => s.name);
  const health         = useStore(s => s.health);
  const coins          = useStore(s => s.coins);
  const ge             = useStore(s => s.greenEnergy);
  const level          = useStore(s => s.level);
  const archetypeName  = useStore(s => s.archetypeName);
  const archetypeIcon  = useStore(s => s.archetypeIcon);
  const isRestDayToday = useStore(s => s.isRestDayToday);
  const avatarSkin     = useStore(s => s.avatarSkin);
  const avatarHair     = useStore(s => s.avatarHair);
  const avatarHairColor= useStore(s => s.avatarHairColor);
  const avatarEyes     = useStore(s => s.avatarEyes);
  const avatarBg       = useStore(s => s.avatarBg);
  const avatarAccessory= useStore(s => s.avatarAccessory);
  const avatarScene    = useStore(s => s.avatarScene);
  const setStats       = useStore(s => s.setStats);
  const setAvatarScene = useStore(s => s.setAvatarScene);

  // ── Local state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState(initialView === 'decorate' ? 'decorate' : 'companion'); // 'companion' | 'decorate'
  const [inventory, setInventory] = useState([]);
  const [ownedScenes, setOwnedScenes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bloom-owned-scenes') || '[]'); }
    catch { return []; }
  });
  const [tapState, setTapState] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('bloom-love-taps') || 'null');
      return raw && typeof raw.windowStart === 'number' ? raw : { windowStart: Date.now(), count: 0 };
    } catch { return { windowStart: Date.now(), count: 0 }; }
  });

  useEffect(() => { if (userId) loadInv(); }, [userId]);

  async function loadInv() {
    const { data } = await supabase.from('user_inventory').select('*').eq('user_id', userId);
    if (data) setInventory(data);
  }

  const equipped = inventory.find(i => i.equipped);

  // ── Love-tap mechanic (mirrors Dashboard: 10 taps / 3h → +1 health) ─────────
  const now = Date.now();
  const windowExpired = (now - tapState.windowStart) >= THREE_HOURS;
  const activeTaps = windowExpired ? 0 : tapState.count;
  const tapsFull = activeTaps >= 10;

  async function handleLoveTap(e) {
    const t = Date.now();
    let current = tapState;
    if ((t - current.windowStart) >= THREE_HOURS) current = { windowStart: t, count: 0 };
    if (current.count >= 10) {
      const minsLeft = Math.ceil((THREE_HOURS - (t - current.windowStart)) / 60000);
      toast(`💕 Come back in ${minsLeft} min for more self-love!`);
      return;
    }
    const newCount = current.count + 1;
    const newState = { windowStart: current.windowStart, count: newCount };
    setTapState(newState);
    localStorage.setItem('bloom-love-taps', JSON.stringify(newState));

    // Floating heart
    const container = document.getElementById('companion-hearts');
    if (container) {
      const heart = document.createElement('div');
      heart.textContent = ['💕','❤️','💚','🌿','✨'][Math.floor(Math.random() * 5)];
      const rect = container.getBoundingClientRect();
      const x = e ? (e.clientX - rect.left - 10) : 55;
      const y = e ? (e.clientY - rect.top - 10) : 55;
      heart.style.cssText = `position:absolute;left:${x}px;top:${y}px;font-size:22px;pointer-events:none;animation:heartFloat 1.2s ease-out forwards;z-index:10;`;
      container.appendChild(heart);
      setTimeout(() => heart.remove(), 1200);
    }
    if (newCount === 10) {
      const nh = Math.min(100, health + 1);
      setStats({ health: nh });
      if (userId) { try { await supabase.from('user_stats').update({ health: nh }).eq('user_id', userId); } catch {} }
      toast('💕 10 taps of self-love · +1 health!');
    }
  }

  // ── Buy / equip ──────────────────────────────────────────────────────────────
  async function buyScene(scene) {
    const alreadyOwned = ownedScenes.includes(scene.key) || scene.cost === 0;
    if (!alreadyOwned) {
      if (coins < scene.cost) { toast('🪙 Not enough coins!'); return; }
      const nc = coins - scene.cost;
      if (userId) { try { await supabase.from('user_stats').update({ coins: nc }).eq('user_id', userId); } catch {} }
      setStats({ coins: nc });
      const updated = [...ownedScenes, scene.key];
      setOwnedScenes(updated);
      localStorage.setItem('bloom-owned-scenes', JSON.stringify(updated));
      toast(`🎨 ${scene.name} unlocked!`);
    }
    setAvatarScene(scene.key);
    if (userId) { try { await supabase.from('users').update({ avatar_scene: scene.key }).eq('id', userId); } catch {} }
  }

  async function buyItem(item) {
    const isGE = item.ge > 0;
    if (isGE && ge < item.ge) { toast('⚡ Not enough GE!'); return; }
    if (!isGE && coins < item.cost) { toast('🪙 Not enough coins!'); return; }
    if (inventory.some(i => i.item_key === item.key)) { toast('Already owned!'); return; }
    if (isGE) { const ng = ge - item.ge; if (userId) { try { await supabase.from('user_stats').update({ green_energy: ng }).eq('user_id', userId); } catch {} } setStats({ greenEnergy: ng }); }
    else      { const nc = coins - item.cost; if (userId) { try { await supabase.from('user_stats').update({ coins: nc }).eq('user_id', userId); } catch {} } setStats({ coins: nc }); }
    if (userId) { try { await supabase.from('user_inventory').insert({ user_id: userId, item_key: item.key, item_name: item.name }); } catch {} }
    loadInv();
    toast(`🛍 ${item.name} added!`);
  }

  // Tap an owned item to equip; tap the equipped item again to unequip.
  async function toggleEquip(item) {
    if (!userId) return;
    const isEquipped = item.equipped;
    try {
      await supabase.from('user_inventory').update({ equipped: false }).eq('user_id', userId);
      if (!isEquipped) {
        await supabase.from('user_inventory').update({ equipped: true }).eq('user_id', userId).eq('item_key', item.item_key);
      }
    } catch {}
    loadInv();
    toast(isEquipped ? `${item.item_name} removed` : `✨ ${item.item_name} equipped!`);
  }

  // ── Avatar render ────────────────────────────────────────────────────────────
  const baseEyes = (avatarEyes === 'glasses' || avatarEyes === 'sunglasses') ? avatarEyes : 'open';
  const { mouth: moodMouth, eyes: moodEyes, label: moodLabel } = getMoodExpression(health, baseEyes, { isRestDay: isRestDayToday });

  const p = new URLSearchParams();
  p.set('seed', name || 'wellness');
  p.set('skinColor', avatarSkin);
  p.set('hair', avatarHair);
  p.set('hairColor', avatarHairColor);
  p.set('eyes', moodEyes);
  p.set('mouth', moodMouth);
  p.set('backgroundColor', avatarBg);
  p.set('body', avatarAccessory || 'rounded');
  p.set('facialHairProbability', '0');
  const dicebearUrl = `https://api.dicebear.com/9.x/personas/svg?${p.toString()}`;

  const currentScene = SCENES.find(s => s.key === avatarScene) || SCENES[0];
  const healthFill = health > 60
    ? 'linear-gradient(90deg,#70c070,#4ea84e)'
    : health > 30
      ? 'linear-gradient(90deg,#e8b84a,#d4a030)'
      : 'linear-gradient(90deg,#e07070,#c04040)';

  // ── Companion hunger — reads today's Nourish log (localStorage 'bloom-nourish') ──
  // Fullness reflects how much of today's plate you've RECORDED. Recording anything
  // moves the needle; nourishing meals move it a little more. Empty = "hungry".
  const MEAL_FULL = { whole: 25, mixed: 22, processed: 18, skipped: 15 };
  let fullness = 0;
  try {
    const all = JSON.parse(localStorage.getItem('bloom-nourish') || '{}');
    const todayKey = new Date().toISOString().split('T')[0];
    const d = all[todayKey] || { categories: [], meals: {} };
    const mealPts = ['breakfast', 'lunch', 'dinner'].reduce((s, slot) => s + (MEAL_FULL[d.meals?.[slot]] || 0), 0);
    const catPts = (Math.min((d.categories || []).length, 5) / 5) * 25;
    fullness = Math.min(100, Math.round(mealPts + catPts));
  } catch { fullness = 0; }

  const hungry = fullness < 40;
  const fullnessLabel = fullness === 0 ? "Hungry — feed me today's plate"
    : fullness < 40 ? 'A little peckish'
    : fullness < 80 ? 'Nicely nourished'
    : 'Full & happy';
  const fullnessFill = hungry ? 'linear-gradient(90deg,#e8a86a,#d48a3a)' : 'linear-gradient(90deg,#8aad8a,#5a7a5a)';

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '18px 18px 40px' }}>
      {/* Segmented control */}
      <div style={{ display: 'flex', gap: 6, background: '#efe9e0', borderRadius: 14, padding: 4, marginBottom: 18 }}>
        {[{ k: 'companion', l: '🌸 Companion' }, { k: 'decorate', l: '🎨 Decorate' }].map(t => (
          <button key={t.k} onClick={() => setView(t.k)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              background: view === t.k ? 'white' : 'transparent',
              color: view === t.k ? '#2a4a2a' : '#8a8a80',
              boxShadow: view === t.k ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s',
            }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ══ COMPANION VIEW ══════════════════════════════════════════════════ */}
      {view === 'companion' && (
        <div style={{ background: currentScene.gradient, border: '1.5px solid #b5ceb5', borderRadius: 24, padding: 26, textAlign: 'center', transition: 'background 0.6s ease' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(0,0,0,0.4)', marginBottom: 18 }}>Your Companion</div>

          {/* Tappable avatar */}
          <div id="companion-hearts" onClick={handleLoveTap}
            style={{ position: 'relative', width: 150, height: 150, margin: '0 auto 12px', cursor: tapsFull ? 'default' : 'pointer' }}>
            <div style={{ width: 150, height: 150, borderRadius: '50%', background: 'linear-gradient(135deg,#c8ddc8,#a8c4a8)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 8px 28px rgba(90,122,90,0.18)', animation: 'breathe 4s ease-in-out infinite', position: 'relative', overflow: 'hidden' }}>
              <object type="image/svg+xml" data={dicebearUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}>
                <span style={{ fontSize: 60 }}>🧑‍🌿</span>
              </object>
            </div>
            {/* Overlay scaled from 130 → 150 to match the larger avatar */}
            <div style={{ position: 'absolute', inset: 0, transform: 'scale(1.1538)', transformOrigin: 'center' }}>
              <AvatarAccessoryOverlay itemKey={equipped?.item_key || null} />
            </div>
            <div style={{ position: 'absolute', bottom: 6, right: 6, background: '#d4af6a', color: 'white', fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 9, zIndex: 3 }}>Lv.{level}</div>
            {hungry && (
              <div title="Log today's plate" style={{ position: 'absolute', top: -4, left: -4, background: 'white', border: '1.5px solid #e8c8a0', borderRadius: '50% 50% 50% 4px', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 3px 10px rgba(0,0,0,0.12)', zIndex: 4, animation: 'breathe 4s ease-in-out infinite' }}>🍽️</div>
            )}
          </div>

          {/* Tap progress */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: tapsFull ? 'rgba(0,0,0,0.3)' : '#c4789a', marginBottom: 6, fontWeight: 500 }}>
              {tapsFull ? '💕 Come back later for more' : '💕 Tap to show yourself some love'}
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < activeTaps ? '#e8a8b8' : 'rgba(0,0,0,0.12)', transition: 'background 0.2s' }} />
              ))}
            </div>
          </div>

          <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, marginBottom: 2 }}>{name}</div>
          {archetypeName && <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginBottom: 2 }}>{archetypeIcon} {archetypeName}</div>}
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginBottom: 14 }}>{moodLabel}</div>

          {onCustomise && (
            <button onClick={onCustomise}
              style={{ fontSize: 11, color: '#5a7a5a', background: 'rgba(255,255,255,0.55)', border: '1px solid #b5ceb5', borderRadius: 99, padding: '5px 14px', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 16 }}>
              ✏️ Customise avatar
            </button>
          )}

          {/* Health bar */}
          <div style={{ marginBottom: 10, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 500, marginBottom: 4 }}><span>❤️ Health</span><span>{health}%</span></div>
            <div style={{ height: 7, background: 'rgba(0,0,0,0.1)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${health}%`, background: healthFill, borderRadius: 99, transition: 'width 0.8s' }} />
            </div>
          </div>

          {/* Fullness meter — driven by today's Nourish log */}
          <div style={{ marginBottom: 12, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 500, marginBottom: 4 }}><span>🍽️ Fullness</span><span style={{ color: hungry ? '#c47a2a' : 'inherit' }}>{fullnessLabel}</span></div>
            <div style={{ height: 7, background: 'rgba(0,0,0,0.1)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${fullness}%`, background: fullnessFill, borderRadius: 99, transition: 'width 0.8s' }} />
            </div>
          </div>

          {/* Feed CTA → Nourish */}
          {onNavigate && (
            <button onClick={() => onNavigate('nourish')}
              style={{
                width: '100%', marginBottom: 14, padding: '11px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 600,
                border: hungry ? 'none' : '1.5px solid rgba(255,255,255,0.8)',
                background: hungry ? 'linear-gradient(135deg,#e8a86a,#d48a3a)' : 'rgba(255,255,255,0.6)',
                color: hungry ? 'white' : '#5a7a5a',
                boxShadow: hungry ? '0 3px 12px rgba(212,138,58,0.35)' : 'none',
                transition: 'all 0.2s',
              }}>
              {hungry ? "🍽️ Feed me — log today's plate →" : '🥗 Update today\u2019s plate →'}
            </button>
          )}

          {/* Coins + GE */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: coins.toLocaleString(), l: '🪙 Coins', c: '#d4af6a' }, { v: ge, l: '⚡ GE', c: '#38a855' }].map(x => (
              <div key={x.l} style={{ flex: 1, background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.8)', borderRadius: 12, padding: '11px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'Syne,sans-serif', color: x.c }}>{x.v}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{x.l}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(232,217,196,0.6)', border: '1px solid rgba(196,168,130,0.5)', borderRadius: 12, padding: '9px 12px', fontSize: 10, color: '#7a6040', marginTop: 14, textAlign: 'left', lineHeight: 1.5 }}>
            🔬 Lally et al. (2010): habits form in 18–254 days — consistency is the key variable.
          </div>
        </div>
      )}

      {/* ══ DECORATE VIEW ═══════════════════════════════════════════════════ */}
      {view === 'decorate' && (
        <div>
          {/* Balance */}
          <div style={{ background: '#f7f3ed', borderRadius: 14, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 20, fontSize: 14 }}>
            <span>🪙 <strong>{coins.toLocaleString()}</strong></span>
            <span>⚡ <strong>{ge}</strong> GE</span>
          </div>

          {/* Scenery */}
          <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 16 }}>
            <div style={LABEL}>Scenery 🎨</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {SCENES.map(scene => {
                const owned = ownedScenes.includes(scene.key) || scene.cost === 0;
                const active = (avatarScene === scene.key) || (!avatarScene && scene.key === 'default');
                return (
                  <div key={scene.key} onClick={() => buyScene(scene)}
                    style={{ border: `1.5px solid ${active ? '#8aad8a' : owned ? '#b5ceb5' : '#e8e4de'}`, borderRadius: 13, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: '100%', height: 34, borderRadius: 8, background: scene.gradient, marginBottom: 7 }} />
                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{scene.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: active ? '#5a7a5a' : owned ? '#8aad8a' : '#d4af6a' }}>
                      {active ? '✓ Active' : owned ? 'Tap to use' : scene.cost === 0 ? 'Free' : `🪙 ${scene.cost}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accessories — coin */}
          <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 16 }}>
            <div style={LABEL}>Accessories 🪄</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {SHOP_ITEMS.filter(i => i.cost > 0).map(item => {
                const owned = inventory.some(iv => iv.item_key === item.key);
                return (
                  <div key={item.key} onClick={() => !owned && buyItem(item)}
                    style={{ border: `1.5px solid ${owned ? '#8aad8a' : '#e8e4de'}`, background: owned ? '#f3f8f3' : 'white', borderRadius: 13, padding: '12px 8px', textAlign: 'center', cursor: owned ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: 28, marginBottom: 7 }}>{item.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: owned ? '#8aad8a' : '#d4af6a', fontWeight: 600 }}>{owned ? '✓ Owned' : `🪙 ${item.cost}`}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Green Rewards — GE */}
          <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px', marginBottom: 16 }}>
            <div style={LABEL}>Green Rewards ⚡</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {SHOP_ITEMS.filter(i => i.ge > 0).map(item => {
                const owned = inventory.some(iv => iv.item_key === item.key);
                return (
                  <div key={item.key} onClick={() => !owned && buyItem(item)}
                    style={{ border: `1.5px solid ${owned ? '#8aad8a' : '#e8e4de'}`, background: owned ? '#f3f8f3' : 'white', borderRadius: 13, padding: '12px 8px', textAlign: 'center', cursor: owned ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: 28, marginBottom: 7 }}>{item.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: owned ? '#8aad8a' : '#38a855', fontWeight: 600 }}>{owned ? '✓ Owned' : `⚡ ${item.ge} GE`}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Your items — equip / unequip */}
          <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '18px 20px' }}>
            <div style={LABEL}>Your Accessories</div>
            {inventory.length === 0 ? (
              <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', margin: '6px 0', fontStyle: 'italic' }}>
                Nothing yet — earn coins through your habits, then treat your companion.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {inventory.map(item => {
                  const si = SHOP_ITEMS.find(s => s.key === item.item_key);
                  return (
                    <div key={item.id} onClick={() => toggleEquip(item)}
                      style={{ border: `1.5px solid ${item.equipped ? '#d4af6a' : '#e8e4de'}`, background: item.equipped ? '#fdf8ed' : 'white', borderRadius: 13, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ fontSize: 26, marginBottom: 5 }}>{si?.icon || '✨'}</div>
                      <div style={{ fontSize: 11, fontWeight: 500 }}>{item.item_name}</div>
                      <div style={{ fontSize: 10, color: item.equipped ? '#d4af6a' : '#888', marginTop: 3 }}>{item.equipped ? '✓ Tap to remove' : 'Tap to equip'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Local keyframes (mirror Dashboard's, in case this renders standalone) */}
      <style>{`
        @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
        @keyframes heartFloat{0%{transform:translateY(0) scale(0.5);opacity:0}20%{opacity:1;transform:scale(1.2)}100%{transform:translateY(-80px) scale(0.8);opacity:0}}
      `}</style>
    </div>
  );
}
