'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

export default function ProgressStats() {
  const [weekStats, setWeekStats] = useState([]);
  const [totalStats, setTotalStats] = useState({ completed: 0, coins: 0, ge: 0, streaks: 0 });
  const userId = useStore(state => state.userId);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  async function loadStats() {
    // Get last 7 days of completions
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: completions } = await supabase
      .from('habit_completions')
      .select('date, habit_key')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: true });

    if (completions) {
      // Group by date
      const grouped = {};
      completions.forEach(c => {
        if (!grouped[c.date]) grouped[c.date] = 0;
        grouped[c.date]++;
      });

      // Create array of last 7 days
      const stats = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        stats.push({
          date: dateStr,
          day: dayName,
          count: grouped[dateStr] || 0
        });
      }
      
      setWeekStats(stats);
    }

    // Get total completions (all time)
    const { data: allCompletions } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', userId);

    // Get current user stats
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('coins, green_energy')
      .eq('user_id', userId)
      .single();

    // Get best streak
    const { data: allStreaks } = await supabase
      .from('streaks')
      .select('longest_streak')
      .eq('user_id', userId)
      .order('longest_streak', { ascending: false });

    const bestStreak = allStreaks && allStreaks.length > 0 
      ? Math.max(...allStreaks.map(s => s.longest_streak))
      : 0;

    setTotalStats({
      completed: allCompletions?.length || 0,
      coins: userStats?.coins || 0,
      ge: userStats?.green_energy || 0,
      streaks: bestStreak
    });
  }

  const maxCount = Math.max(...weekStats.map(s => s.count), 1);

  return (
    <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: '20px', padding: '24px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: '20px' }}>
        Your Progress
      </div>

      {/* Total Stats - Grid with proper spacing */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '28px' }}>
        <div style={{ textAlign: 'center', padding: '16px 12px', background: '#f7f3ed', borderRadius: '12px', border: '1px solid #e8e4de' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: '#8aad8a', lineHeight: '1' }}>
            {totalStats.completed}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '6px', fontWeight: '500' }}>Total Habits</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px 12px', background: '#f7f3ed', borderRadius: '12px', border: '1px solid #e8e4de' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: '#d4af6a', lineHeight: '1' }}>
            {totalStats.coins}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '6px', fontWeight: '500' }}>Coins Earned</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px 12px', background: '#f7f3ed', borderRadius: '12px', border: '1px solid #e8e4de' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: '#38a855', lineHeight: '1' }}>
            {totalStats.ge}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '6px', fontWeight: '500' }}>GE Generated</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px 12px', background: '#f7f3ed', borderRadius: '12px', border: '1px solid #e8e4de' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: '#e07070', lineHeight: '1' }}>
            {totalStats.streaks}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '6px', fontWeight: '500' }}>Best Streak</div>
        </div>
      </div>

      {/* Weekly Chart - Better spacing and alignment */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: '#2a2a2a' }}>
          Last 7 Days
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '140px', padding: '0 4px' }}>
          {weekStats.map((stat, index) => {
            const isToday = index === weekStats.length - 1;
            return (
              <div key={stat.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                {/* Count label */}
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  color: stat.count > 0 ? '#5a7a5a' : '#ccc',
                  minHeight: '16px'
                }}>
                  {stat.count > 0 ? stat.count : ''}
                </div>
                
                {/* Bar */}
                <div style={{
                  width: '100%',
                  height: `${Math.max((stat.count / maxCount) * 90, stat.count > 0 ? 8 : 4)}px`,
                  background: stat.count > 0 
                    ? (isToday ? 'linear-gradient(180deg, #8aad8a, #5a7a5a)' : 'linear-gradient(180deg, #b5ceb5, #8aad8a)')
                    : '#e8e4de',
                  borderRadius: '6px 6px 0 0',
                  transition: 'all 0.3s ease',
                  boxShadow: stat.count > 0 ? '0 2px 8px rgba(90, 122, 90, 0.15)' : 'none'
                }}></div>
                
                {/* Day label */}
                <div style={{ 
                  fontSize: '10px', 
                  color: isToday ? '#5a7a5a' : '#999',
                  fontWeight: isToday ? '600' : '400',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {stat.day}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}