'use client';

// TabCourses.jsx — Coming Soon page for Bloom courses
// Describes Living Well and handles coaching waitlist/interest capture

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SPOTS_TOTAL   = 3;  // Change this to open more spots
const WAITLIST_OPEN = true; // Set false to hide waitlist entirely

export default function TabCourses({ userId, toast }) {

  const [applicantCount, setApplicantCount] = useState(null); // null = loading
  const [alreadyApplied, setAlreadyApplied]   = useState(false);

  useEffect(() => {
    (async () => {
      // Get total applicant count
      const { count } = await supabase
        .from('coaching_interest')
        .select('*', { count: 'exact', head: true });
      setApplicantCount(count || 0);

      // Check if this user already applied
      if (userId) {
        const { data } = await supabase
          .from('coaching_interest')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        setAlreadyApplied((data || []).length > 0);
      }
    })();
  }, [userId]);

  const spotsFull   = applicantCount !== null && applicantCount >= SPOTS_TOTAL;
  const spotsLeft   = applicantCount !== null ? Math.max(0, SPOTS_TOTAL - applicantCount) : null;

  function handleNotify(type) {
    // Courses (non-coaching) — localStorage only for now
    try {
      const existing = JSON.parse(localStorage.getItem('bloom-course-interest') || '[]');
      const entry = { userId, type, date: new Date().toISOString() };
      if (!existing.some(e => e.type === type && e.userId === userId)) {
        existing.push(entry);
        localStorage.setItem('bloom-course-interest', JSON.stringify(existing));
      }
    } catch {}
    toast("✅ We'll let you know when it's ready");
  }

  async function handleCoachingApply() {
    if (alreadyApplied) { toast("You've already applied — Jess will be in touch soon"); return; }
    const { error } = await supabase.from('coaching_interest').insert({
      user_id: userId || null,
      status: spotsFull ? 'waitlist' : 'applied',
    });
    if (error) { toast('Something went wrong — try again'); return; }
    setApplicantCount(prev => (prev || 0) + 1);
    setAlreadyApplied(true);
    window.open('https://tally.so/r/w22rlg', '_blank');
    toast(spotsFull
      ? "✅ Added to waitlist — you'll hear from Jess when a spot opens"
      : "✅ Application received — Jess will be in touch within a few days");
  }

  const CARD = {
    background: 'white',
    border: '1.5px solid #e8e4de',
    borderRadius: 20,
    padding: '24px 26px',
    marginBottom: 20,
  };

  const TAG = (color, bg, text) => (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.8px', color, background: bg,
      border: `1px solid ${color}30`, borderRadius: 99,
      padding: '3px 10px',
    }}>{text}</span>
  );

  return (
    <div style={{ padding: '22px 26px', maxWidth: 680, fontFamily: 'DM Sans, sans-serif' }}>

      <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, fontWeight: 400, color: '#1a1a16', marginBottom: 6 }}>
        Learn & Grow 🌿
      </h2>
      <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 28 }}>
        Evidence-backed courses and personalised coaching — built around your Wellness Archetype. Coming soon.
      </p>

      {/* ── Living Well Course ──────────────────────────────────────────── */}
      <div style={{ ...CARD, borderTop: '3px solid #8aad8a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {TAG('#3a6a3a', '#f0f7f0', 'Coming Soon')}
          </div>
          <span style={{ fontSize: 28 }}>🌱</span>
        </div>

        <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, fontWeight: 400, color: '#1a1a1a', marginBottom: 6 }}>
          Living Well
        </h3>
        <p style={{ fontSize: 13, color: '#5a5a50', lineHeight: 1.7, marginBottom: 20 }}>
          A self-paced course built around the foundations that actually move the needle — sleep, nourishment, movement, stress, and the habits that hold it all together. Every module is grounded in peer-reviewed research and tailored to how <em>your</em> archetype engages with change.
        </p>

        {/* What's inside */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 12 }}>
            What's inside
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { emoji: '😴', title: 'Sleep as a foundation', body: 'Why sleep quality matters more than quantity, and how your chronotype shapes the optimal window for your body.' },
              { emoji: '🥗', title: 'Nourishment without rules', body: 'Building a relationship with food that supports energy, mood, and long-term health — no tracking, no restriction.' },
              { emoji: '🏃', title: 'Movement that fits your life', body: 'How to find and sustain a movement practice that works with your energy patterns, not against them.' },
              { emoji: '🧘', title: 'Stress & recovery', body: 'The science of the stress response, nervous system regulation, and why rest is as important as output.' },
              { emoji: '🌿', title: 'Habit architecture', body: 'How to design habits that stick using your archetype\'s natural strengths — and how to work with your weak spots.' },
              { emoji: '🔬', title: 'The science layer', body: 'Every module links to the peer-reviewed research behind it. Understand why, not just what.' },
            ].map(m => (
              <div key={m.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: '#f7f3ed', borderRadius: 14 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{m.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a', marginBottom: 2 }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: '#777', lineHeight: 1.6 }}>{m.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Format */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            '📖 Self-paced',
            '🎯 Archetype-personalised',
            '🔬 Science-backed',
          ].map(tag => (
            <span key={tag} style={{ fontSize: 11, padding: '5px 12px', background: '#f0f7f0', border: '1px solid #b5ceb5', borderRadius: 99, color: '#3a6a3a', fontWeight: 500 }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Access note for beta members */}
        <div style={{ background: 'linear-gradient(135deg, #f0f7f0, #e8f0e8)', border: '1.5px solid #b5ceb5', borderRadius: 14, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#3a6a3a', marginBottom: 3 }}>🎁 Beta members get this free</div>
          <div style={{ fontSize: 12, color: '#5a7a5a', lineHeight: 1.5 }}>
            Current founding members receive Living Well included when it launches. After that it becomes part of the premium plan.
          </div>
        </div>

        <button
          onClick={() => handleNotify('living_well')}
          style={{ width: '100%', padding: '12px 20px', background: '#5a7a5a', color: 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Notify me when it's ready
        </button>
      </div>


      {/* ── More coming ─────────────────────────────────────────────────── */}
      <div style={{ ...CARD, background: '#f7f3ed', border: '1.5px dashed #e8e4de' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 12 }}>
          On the horizon
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { emoji: '🌙', title: 'Cycle Syncing', body: 'Training, nutrition, and habit stacks aligned with your menstrual cycle phases.' },
            { emoji: '🍂', title: 'Preparing to Hibernate', body: 'An autumn reset — winding down, building resilience, preparing your body for winter.' },
            { emoji: '❄️', title: 'Holiday Season Special', body: 'Maintaining your foundations through the most disruptive time of year.' },
          ].map(c => (
            <div key={c.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{c.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a', marginBottom: 2 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
