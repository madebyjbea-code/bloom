'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useStore from '../lib/store';

export default function QuizAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d'); // 7d, 30d, all
  const [funnel, setFunnel] = useState({
    started: 0,
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    q5: 0,
    q6: 0,
    q7: 0,
    q8: 0,
    q9: 0,
    q10: 0,
    q11: 0,
    q12: 0,
    q13: 0,
    completed: 0,
    archetype_revealed: 0,
    paywall_hit: 0,
    paywall_converted: 0,
  });
  const [uniqueSessions, setUniqueSessions] = useState(0);

  // Get userId from Zustand to verify admin access
  const userId = useStore(s => s.userId);
  const ADMIN_USER_ID = '3f5a0efe-6932-4821-b7fa-334a8f0bffc3';
  const isAdmin = userId === ADMIN_USER_ID;

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  async function loadAnalytics() {
    console.log('loadAnalytics called, timeframe:', timeframe);
    
    // Block if not admin
    if (!isAdmin) {
      console.log('Access denied: Not admin');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Calculate date filter
      let dateFilter = null;
      if (timeframe === '7d') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (timeframe === '30d') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      console.log('Date filter:', dateFilter || 'none (all time)');

      // Build query
      let query = supabase
        .from('quiz_funnel_events')
        .select('*');

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: events, error } = await query;

      if (error) {
        console.error('Analytics query error:', error);
        throw error;
      }

      console.log('Analytics loaded:', {
        totalEvents: events?.length || 0,
        uniqueSessions: new Set(events?.map(e => e.session_id) || []).size,
        eventTypes: events?.reduce((acc, e) => {
          acc[e.event_type] = (acc[e.event_type] || 0) + 1;
          return acc;
        }, {})
      });

      // Calculate metrics
      const sessionSet = new Set(events.map(e => e.session_id));
      setUniqueSessions(sessionSet.size);

      const counts = {
        started: 0,
        q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0,
        q8: 0, q9: 0, q10: 0, q11: 0, q12: 0, q13: 0,
        completed: 0,
        archetype_revealed: 0,
        paywall_hit: 0,
        paywall_converted: 0,
      };

      // Count by session (each session counted once per milestone)
      const sessionMilestones = {};

      events.forEach(e => {
        const sid = e.session_id;
        if (!sessionMilestones[sid]) {
          sessionMilestones[sid] = {
            started: false,
            questions: new Set(),
            completed: false,
            archetype_revealed: false,
            paywall_hit: false,
            paywall_converted: false,
          };
        }

        if (e.event_type === 'quiz_started') {
          sessionMilestones[sid].started = true;
        } else if (e.event_type === 'question_viewed' && e.question_number) {
          sessionMilestones[sid].questions.add(e.question_number);
        } else if (e.event_type === 'quiz_completed') {
          sessionMilestones[sid].completed = true;
        } else if (e.event_type === 'archetype_revealed') {
          sessionMilestones[sid].archetype_revealed = true;
        } else if (e.event_type === 'paywall_encountered') {
          sessionMilestones[sid].paywall_hit = true;
        } else if (e.event_type === 'paywall_conversion') {
          sessionMilestones[sid].paywall_converted = true;
        }
      });

      // Aggregate
      Object.values(sessionMilestones).forEach(s => {
        if (s.started) counts.started++;
        if (s.questions.has(1)) counts.q1++;
        if (s.questions.has(2)) counts.q2++;
        if (s.questions.has(3)) counts.q3++;
        if (s.questions.has(4)) counts.q4++;
        if (s.questions.has(5)) counts.q5++;
        if (s.questions.has(6)) counts.q6++;
        if (s.questions.has(7)) counts.q7++;
        if (s.questions.has(8)) counts.q8++;
        if (s.questions.has(9)) counts.q9++;
        if (s.questions.has(10)) counts.q10++;
        if (s.questions.has(11)) counts.q11++;
        if (s.questions.has(12)) counts.q12++;
        if (s.questions.has(13)) counts.q13++;
        if (s.completed) counts.completed++;
        if (s.archetype_revealed) counts.archetype_revealed++;
        if (s.paywall_hit) counts.paywall_hit++;
        if (s.paywall_converted) counts.paywall_converted++;
      });

      setFunnel(counts);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }

  function calcRate(numerator, denominator) {
    if (denominator === 0) return '0%';
    return `${Math.round((numerator / denominator) * 100)}%`;
  }

  const paywallConversionRate = calcRate(funnel.paywall_converted, funnel.paywall_hit);
  const completionRate = calcRate(funnel.completed, funnel.started);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Quiz Funnel Analytics</h2>
        <div style={styles.timeButtons}>
          {['7d', '30d', 'all'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                ...styles.timeBtn,
                ...(timeframe === tf ? styles.timeBtnActive : {}),
              }}
            >
              {tf === '7d' ? 'Last 7 Days' : tf === '30d' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading analytics...</p>
      ) : (
        <>
          <div style={styles.summaryRow}>
            <div style={styles.statBox}>
              <div style={styles.statNum}>{uniqueSessions}</div>
              <div style={styles.statLabel}>Unique Sessions</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statNum}>{paywallConversionRate}</div>
              <div style={styles.statLabel}>Paywall Conversion</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statNum}>{completionRate}</div>
              <div style={styles.statLabel}>Quiz Completion</div>
            </div>
          </div>

          <div style={styles.funnelSection}>
            <h3 style={styles.sectionTitle}>Question-by-Question Drop-off</h3>
            
            <FunnelBar label="Quiz Started" count={funnel.started} total={funnel.started} />
            <FunnelBar label="Q1 – Body Rhythm" count={funnel.q1} total={funnel.started} />
            <FunnelBar label="Q2 – Energy Patterns" count={funnel.q2} total={funnel.started} />
            <FunnelBar label="Q3 – Morning Start" count={funnel.q3} total={funnel.started} />
            <FunnelBar label="Q4 – Nutrition Barriers" count={funnel.q4} total={funnel.started} />
            <FunnelBar label="Q5 – Meal Preference" count={funnel.q5} total={funnel.started} />
            <FunnelBar label="Q6 – Daily Schedule" count={funnel.q6} total={funnel.started} />
            <FunnelBar label="Q7 – Movement Time" count={funnel.q7} total={funnel.started} />
            <FunnelBar label="Q8 – Activity Level" count={funnel.q8} total={funnel.started} />
            <FunnelBar label="Q9 – Stress Response" count={funnel.q9} total={funnel.started} />
            <FunnelBar label="Q10 – Stress Management" count={funnel.q10} total={funnel.started} />
            <FunnelBar label="Q11 – Current State" count={funnel.q11} total={funnel.started} />
            <FunnelBar label="Q12 – Wellness Routine" count={funnel.q12} total={funnel.started} />
            <FunnelBar label="Q13 – Spring Goals" count={funnel.q13} total={funnel.started} />
            
            <FunnelBar 
              label="✅ Quiz Completed" 
              count={funnel.completed} 
              total={funnel.started} 
              success
            />
            
            <FunnelBar 
              label="✨ Archetype Revealed" 
              count={funnel.archetype_revealed} 
              total={funnel.started} 
              success
            />
            
            <div style={styles.paywallDivider}>
              <div style={styles.paywallLabel}>🔒 PAYWALL (Access Code Required)</div>
            </div>
            
            <FunnelBar 
              label="Paywall Encountered" 
              count={funnel.paywall_hit} 
              total={funnel.started} 
              highlight 
            />
            <FunnelBar 
              label="✓ Access Code Entered" 
              count={funnel.paywall_converted} 
              total={funnel.paywall_hit} 
              highlight 
              success
            />
          </div>

          <div style={styles.insights}>
            <h3 style={styles.sectionTitle}>Key Insights</h3>
            <ul style={styles.insightsList}>
              <li>
                <strong>{calcRate(funnel.completed, funnel.q1)}</strong> of people who answer Q1 
                complete all 13 questions
              </li>
              <li>
                <strong>{calcRate(funnel.archetype_revealed, funnel.completed)}</strong> of people who complete 
                the quiz see their archetype reveal
              </li>
              <li>
                <strong>{calcRate(funnel.paywall_hit, funnel.archetype_revealed)}</strong> of people who see 
                their archetype hit the paywall
              </li>
              <li>
                <strong>{paywallConversionRate}</strong> of people who hit the paywall 
                enter a valid access code
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function FunnelBar({ label, count, total, highlight, success }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const dropOff = total > count ? total - count : 0;
  const dropOffPct = total > 0 ? ((dropOff / total) * 100).toFixed(1) : '0.0';

  return (
    <div style={styles.barRow}>
      <div style={styles.barLabel}>
        <span style={success ? styles.successText : {}}>{label}</span>
        <span style={styles.barCount}>
          {count} {dropOff > 0 && <span style={styles.dropOff}>(-{dropOffPct}%)</span>}
        </span>
      </div>
      <div style={styles.barBg}>
        <div 
          style={{
            ...styles.barFill,
            width: `${pct}%`,
            background: success 
              ? 'linear-gradient(90deg, #4ade80, #22c55e)' 
              : highlight 
                ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(90deg, var(--sage), var(--sage-dark))',
          }}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 20px',
    maxWidth: 900,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontFamily: 'Instrument Serif, serif',
    fontSize: 26,
    fontWeight: 400,
    color: 'var(--charcoal)',
  },
  timeButtons: {
    display: 'flex',
    gap: 8,
    background: '#f5f5f0',
    padding: 4,
    borderRadius: 10,
  },
  timeBtn: {
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    color: '#888',
    transition: 'all 0.2s',
    fontFamily: 'DM Sans, sans-serif',
  },
  timeBtnActive: {
    background: 'white',
    color: 'var(--sage-dark)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  loading: {
    textAlign: 'center',
    color: '#999',
    padding: 40,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  statBox: {
    background: 'white',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '20px 18px',
    textAlign: 'center',
  },
  statNum: {
    fontSize: 32,
    fontWeight: 600,
    color: 'var(--sage-dark)',
    marginBottom: 6,
    fontFamily: 'DM Sans, sans-serif',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  funnelSection: {
    background: 'white',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--charcoal)',
    marginBottom: 20,
    fontFamily: 'DM Sans, sans-serif',
  },
  barRow: {
    marginBottom: 16,
  },
  barLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    fontSize: 13,
    color: '#555',
  },
  barCount: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--charcoal)',
  },
  dropOff: {
    color: '#ef4444',
    fontSize: 11,
    marginLeft: 6,
  },
  barBg: {
    height: 8,
    background: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
  successText: {
    color: '#22c55e',
    fontWeight: 500,
  },
  paywallDivider: {
    margin: '24px 0',
    padding: '12px 0',
    borderTop: '2px dashed #e8e4de',
    borderBottom: '2px dashed #e8e4de',
    textAlign: 'center',
  },
  paywallLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#f59e0b',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  insights: {
    background: '#f3f8f3',
    border: '1px solid var(--sage-light)',
    borderRadius: 16,
    padding: 24,
  },
  insightsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  warningInsight: {
    color: '#ea580c',
    background: '#fff7ed',
    padding: '8px 12px',
    borderRadius: 8,
    marginTop: 8,
  },
};
