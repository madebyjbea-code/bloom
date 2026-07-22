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
            '♾️ Lifetime access',
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

      {/* ── 1:1 Coaching ────────────────────────────────────────────────── */}
      <div style={{ ...CARD, borderTop: '3px solid #d4af6a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {spotsFull
              ? TAG('#a04040', '#fdf0f0', 'Spots Full')
              : TAG('#9a7a2a', '#fdf8ed', 'Available Now')}
            {!spotsFull && spotsLeft !== null && spotsLeft <= SPOTS_TOTAL &&
              TAG('#c47a5a', '#fdf3ed', `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`)}
            {spotsFull && WAITLIST_OPEN &&
              TAG('#888', '#f7f3ed', 'Waitlist Open')}
          </div>
          <span style={{ fontSize: 28 }}>🤝</span>
        </div>

        <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, fontWeight: 400, color: '#1a1a1a', marginBottom: 6 }}>
          1:1 Coaching with Jess
        </h3>
        <p style={{ fontSize: 13, color: '#5a5a50', lineHeight: 1.7, marginBottom: 16 }}>
          Six weeks of personalised, evidence-based lifestyle coaching with Jess — MSc Biomedical Sciences & Public Health. Grounded in the same science-first framework as the app, but applied directly to your patterns, your blockers, and your life.
        </p>

        {/* Programme arc */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 12 }}>
            How the 6 weeks work
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { week: 'Week 1',    title: 'Intake call · 45–60 min', body: "Deep dive into your history, goals, and blockers. Archetype debrief. Together we set the focus areas for your programme." },
              { week: 'Weeks 2–5', title: 'Async check-ins',          body: "A short weekly reflection from you — voice note or written. A personalised written response from Jess within 48 hours. This is where the real work happens." },
              { week: 'Week 3',    title: 'Mid-point call · 30 min',  body: "Recalibrate. What's working, what isn't, and what shifts in the second half." },
              { week: 'Week 6',    title: 'Closing call · 30 min',    body: "Review your progress, consolidate what's working, and build a self-directed plan for after the programme ends." },
            ].map(s => (
              <div key={s.week} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: '#fdf8ed', borderRadius: 14, border: '1px solid #e8d8a0' }}>
                <div style={{ flexShrink: 0, minWidth: 64 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#d4af6a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.week}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#777', lineHeight: 1.6 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What we work on */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 10 }}>
            What we focus on
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              'Your Wellness Archetype in practice — what it actually means for your daily patterns',
              'The specific pillar holding everything else back (sleep, energy, nourishment, stress, or movement)',
              'Building habits that fit your real life, not the ideal version of it',
              'Untangling the blocks that keep good intentions from becoming consistent behaviour',
              'Honest, science-grounded reflection without judgement',
            ].map(point => (
              <div key={point} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                <span style={{ color: '#d4af6a', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                {point}
              </div>
            ))}
          </div>
        </div>

        {/* Format tags */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            '📅 6 weeks',
            '🎥 3 video calls',
            '💬 Weekly async check-ins',
            '📋 Intake form',
            '🔬 Science-backed',
          ].map(tag => (
            <span key={tag} style={{ fontSize: 11, padding: '5px 12px', background: '#fdf8ed', border: '1px solid #e8c87a', borderRadius: 99, color: '#9a7a2a', fontWeight: 500 }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Pricing */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f7f3ed', border: '1px solid #e8e4de', borderRadius: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>6-week programme</div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: '#1a1a1a' }}>€350</div>
          </div>
        </div>

        {/* Credentials note */}
        <div style={{ background: '#f7f3ed', border: '1px solid #e8e4de', borderRadius: 12, padding: '11px 14px', marginBottom: 18, fontSize: 12, color: '#666', lineHeight: 1.6 }}>
          <strong style={{ color: '#2a2a2a' }}>About Jess</strong> — MSc Biomedical Science. This is evidence-based wellness coaching, not medical treatment.
        </div>

        {alreadyApplied ? (
          <div style={{ width: '100%', padding: '12px 20px', background: '#f0f7f0', border: '1.5px solid #8aad8a', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#3a6a3a', textAlign: 'center', marginBottom: 12 }}>
            ✓ Application received
          </div>
        ) : (
          <button
            onClick={handleCoachingApply}
            disabled={applicantCount === null}
            style={{ width: '100%', padding: '12px 20px', background: spotsFull ? '#888' : 'linear-gradient(135deg, #d4af6a, #c4952a)', color: 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: applicantCount === null ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: 12, opacity: applicantCount === null ? 0.6 : 1 }}>
            {applicantCount === null
              ? 'Loading…'
              : spotsFull
                ? WAITLIST_OPEN ? 'Join waitlist →' : 'Spots currently full'
                : 'Apply for coaching →'}
          </button>
        )}

        <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          {alreadyApplied
            ? "Jess will be in touch within a few days."
            : spotsFull
              ? "All spots are currently taken. Join the waitlist and you'll be first to know when one opens."
              : `${spotsLeft !== null ? spotsLeft : SPOTS_TOTAL} of ${SPOTS_TOTAL} spots available. Jess will be in touch within a few days of your application.`}
        </p>
      </div>

      {/* ── More coming ─────────────────────────────────────────────────── */}
      <div style={{ ...CARD, background: '#f7f3ed', border: '1.5px dashed #e8e4de' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 12 }}>
          On the horizon
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
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
