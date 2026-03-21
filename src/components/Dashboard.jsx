'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getHabitsForUser, getCurrentWeek, getDayOfWeek } from '../lib/springProgram';
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

  const userId = useStore(state => state.userId);
  const name = useStore(state => state.name);
  const chronotype = useStore(state => state.chronotype);
  const avatarEmoji = useStore(state => state.avatarEmoji);
  const avatarName = useStore(state => state.avatarName);
  const health = useStore(state => state.health);
  const coins = useStore(state => state.coins);
  const greenEnergy = useStore(state => state.greenEnergy);
  const level = useStore(state => state.level);
  const habits = useStore(state => state.habits);
  const completedToday = useStore(state => state.completedToday);
  
  const setUser = useStore(state => state.setUser);
  const setStats = useStore(state => state.setStats);
  const setHabits = useStore(state => state.setHabits);
  const toggleHabit = useStore(state => state.toggleHabit);

  const [programStartDate, setProgramStartDate] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);

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
          await supabase
            .from('users')
            .update({ program_start_date: startDate })
            .eq('id', userId);
        }

        setProgramStartDate(startDate);
        const week = getCurrentWeek(startDate);
        const day = getDayOfWeek(startDate);
        setCurrentWeek(week);
        setDayOfWeek(day);

        if (day === 1 && week > 1 && user.current_week < week) {
          const { data: reflection } = await supabase
            .from('weekly_reflections')
            .select('*')
            .eq('user_id', userId)
            .eq('week_number', week - 1)
            .single();

          if (!reflection) {
            setReflectionOpen(true);
          }
        }

        const weekHabits = getHabitsForUser(chronotype, week);
        setHabits(weekHabits);

        if (user.current_week !== week) {
          await supabase
            .from('users')
            .update({ current_week: week })
            .eq('id', userId);
        }
      }

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
          level: stats.level
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await supabase
        .from('habit_completions')
        .select('habit_key')
        .eq('user_id', userId)
        .eq('date', today);

      if (completions) {
        completions.forEach(c => toggleHabit(c.habit_key));
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
      await supabase
        .from('habit_completions')
        .insert({
          user_id: userId,
          habit_key: habit.key,
          date: today
        });

      const newCoins = coins + habit.coins;
      const newGE = greenEnergy + habit.ge;
      const newHealth = Math.min(100, health + 3);

      await supabase
        .from('user_stats')
        .update({
          coins: newCoins,
          green_energy: newGE,
          health: newHealth
        })
        .eq('user_id', userId);

      setStats({
        coins: newCoins,
        greenEnergy: newGE,
        health: newHealth
      });

      await updateStreak(habit.key);

      showToast(`✅ +${habit.coins} 🪙${habit.ge > 0 ? ` +${habit.ge} ⚡` : ''}`);
    } else {
      await supabase
        .from('habit_completions')
        .delete()
        .eq('user_id', userId)
        .eq('habit_key', habit.key)
        .eq('date', today);

      const newCoins = coins - habit.coins;
      const newGE = greenEnergy - habit.ge;
      const newHealth = Math.max(0, health - 3);

      await supabase
        .from('user_stats')
        .update({
          coins: newCoins,
          green_energy: newGE,
          health: newHealth
        })
        .eq('user_id', userId);

      setStats({
        coins: newCoins,
        greenEnergy: newGE,
        health: newHealth
      });

      showToast('↩️ Habit unmarked');
    }
  }

  async function updateStreak(habitKey) {
    const { data: streak } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_key', habitKey)
      .single();

    const today = new Date().toISOString().split('T')[0];

    if (streak) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = streak.current_streak;

      if (streak.last_completed === yesterdayStr) {
        newStreak += 1;
      } else if (streak.last_completed !== today) {
        newStreak = 1;
      }

      await supabase
        .from('streaks')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak),
          last_completed: today
        })
        .eq('user_id', userId)
        .eq('habit_key', habitKey);

      if (newStreak === 7 || newStreak === 14 || newStreak === 21 || newStreak === 30) {
        const habit = habits.find(h => h.key === habitKey);
        await supabase
          .from('community_posts')
          .insert({
            user_id: userId,
            user_name: name,
            user_avatar_emoji: avatarEmoji,
            post_type: 'streak',
            content: `Hit a ${newStreak}-day streak on "${habit?.name}"! 🔥`,
            metadata: { habit_key: habitKey, streak_days: newStreak }
          });
      }
    } else {
      await supabase
        .from('streaks')
        .insert({
          user_id: userId,
          habit_key: habitKey,
          current_streak: 1,
          longest_streak: 1,
          last_completed: today
        });
    }
  }

  async function buyItem(itemKey, itemName, cost) {
    if (coins < cost) {
      showToast('🪙 Not enough coins!');
      return;
    }

    const newCoins = coins - cost;

    await supabase
      .from('user_stats')
      .update({ coins: newCoins })
      .eq('user_id', userId);

    await supabase
      .from('user_inventory')
      .insert({
        user_id: userId,
        item_key: itemKey,
        item_name: itemName
      });

    setStats({ coins: newCoins });
    loadInventory();
    showToast(`🛍 Purchased ${itemName}!`);
    setShopOpen(false);
  }

  async function donateGE(org, amount) {
    if (greenEnergy < amount) {
      showToast('⚡ Not enough Green Energy!');
      return;
    }

    const newGE = greenEnergy - amount;

    await supabase
      .from('user_stats')
      .update({ green_energy: newGE })
      .eq('user_id', userId);

    await supabase
      .from('green_energy_donations')
      .insert({
        user_id: userId,
        organization: org,
        amount: amount
      });

    await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        user_name: name,
        user_avatar_emoji: avatarEmoji,
        post_type: 'donation',
        content: `Donated ${amount} GE to ${org}`,
        metadata: { organization: org, amount: amount }
      });

    setStats({ greenEnergy: newGE });
    showToast(`🌍 Donated ${amount} GE to ${org}!`);
    setDonateOpen(false);
  }

  async function submitReflection() {
    const previousWeek = currentWeek - 1;

    await supabase
      .from('weekly_reflections')
      .insert({
        user_id: userId,
        week_number: previousWeek,
        what_worked: reflectionText.worked,
        what_was_challenging: reflectionText.challenging,
        energy_level: reflectionText.energy
      });

    await supabase
      .from('users')
      .update({ current_week: currentWeek })
      .eq('id', userId);

    await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        user_name: name,
        user_avatar_emoji: avatarEmoji,
        post_type: 'week_complete',
        content: `Completed Week ${previousWeek} of Spring Energy Reset! 🌱`,
        metadata: { week: previousWeek }
      });

    setReflectionOpen(false);
    showToast(`✨ Week ${previousWeek} complete! Welcome to Week ${currentWeek}!`);
    
    loadUserData();
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ed' }}>
        <p style={{ fontSize: '16px', color: '#888' }}>Loading your program...</p>
      </div>
    );
  }

  const completionRate = habits.length > 0 ? Math.round((completedToday.length / habits.length) * 100) : 0;
  const moodText = health > 70 ? 'Thriving · Great work! 🔥' : health > 40 ? 'Building momentum 💪' : 'Need some care 🌱';

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3ed', padding: '20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '32px', marginBottom: '4px' }}>
              Hi {name}! ✨
            </h1>
            <p style={{ fontSize: '14px', color: '#888' }}>
              Week {currentWeek} · Day {dayOfWeek} · {habits.length - completedToday.length} habits to complete
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div onClick={() => setShopOpen(true)} style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: '12px', padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🪙</span>
              <span style={{ fontWeight: '600', fontSize: '14px' }}>{coins}</span>
            </div>
            <div onClick={() => setDonateOpen(true)} style={{ background: '#f0fdf4', border: '1.5px solid #4ecb71', borderRadius: '12px', padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span>
              <span style={{ fontWeight: '600', fontSize: '14px', color: '#276a3a' }}>{greenEnergy} GE</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 340px', gap: '20px', alignItems: 'start' }}>
          
          <div style={{ background: 'linear-gradient(160deg, #e8f0e8, #f0ede8)', border: '1.5px solid #b5ceb5', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: '16px' }}>
              Your Companion
            </div>
            
            <div style={{ width: '140px', height: '140px', margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg, #c8ddc8, #a8c4a8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 8px 32px rgba(90,122,90,0.2)', position: 'relative' }}>
              {avatarEmoji}
              <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: '#d4af6a', color: 'white', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px' }}>
                Lv. {level}
              </div>
            </div>

            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: '20px', marginBottom: '4px' }}>
              {avatarName}
            </div>
            <div style={{ fontSize: '12px', color: '#5a7a5a', marginBottom: '16px' }}>
              {moodText}
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '500', marginBottom: '4px' }}>
                <span>❤️ Health</span>
                <span>{health}%</span>
              </div>
              <div style={{ height: '8px', background: '#e8d9c4', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${health}%`, background: 'linear-gradient(90deg, #70c070, #4ea84e)', borderRadius: '99px', transition: 'width 0.8s' }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <div style={{ flex: 1, background: 'white', border: '1.5px solid #e8e4de', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: '#d4af6a' }}>{coins}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>Coins</div>
              </div>
              <div style={{ flex: 1, background: 'white', border: '1.5px solid #e8e4de', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: '#38a855' }}>{greenEnergy}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>GE</div>
              </div>
            </div>

            <div style={{ background: '#e8d9c4', border: '1px solid #c4a882', borderRadius: '10px', padding: '10px 12px', fontSize: '10px', color: '#7a6040', marginTop: '16px', textAlign: 'left', lineHeight: '1.4' }}>
              <strong>💡 Tip:</strong> Complete habits before noon for a 20% health boost!
            </div>
          </div>

          <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: '20px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: '16px' }}>
              Today's Habits · Week {currentWeek}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {habits.map(habit => {
                const isCompleted = completedToday.includes(habit.key);
                return (
                  <div
                    key={habit.key}
                    onClick={() => handleToggleHabit(habit)}
                    style={{
                      borderTop: `1.5px solid ${isCompleted ? '#8aad8a' : '#e8e4de'}`,
                      borderRight: `1.5px solid ${isCompleted ? '#8aad8a' : '#e8e4de'}`,
                      borderBottom: `1.5px solid ${isCompleted ? '#8aad8a' : '#e8e4de'}`,
                      borderLeft: habit.ge > 0 ? '3px solid #4ecb71' : `1.5px solid ${isCompleted ? '#8aad8a' : '#e8e4de'}`,
                      borderRadius: '14px',
                      padding: '14px',
                      background: isCompleted ? '#f3f8f3' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px' }}>{habit.emoji}</span>
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: `2px solid ${isCompleted ? '#8aad8a' : '#e8e4de'}`,
                        background: isCompleted ? '#8aad8a' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: isCompleted ? 'white' : 'transparent'
                      }}>
                        ✓
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                      {habit.name}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {habit.time && (
                        <span style={{ fontSize: '10px', color: '#888' }}>{habit.time}</span>
                      )}
                      <span style={{ fontSize: '10px', color: '#d4af6a', fontWeight: '600' }}>
                        +{habit.coins} 🪙
                      </span>
                      {habit.ge > 0 && (
                        <span style={{ fontSize: '10px', color: '#38a855', fontWeight: '600' }}>
                          +{habit.ge} ⚡
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '20px', padding: '16px', background: '#f7f3ed', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                <span>Today's Progress</span>
                <span style={{ fontWeight: '600' }}>{completedToday.length}/{habits.length} complete</span>
              </div>
              <div style={{ height: '8px', background: '#e8e4de', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${completionRate}%`, background: 'linear-gradient(90deg, #8aad8a, #5a7a5a)', borderRadius: '99px', transition: 'width 0.5s' }}></div>
              </div>
            </div>
          </div>

          <div>
            <CommunityFeed />
          </div>
 {/* Progress Stats - Below Community */}
 <div style={{ marginTop: '20px' }}>
              <ProgressStats />
              </div>
        </div>
      </div>

      {shopOpen && (
        <div onClick={() => setShopOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', padding: '28px', width: '500px', maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '24px' }}> Shop 🛍</h2>
              <button onClick={() => setShopOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ background: '#f7f3ed', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
              <strong>🪙 {coins}</strong> Bloom Coins
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div onClick={() => buyItem('crown', 'Tiny Crown 👑', 200)} style={{ border: '1.5px solid #e8e4de', borderRadius: '14px', padding: '14px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👑</div>
                <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>Tiny Crown</div>
                <div style={{ fontSize: '11px', color: '#d4af6a', fontWeight: '600' }}>🪙 200</div>
              </div>
              <div onClick={() => buyItem('scarf', 'Cozy Scarf 🧣', 150)} style={{ border: '1.5px solid #e8e4de', borderRadius: '14px', padding: '14px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧣</div>
                <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>Cozy Scarf</div>
                <div style={{ fontSize: '11px', color: '#d4af6a', fontWeight: '600' }}>🪙 150</div>
              </div>
              <div onClick={() => buyItem('flowers', 'Flower Garden 🌸', 300)} style={{ border: '1.5px solid #e8e4de', borderRadius: '14px', padding: '14px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌸</div>
                <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>Flower Garden</div>
                <div style={{ fontSize: '11px', color: '#d4af6a', fontWeight: '600' }}>🪙 300</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {donateOpen && (
        <div onClick={() => setDonateOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', padding: '28px', width: '500px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '24px' }}>Donate Green Energy 🌍</h2>
              <button onClick={() => setDonateOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', border: '1px solid #4ecb71' }}>
              <strong>⚡ {greenEnergy}</strong> Green Energy available
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['Ocean Conservancy', 'Rainforest Alliance', 'World Wildlife Fund'].map(org => (
                <div key={org} onClick={() => donateGE(org, 100)} style={{ border: '1.5px solid #e8e4de', borderRadius: '14px', padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{org}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>Donate 100 GE</div>
                  </div>
                  <div style={{ fontSize: '20px' }}>🌍</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reflectionOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '540px', maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '28px', marginBottom: '8px' }}>
              Week {currentWeek - 1} Reflection ✨
            </h2>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
              Take a moment to reflect on your week before continuing
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                What worked well this week?
              </label>
              <textarea
                value={reflectionText.worked}
                onChange={(e) => setReflectionText({ ...reflectionText, worked: e.target.value })}
                placeholder="Share what helped you succeed..."
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e8e4de', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                What was challenging?
              </label>
              <textarea
                value={reflectionText.challenging}
                onChange={(e) => setReflectionText({ ...reflectionText, challenging: e.target.value })}
                placeholder="What obstacles did you face?"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e8e4de', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase' }}>
                Energy Level (1-5)
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setReflectionText({ ...reflectionText, energy: level })}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: `2px solid ${reflectionText.energy === level ? '#8aad8a' : '#e8e4de'}`,
                      background: reflectionText.energy === level ? '#f3f8f3' : 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: reflectionText.energy === level ? '#8aad8a' : '#888'
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={submitReflection}
              disabled={!reflectionText.worked || !reflectionText.challenging}
              style={{
                width: '100%',
                padding: '14px',
                background: (!reflectionText.worked || !reflectionText.challenging) ? '#ccc' : '#8aad8a',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: (!reflectionText.worked || !reflectionText.challenging) ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif'
              }}
            >
              Continue to Week {currentWeek} →
            </button>
          </div>
        </div>
      )}

      <div id="toast" style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%) translateY(20px)', background: '#1a1a1a', color: 'white', padding: '12px 20px', borderRadius: '99px', fontSize: '13px', fontWeight: '500', opacity: 0, transition: 'all 0.3s', zIndex: 300 }} className="toast"></div>

      <style jsx>{`
        .toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
    </div>
  );
}