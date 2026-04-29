'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

export default function ProgressStats() {
  const [weekStats, setWeekStats] = useState([]);
  const [totalStats, setTotalStats] = useState({ completed: 0, coins: 0, ge: 0, bestDay: 0 });
  const userId = useStore(state => state.userId);
  const coins = useStore(state => state.coins);
  const greenEnergy = useStore(state => state.greenEnergy);

  useEffect(() => {
    if (userId) loadStats();
  }, [userId]);

  async function loadStats() {
    // Last 7 days of completions
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

      // Build last 7 days array
      const stats = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        stats.push({
          date: dateStr,
          day: dayName,
          count: grouped[dateStr] || 0,
          isToday: i === 0,
        });
      }
      setWeekStats(stats);

      // Best day
      const bestDay = Math.max(...Object.values(grouped), 0);

      // Total all-time completions
      const { data: allCompletions } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('user_id', userId);

      setTotalStats({
        completed: allCompletions?.length || 0,
        coins,
        ge: greenEnergy,
        bestDay,
      });
    }
  }

  const maxCount = Math.max(...weekStats.map(s => s.count), 1);

  return (
    <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 20 }}>
        Your Progress
      </div>

      {/* Total Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { val: totalStats.completed, label: 'Total Habits', color: '#8aad8a' },
          { val: totalStats.coins.toLocaleString(), label: 'Coins Earned', color: '#d4af6a' },
          { val: totalStats.ge, label: 'GE Generated', color: '#38a855' },
          { val: totalStats.bestDay, label: 'Best Day', color: '#e07070' },
        ].map(({ val, label, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '16px 12px', background: '#f7f3ed', borderRadius: 12, border: '1px solid #e8e4de' }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Syne, sans-serif', color, lineHeight: 1 }}>
              {val}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 6, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Weekly Chart */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#2a2a2a' }}>
          Last 7 Days
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 140, padding: '0 4px' }}>
          {weekStats.map((stat) => (
            <div key={stat.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {/* Count label */}
              <div style={{ fontSize: 11, fontWeight: 700, color: stat.count > 0 ? '#5a7a5a' : '#ccc', minHeight: 16 }}>
                {stat.count > 0 ? stat.count : ''}
              </div>

              {/* Bar */}
              <div style={{
                width: '100%',
                height: `${Math.max((stat.count / maxCount) * 90, stat.count > 0 ? 8 : 4)}px`,
                background: stat.count > 0
                  ? stat.isToday
                    ? 'linear-gradient(180deg,#8aad8a,#5a7a5a)'
                    : 'linear-gradient(180deg,#b5ceb5,#8aad8a)'
                  : '#e8e4de',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.3s ease',
              }} />

              {/* Day label */}
              <div style={{ fontSize: 10, color: stat.isToday ? '#5a7a5a' : '#999', fontWeight: stat.isToday ? 600 : 400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stat.day}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
