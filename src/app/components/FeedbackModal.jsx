'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

const CATEGORIES = [
  { key: 'general',   label: '💬 General' },
  { key: 'habits',    label: '✅ Habits' },
  { key: 'routines',  label: '⏱ Routines' },
  { key: 'community', label: '👥 Community' },
  { key: 'bug',       label: '🐛 Bug report' },
];

export default function FeedbackModal({ onClose }) {
  const [rating, setRating]       = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [category, setCategory]   = useState('general');
  const [message, setMessage]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);

  const userId = useStore(s => s.userId);
  const name   = useStore(s => s.name);

  async function submit() {
    if (!message.trim() || rating === 0) return;
    setLoading(true);

    await supabase.from('feedback').insert({
      user_id: userId || null,
      user_name: name || 'Anonymous',
      rating,
      message: message.trim(),
      category,
    });

    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 24, padding: 28, width: 460, maxWidth: '95vw' }}>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, marginBottom: 8 }}>Thank you</h2>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
              Your feedback helps shape what gets built next. Genuinely appreciated.
            </p>
            <button onClick={onClose} style={{ padding: '11px 28px', background: '#8aad8a', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22 }}>Leave feedback</h2>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #e8e4de', background: 'transparent', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 22 }}>Your feedback goes directly to Jess and shapes what gets built next.</p>

            {/* Star rating */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 10 }}>
                How are you finding the app?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    style={{ fontSize: 32, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'transform 0.1s', transform: (hovered || rating) >= n ? 'scale(1.1)' : 'scale(1)', filter: (hovered || rating) >= n ? 'none' : 'grayscale(1) opacity(0.4)' }}
                  >
                    ⭐
                  </button>
                ))}
                {rating > 0 && (
                  <span style={{ fontSize: 13, color: '#888', alignSelf: 'center', marginLeft: 4 }}>
                    {['', 'Needs work', 'Getting there', 'Pretty good', 'Really good', 'Love it'][rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 8 }}>Category</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setCategory(c.key)}
                    style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${category === c.key ? '#8aad8a' : '#e8e4de'}`, background: category === c.key ? '#f3f8f3' : 'white', color: category === c.key ? '#5a7a5a' : '#888', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', marginBottom: 8 }}>Your feedback</div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="What's working, what isn't, what you wish existed..."
                rows={4}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', resize: 'vertical', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#8aad8a'}
                onBlur={e => e.target.style.borderColor = '#e8e4de'}
              />
            </div>

            <button
              onClick={submit}
              disabled={loading || !message.trim() || rating === 0}
              style={{ width: '100%', padding: 13, background: message.trim() && rating > 0 ? '#8aad8a' : '#e8e4de', color: message.trim() && rating > 0 ? 'white' : '#aaa', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: message.trim() && rating > 0 ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
              {loading ? 'Sending...' : 'Send feedback →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
