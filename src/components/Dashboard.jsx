'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getHabitsForUser, getCurrentWeek, getDayOfWeek, ARCHETYPE_INFO } from '../lib/springProgram';
import { useStore } from '../lib/store';
import CommunityFeed from './CommunityFeed';
import ProgressStats from './ProgressStats';

export default function Dashboard() {
  const [shopOpen, setShopOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionText, setReflectionText] = useState({ worked: '', challenging: '', energy: 3 });
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);

  const userId = useStore(s => s.userId);
  const name = useStore(s => s.name);
  const archetypeKey = useStore(s => s.archetypeKey);
  const archetypeName = useStore(s => s.archetypeName);
  const archetypeIcon = useStore(s => s.archetypeIcon);
  const chronotype = useStore(s => s.chronotype);
  const avatarEmoji = useStore(s => s.avatarEmoji);
  const avatarName = useStore(s => s.avatarName);
  const health = useStore(s => s.health);
  const coins = useStore(s => s.coins);
  const greenEnergy = useStore(s => s.greenEnergy);
  const level = useStore(s => s.level);
  const habits = useStore(s => s.habits);
  const completedToday = useStore(s => s.completedToday);

  const setUser = useStore(s => s.setUser);
  const setStats = useStore(s => s.setStats);
  const setHabits = useStore(s => s.setHabits);
  const toggleHabit = useStore(s => s.toggleHabit);

  // Resolve display archetype — fall back gracefully
  const displayArchetype = archetypeKey && ARCHETYPE_INFO[archetypeKey]
    ? ARCHETYPE_INFO[archetypeKey]
    : { name: archetypeName || 'Spring Reset', icon: archetypeIcon || '🌿' };

  useEffect(() => {
    if (userId) {
      loadUserData();
      loadInventory();
    }
  }, [userId]);

  async function loadUserData() {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (user) {
        let startDate = user.program_start_date;
        if (!startDate) {
          startDate = new Date().toISOString();
          await supabase.from('users').update({ program_start_date: startDate }).eq('id', userId);
        }

        const week = getCurrentWeek(startDate);
        const day = getDayOfWeek(startDate);
        setCurrentWeek(week);
        setDayOfWeek(day);

        // Prompt reflection if new week just started
        if (day === 1 && week > 1 && (user.current_week || 1) < week) {
          const { data: reflection } = await supabase
            .from('weekly_reflections')
            .select('id')
            .eq('user_id', userId)
            .eq('week_number', week - 1)
            .single();

          if (!reflection) setReflectionOpen(true);
        }

        // Load archetype-based habits
        const habitSource = archetypeKey || user.chronotype || 'steadybuilder';
        const weekHabits = getHabitsForUser(habitSource, week);
        setHabits(weekHabits);

        // Update current_week in db if needed
        if ((user.current_week || 1) !== week) {
          await supabase.from('users').update({ current_week: week }).eq('id', userId);
        }
      }

      // Load stats
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (stats) {
        setStats({
          health: stats.health,
          coins: stats.coins,
          greenEnergy: stats.green_energy,
          level: stats.level,
        });
      }

      // Load today's completions
      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await supabase
        .from('habit_completions')
        .select('habit_key')
        .eq('user_id', userId)
        .eq('date', today);

      if (completions) {
        completions.forEach(c => {
          if (!completedToday.includes(c.habit_key)) {
            toggleHabit(c.habit_key);
          }
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading user data:', err);
      setLoading(false);
    }
  }

  async function loadInventory() {
    const { data } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', userId);
    if (data) setInventory(data);
  }

  async function handleToggleHabit(habit) {
    const isCompleted = completedToday.includes(habit.key);
    const today = new Date().toISOString().split('T')[0];

    toggleHabit(habit.key);

    if (!isCompleted) {
      await supabase.from('habit_completions').insert({
        user_id: userId,
        habit_key: habit.key,
        date: today,
      });

      const newCoins = coins + habit.coins;
      const newGE = greenEnergy + habit.ge;
      const newHealth = Math.min(100, health + 3);

      await supabase
        .from('user_stats')
        .update({ coins: newCoins, green_energy: newGE, health: newHealth })
        .eq('user_id', userId);

      setStats({ coins: newCoins, greenEnergy: newGE, health: newHealth });
      showToast(`✅ +${habit.coins} 🪙${habit.ge > 0 ? ` +${habit.ge} ⚡` : ''}`);
    } else {
      await supabase
        .from('habit_completions')
        .delete()
        .eq('user_id', userId)
        .eq('habit_key', habit.key)
        .eq('date', today);

      const newCoins = Math.max(0, coins - habit.coins);
      const newGE = Math.max(0, greenEnergy - habit.ge);
      const newHealth = Math.max(0, health - 2);

      await supabase
        .from('user_stats')
        .update({ coins: newCoins, green_energy: newGE, health: newHealth })
        .eq('user_id', userId);

      setStats({ coins: newCoins, greenEnergy: newGE, health: newHealth });
      showToast('↩️ Habit unmarked');
    }
  }

  async function buyItem(itemKey, itemName, cost) {
    if (coins < cost) { showToast('🪙 Not enough coins!'); return; }

    const newCoins = coins - cost;

    await supabase.from('user_stats').update({ coins: newCoins }).eq('user_id', userId);
    await supabase.from('user_inventory').insert({ user_id: userId, item_key: itemKey, item_name: itemName });

    setStats({ coins: newCoins });
    loadInventory();
    showToast(`🛍 Purchased ${itemName}!`);
    setShopOpen(false);
  }

  async function donateGE(org, amount) {
    if (greenEnergy < amount) { showToast('⚡ Not enough Green Energy!'); return; }

    const newGE = greenEnergy - amount;

    await supabase.from('user_stats').update({ green_energy: newGE }).eq('user_id', userId);
    await supabase.from('green_donations').insert({ user_id: userId, organization: org, amount_ge: amount });
    await supabase.from('community_posts').insert({
      user_id: userId,
      user_name: name,
      user_avatar_emoji: avatarEmoji,
      post_type: 'donation',
      content: `Donated ${amount} GE to ${org} 🌍`,
    });

    setStats({ greenEnergy: newGE });
    showToast(`🌍 Donated ${amount} GE to ${org}!`);
    setDonateOpen(false);
  }

  async function submitReflection() {
    const previousWeek = currentWeek - 1;

    await supabase.from('weekly_reflections').insert({
      user_id: userId,
      week_number: previousWeek,
      what_worked: reflectionText.worked,
      what_was_challenging: reflectionText.challenging,
      energy_level: reflectionText.energy,
    });

    await supabase.from('users').update({ current_week: currentWeek }).eq('id', userId);
    await supabase.from('community_posts').insert({
      user_id: userId,
      user_name: name,
      user_avatar_emoji: avatarEmoji,
      post_type: 'week_complete',
      content: `Completed Week ${previousWeek} of the Spring Reset! 🌱`,
    });

    setReflectionOpen(false);
    showToast(`✨ Week ${previousWeek} complete! Welcome to Week ${currentWeek}!`);
    loadUserData();
  }

  function showToast(msg) {
    const toast = document.getElementById('bloom-toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }

  // ─── LOADING ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ed' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
          <p style={{ fontSize: 14, color: '#888' }}>Loading your program...</p>
        </div>
      </div>
    );
  }

  const completionRate = habits.length > 0
    ? Math.round((completedToday.length / habits.length) * 100)
    : 0;
  const moodText = health > 70
    ? 'Thriving · Great work! 🔥'
    : health > 40
      ? 'Building momentum 💪'
      : 'Need some care 🌱';

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f7f3ed', padding: '20px', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* TOP BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 32, marginBottom: 4, color: '#1a1a1a' }}>
              Hi {name}! ✨
            </h1>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
              Week {currentWeek} · Day {dayOfWeek} · {habits.length - completedToday.length} habits remaining
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f8f3', border: '1px solid #b5ceb5', borderRadius: 99, padding: '4px 12px', fontSize: 12, color: '#5a7a5a', fontWeight: 500 }}>
              {displayArchetype.icon} {displayArchetype.name}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div
              onClick={() => setShopOpen(true)}
              style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 12, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>🪙</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{coins.toLocaleString()}</span>
            </div>
            <div
              onClick={() => setDonateOpen(true)}
              style={{ background: '#f0fdf4', border: '1.5px solid #4ecb71', borderRadius: 12, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>⚡</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#276a3a' }}>{greenEnergy} GE</span>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,280px) minmax(0,1fr) minmax(0,320px)', gap: 20, alignItems: 'start' }}
          className="dash-main-grid"
        >

          {/* ── LEFT: AVATAR ── */}
          <div style={{ background: 'linear-gradient(160deg,#e8f0e8,#f0ede8)', border: '1.5px solid #b5ceb5', borderRadius: 20, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 16 }}>
              Your Companion
            </div>

            <div style={{ width: 140, height: 140, margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg,#c8ddc8,#a8c4a8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 8px 32px rgba(90,122,90,0.2)', position: 'relative' }}>
              {avatarEmoji}
              <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#d4af6a', color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10 }}>
                Lv. {level}
              </div>
            </div>

            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 20, marginBottom: 4 }}>{avatarName || name}</div>
            <div style={{ fontSize: 12, color: '#5a7a5a', marginBottom: 16 }}>{moodText}</div>

            {/* Health bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 500, marginBottom: 4 }}>
                <span>❤️ Health</span><span>{health}%</span>
              </div>
              <div style={{ height: 8, background: '#e8d9c4', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${health}%`, background: 'linear-gradient(90deg,#70c070,#4ea84e)', borderRadius: 99, transition: 'width 0.8s' }} />
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 500, marginBottom: 4 }}>
                <span>📋 Today</span><span>{completedToday.length}/{habits.length}</span>
              </div>
              <div style={{ height: 8, background: '#e8d9c4', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${completionRate}%`, background: 'linear-gradient(90deg,#8aad8a,#5a7a5a)', borderRadius: 99, transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Coin / GE display */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: 'white', border: '1.5px solid #e8e4de', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#d4af6a' }}>{coins.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#888' }}>🪙 Coins</div>
              </div>
              <div style={{ flex: 1, background: 'white', border: '1.5px solid #e8e4de', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#38a855' }}>{greenEnergy}</div>
                <div style={{ fontSize: 10, color: '#888' }}>⚡ GE</div>
              </div>
            </div>

            {/* Inventory preview */}
            {inventory.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'white', borderRadius: 12, border: '1.5px solid #e8e4de' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Equipped</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {inventory.filter(i => i.equipped).map(item => (
                    <span key={item.id} style={{ fontSize: 20 }}>{item.item_name?.split(' ').pop() || '✨'}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#e8d9c4', border: '1px solid #c4a882', borderRadius: 10, padding: '10px 12px', fontSize: 10, color: '#7a6040', marginTop: 14, textAlign: 'left', lineHeight: 1.5 }}>
              🔬 Habit streaks reduce decision fatigue. Lally et al. (2010): habits form in 18–254 days — consistency is the key variable.
            </div>
          </div>

          {/* ── MIDDLE: HABITS ── */}
          <div>
            <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 16 }}>
                Today&apos;s Habits · Week {currentWeek} · {displayArchetype.icon} {displayArchetype.name}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {habits.map(habit => {
                  const isCompleted = completedToday.includes(habit.key);
                  return (
                    <div
                      key={habit.key}
                      onClick={() => handleToggleHabit(habit)}
                      style={{
                        border: `1.5px solid ${isCompleted ? '#8aad8a' : '#e8e4de'}`,
                        borderLeft: habit.ge > 0 ? '3px solid #4ecb71' : `1.5px solid ${isCompleted ? '#8aad8a' : '#e8e4de'}`,
                        borderRadius: 14,
                        padding: 14,
                        background: isCompleted ? '#f3f8f3' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>{habit.emoji}</span>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isCompleted ? '#8aad8a' : '#e8e4de'}`, background: isCompleted ? '#8aad8a' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: isCompleted ? 'white' : 'transparent' }}>
                          ✓
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{habit.name}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {habit.time && <span style={{ fontSize: 10, color: '#888' }}>{habit.time}</span>}
                        <span style={{ fontSize: 10, color: '#d4af6a', fontWeight: 600 }}>+{habit.coins} 🪙</span>
                        {habit.ge > 0 && <span style={{ fontSize: 10, color: '#38a855', fontWeight: 600 }}>+{habit.ge} ⚡</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 20, padding: 16, background: '#f7f3ed', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span>Today&apos;s Progress</span>
                  <span style={{ fontWeight: 600 }}>{completedToday.length}/{habits.length} complete</span>
                </div>
                <div style={{ height: 8, background: '#e8e4de', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${completionRate}%`, background: 'linear-gradient(90deg,#8aad8a,#5a7a5a)', borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
              </div>
            </div>

            {/* Progress Stats */}
            <ProgressStats />
          </div>

          {/* ── RIGHT: COMMUNITY ── */}
          <div>
            <CommunityFeed />
          </div>

        </div>
      </div>

      {/* ── SHOP MODAL ── */}
      {shopOpen && (
        <div onClick={() => setShopOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 24, padding: 28, width: 500, maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24 }}>Avatar Shop 🛍</h2>
              <button onClick={() => setShopOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ background: '#f7f3ed', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
              🪙 <strong>{coins.toLocaleString()}</strong> Bloom Coins
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { key: 'crown', name: 'Tiny Crown 👑', cost: 200, icon: '👑' },
                { key: 'scarf', name: 'Cozy Scarf 🧣', cost: 150, icon: '🧣' },
                { key: 'flowers', name: 'Flower Garden 🌸', cost: 300, icon: '🌸' },
                { key: 'star', name: 'Starry BG ✨', cost: 500, icon: '✨' },
                { key: 'hat', name: 'Sun Hat ☀️', cost: 250, icon: '☀️' },
                { key: 'glasses', name: 'Round Glasses 👓', cost: 120, icon: '👓' },
              ].map(item => {
                const owned = inventory.some(i => i.item_key === item.key);
                return (
                  <div
                    key={item.key}
                    onClick={() => !owned && buyItem(item.key, item.name, item.cost)}
                    style={{ border: `1.5px solid ${owned ? '#8aad8a' : '#e8e4de'}`, background: owned ? '#f3f8f3' : 'white', borderRadius: 14, padding: 14, textAlign: 'center', cursor: owned ? 'default' : 'pointer', transition: 'all 0.2s' }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{item.name.split(' ').slice(0,-1).join(' ')}</div>
                    <div style={{ fontSize: 11, color: owned ? '#8aad8a' : '#d4af6a', fontWeight: 600 }}>
                      {owned ? '✓ Owned' : `🪙 ${item.cost}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── DONATE MODAL ── */}
      {donateOpen && (
        <div onClick={() => setDonateOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 24, padding: 28, width: 500, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24 }}>Donate Green Energy 🌍</h2>
              <button onClick={() => setDonateOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 16px', marginBottom: 20, border: '1px solid #4ecb71', fontSize: 14 }}>
              ⚡ <strong>{greenEnergy}</strong> Green Energy available
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Ocean Conservancy', 'Rainforest Alliance', 'World Wildlife Fund'].map(org => (
                <div
                  key={org}
                  onClick={() => donateGE(org, 100)}
                  style={{ border: '1.5px solid #e8e4de', borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{org}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Donate 100 GE</div>
                  </div>
                  <span style={{ fontSize: 24 }}>🌍</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── REFLECTION MODAL ── */}
      {reflectionOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, width: 540, maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, marginBottom: 8 }}>
              Week {currentWeek - 1} Reflection ✨
            </h2>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
              Take a moment before continuing to Week {currentWeek}
            </p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
              What worked well?
            </label>
            <textarea
              value={reflectionText.worked}
              onChange={e => setReflectionText({ ...reflectionText, worked: e.target.value })}
              placeholder="Share what helped you succeed..."
              style={{ width: '100%', padding: 14, borderRadius: 12, border: '1.5px solid #e8e4de', fontSize: 14, fontFamily: 'DM Sans, sans-serif', minHeight: 80, resize: 'vertical', marginBottom: 16 }}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
              What was challenging?
            </label>
            <textarea
              value={reflectionText.challenging}
              onChange={e => setReflectionText({ ...reflectionText, challenging: e.target.value })}
              placeholder="What obstacles did you face?"
              style={{ width: '100%', padding: 14, borderRadius: 12, border: '1.5px solid #e8e4de', fontSize: 14, fontFamily: 'DM Sans, sans-serif', minHeight: 80, resize: 'vertical', marginBottom: 16 }}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>
              Energy Level This Week (1–5)
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setReflectionText({ ...reflectionText, energy: n })}
                  style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${reflectionText.energy === n ? '#8aad8a' : '#e8e4de'}`, background: reflectionText.energy === n ? '#f3f8f3' : 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: reflectionText.energy === n ? '#8aad8a' : '#888' }}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              onClick={submitReflection}
              disabled={!reflectionText.worked || !reflectionText.challenging}
              style={{ width: '100%', padding: 14, background: !reflectionText.worked || !reflectionText.challenging ? '#ccc' : '#8aad8a', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: !reflectionText.worked || !reflectionText.challenging ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              Continue to Week {currentWeek} →
            </button>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div
        id="bloom-toast"
        style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%) translateY(20px)', background: '#1a1a1a', color: 'white', padding: '12px 20px', borderRadius: 99, fontSize: 13, fontWeight: 500, opacity: 0, transition: 'all 0.3s', zIndex: 300, whiteSpace: 'nowrap', pointerEvents: 'none' }}
        className="toast"
      />

      <style jsx>{`
        .toast.show {
          opacity: 1 !important;
          transform: translateX(-50%) translateY(0) !important;
        }
        @media (max-width: 900px) {
          .main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
