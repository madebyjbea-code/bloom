'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

const ADMIN_USER_ID = '3f5a0efe-6932-4821-b7fa-334a8f0bffc3';

const STATUS_CONFIG = {
  submitted:    { label: 'Submitted',   color: '#888',    bg: '#f7f3ed', icon: '📬' },
  considering:  { label: 'Considering', color: '#d4a84a', bg: '#fdf8ed', icon: '🤔' },
  building:     { label: 'Building',    color: '#5a7a9e', bg: '#f0f4fa', icon: '🔨' },
  live:         { label: 'Live',        color: '#5a7a5a', bg: '#f3f8f3', icon: '✅' },
};

const FILTER_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'building',   label: '🔨 Building' },
  { key: 'considering',label: '🤔 Considering' },
  { key: 'submitted',  label: '📬 Submitted' },
  { key: 'live',       label: '✅ Live' },
];

export default function TabRoadmap({ onFeedback }) {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [showForm, setShowForm]   = useState(false);
  const [title, setTitle]         = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [myVotes, setMyVotes]         = useState([]);

  // Admin edit state
  const [editingId, setEditingId]     = useState(null);
  const [editStatus, setEditStatus]   = useState('');
  const [editNote, setEditNote]       = useState('');

  const userId  = useStore(s => s.userId);
  const name    = useStore(s => s.name);
  const isAdmin = userId === ADMIN_USER_ID;

  useEffect(() => {
    loadRequests();
    if (userId) loadMyVotes();
  }, [userId]);

  async function loadRequests() {
    const { data } = await supabase
      .from('feature_requests')
      .select('*')
      .order('votes', { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  }

  async function loadMyVotes() {
    const { data } = await supabase
      .from('feature_votes')
      .select('feature_id')
      .eq('user_id', userId);
    if (data) setMyVotes(data.map(v => v.feature_id));
  }

  async function submitRequest() {
    if (!title.trim()) return;
    setSubmitting(true);

    const { data } = await supabase
      .from('feature_requests')
      .insert({
        user_id: userId || null,
        user_name: name || 'Anonymous',
        title: title.trim(),
        description: description.trim(),
        status: 'submitted',
        votes: 0,
      })
      .select()
      .single();

    if (data) {
      setRequests(prev => [data, ...prev]);
      setTitle('');
      setDescription('');
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setShowForm(false); }, 2500);
    }
    setSubmitting(false);
  }

  async function vote(request) {
    if (!userId) return;
    const hasVoted = myVotes.includes(request.id);

    if (hasVoted) {
      // Remove vote
      await supabase.from('feature_votes').delete().eq('user_id', userId).eq('feature_id', request.id);
      await supabase.from('feature_requests').update({ votes: Math.max(0, request.votes - 1) }).eq('id', request.id);
      setMyVotes(prev => prev.filter(id => id !== request.id));
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, votes: Math.max(0, r.votes - 1) } : r));
    } else {
      // Add vote
      await supabase.from('feature_votes').insert({ user_id: userId, feature_id: request.id });
      await supabase.from('feature_requests').update({ votes: request.votes + 1 }).eq('id', request.id);
      setMyVotes(prev => [...prev, request.id]);
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, votes: r.votes + 1 } : r));
    }
  }

  async function saveAdminEdit(id) {
    await supabase.from('feature_requests').update({ status: editStatus, admin_note: editNote }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: editStatus, admin_note: editNote } : r));
    setEditingId(null);
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  // Group by status for roadmap view
  const building   = requests.filter(r => r.status === 'building');
  const considering = requests.filter(r => r.status === 'considering');
  const live       = requests.filter(r => r.status === 'live');
  const submitted_list = requests.filter(r => r.status === 'submitted');

  return (
    <div style={{ padding: '22px 26px', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, color: '#1a1a1a', marginBottom: 4 }}>
            Roadmap & Feature Requests
          </h2>
          <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>
            See what&apos;s being built, vote for what you want next, and suggest new features.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {onFeedback && (
            <button onClick={onFeedback}
              style={{ padding: '10px 18px', background: 'white', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#555', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              ⭐ Leave feedback
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: '10px 18px', background: '#1a2e1a', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {showForm ? '✕ Cancel' : '＋ Suggest a feature'}
          </button>
        </div>
      </div>

      {/* Submit form */}
      {showForm && (
        <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 22, marginBottom: 20 }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#5a7a5a' }}>Suggestion submitted — thank you!</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 14 }}>
                Suggest a feature
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Feature title — keep it short and clear"
                  style={{ padding: '11px 14px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#8aad8a'}
                  onBlur={e => e.target.style.borderColor = '#e8e4de'}
                />
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="More detail — why would this help you? (optional)"
                  rows={3}
                  style={{ padding: '11px 14px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', resize: 'vertical', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#8aad8a'}
                  onBlur={e => e.target.style.borderColor = '#e8e4de'}
                />
                <button onClick={submitRequest} disabled={submitting || !title.trim()}
                  style={{ padding: '11px', background: title.trim() ? '#8aad8a' : '#e8e4de', color: title.trim() ? 'white' : '#aaa', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
                  {submitting ? 'Submitting...' : 'Submit suggestion →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Status overview strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { ...STATUS_CONFIG.building,   count: building.length,   key: 'building' },
          { ...STATUS_CONFIG.considering,count: considering.length, key: 'considering' },
          { ...STATUS_CONFIG.submitted,  count: submitted_list.length, key: 'submitted' },
          { ...STATUS_CONFIG.live,       count: live.length,        key: 'live' },
        ].map(s => (
          <div key={s.key} onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
            style={{ background: filter === s.key ? s.bg : 'white', border: `1.5px solid ${filter === s.key ? s.color + '40' : '#e8e4de'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTER_TABS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '5px 14px', borderRadius: 99, border: `1.5px solid ${filter === f.key ? '#8aad8a' : '#e8e4de'}`, background: filter === f.key ? '#f3f8f3' : 'white', color: filter === f.key ? '#5a7a5a' : '#888', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Feature list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading roadmap...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
          <div style={{ fontSize: 14, color: '#888' }}>Nothing here yet — be the first to suggest something.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.submitted;
            const hasVoted = myVotes.includes(r.id);
            const isEditing = editingId === r.id;

            return (
              <div key={r.id} style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 16, padding: 18, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

                  {/* Vote button */}
                  <button onClick={() => vote(r)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${hasVoted ? '#8aad8a' : '#e8e4de'}`, background: hasVoted ? '#f3f8f3' : 'white', cursor: userId ? 'pointer' : 'default', transition: 'all 0.2s', flexShrink: 0 }}>
                    <span style={{ fontSize: 14, color: hasVoted ? '#5a7a5a' : '#888' }}>▲</span>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: hasVoted ? '#5a7a5a' : '#888' }}>{r.votes}</span>
                  </button>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{r.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: status.color, background: status.bg, border: `1px solid ${status.color}30`, borderRadius: 99, padding: '2px 10px' }}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                    {r.description && (
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 6 }}>{r.description}</div>
                    )}
                    {r.admin_note && (
                      <div style={{ background: '#f3f8f3', border: '1px solid #b5ceb5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#5a7a5a', marginTop: 8 }}>
                        💬 {r.admin_note}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>
                      Suggested by {r.user_name || 'Anonymous'}
                    </div>
                  </div>
                </div>

                {/* Admin controls */}
                {isAdmin && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0ece6' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                            <button key={key} onClick={() => setEditStatus(key)}
                              style={{ padding: '4px 12px', borderRadius: 99, border: `1.5px solid ${editStatus === key ? s.color : '#e8e4de'}`, background: editStatus === key ? s.bg : 'white', color: editStatus === key ? s.color : '#888', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                              {s.icon} {s.label}
                            </button>
                          ))}
                        </div>
                        <input
                          value={editNote}
                          onChange={e => setEditNote(e.target.value)}
                          placeholder="Admin note visible to all users (optional)"
                          style={{ padding: '8px 12px', border: '1.5px solid #e8e4de', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                          onFocus={e => e.target.style.borderColor = '#8aad8a'}
                          onBlur={e => e.target.style.borderColor = '#e8e4de'}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => saveAdminEdit(r.id)}
                            style={{ padding: '7px 16px', background: '#8aad8a', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            style={{ padding: '7px 16px', background: 'white', color: '#888', border: '1px solid #e8e4de', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(r.id); setEditStatus(r.status); setEditNote(r.admin_note || ''); }}
                        style={{ fontSize: 12, color: '#8aad8a', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                        ✏️ Update status
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
