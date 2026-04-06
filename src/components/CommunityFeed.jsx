'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

// ─── Your admin user ID ───────────────────────────────────────────────────────
// After running the quiz once, go to Supabase → Table Editor → users
// Copy your UUID from the id column and paste it here.
// This restricts top-level posting to your account only.
const ADMIN_USER_ID = 'YOUR_USER_ID_HERE';

export default function CommunityFeed() {
  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [postText, setPostText]     = useState('');
  const [posting, setPosting]       = useState(false);
  const [filter, setFilter]         = useState('all');
  const [expandedPost, setExpanded] = useState(null);
  const [comments, setComments]     = useState({});  // postId → array
  const [commentText, setCommentText] = useState({}); // postId → string
  const [submittingComment, setSubmittingComment] = useState(null);

  const userId  = useStore(s => s.userId);
  const name    = useStore(s => s.name);
  const avEmoji = useStore(s => s.avatarEmoji);

  const isAdmin = userId === ADMIN_USER_ID;

  useEffect(() => {
    loadPosts();

    const channel = supabase
      .channel('community_posts')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts' },
        payload => {
          // Only show top-level posts in main feed (no parent_id)
          if (!payload.new.parent_id) {
            setPosts(prev => [payload.new, ...prev]);
          } else {
            // It's a comment — update the comment count + comments if expanded
            setComments(prev => {
              const pid = payload.new.parent_id;
              if (!prev[pid]) return prev;
              return { ...prev, [pid]: [payload.new, ...prev[pid]] };
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadPosts() {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setPosts(data);
    setLoading(false);
  }

  async function loadComments(postId) {
    if (comments[postId]) return; // already loaded
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('parent_id', postId)
      .order('created_at', { ascending: true });
    if (data) setComments(prev => ({ ...prev, [postId]: data }));
  }

  function toggleExpand(postId) {
    if (expandedPost === postId) {
      setExpanded(null);
    } else {
      setExpanded(postId);
      loadComments(postId);
    }
  }

  // Admin: submit top-level post
  async function submitPost() {
    if (!postText.trim() || !userId || !isAdmin) return;
    setPosting(true);
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        user_name: name || 'J Bea',
        user_avatar_emoji: avEmoji || '🌿',
        content: postText.trim(),
        post_type: 'check_in',
        parent_id: null,
      })
      .select()
      .single();

    if (data && !error) {
      setPosts(prev => [data, ...prev]);
      setPostText('');
    }
    setPosting(false);
  }

  // Any user: submit comment on a post
  async function submitComment(postId) {
    const text = (commentText[postId] || '').trim();
    if (!text || !userId) return;
    setSubmittingComment(postId);

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        user_name: name || 'Anonymous',
        user_avatar_emoji: avEmoji || '🌱',
        content: text,
        post_type: 'comment',
        parent_id: postId,
      })
      .select()
      .single();

    if (data && !error) {
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data],
      }));
      setCommentText(prev => ({ ...prev, [postId]: '' }));
    }
    setSubmittingComment(null);
  }

  function typeIcon(t) {
    const m = { streak:'🔥', milestone:'🎯', donation:'🌍', level_up:'⭐', week_complete:'✨', check_in:'🌿', comment:'💬' };
    return m[t] || '🌱';
  }

  function typeBg(t) {
    const m = { streak:'#fff8f0', milestone:'#f3f8f3', donation:'#f0fdf4', level_up:'#fdf8ed', week_complete:'#f3f8f3', check_in:'#f7f3ed', comment:'#f7f3ed' };
    return m[t] || '#f7f3ed';
  }

  function typeLabel(t) {
    const m = { streak:'Streak', milestone:'Milestone', donation:'Planet', level_up:'Level Up', week_complete:'Week Complete', check_in:'Post', comment:'Comment' };
    return m[t] || 'Post';
  }

  function typeColor(t) {
    const m = { streak:'#b06020', milestone:'#5a7a5a', donation:'#276a3a', level_up:'#a06020', week_complete:'#5a7a5a', check_in:'#5a7a5a', comment:'#888' };
    return m[t] || '#888';
  }

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts);
    const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  }

  const FILTERS = [
    { key: 'all',          label: 'All' },
    { key: 'milestone',    label: '🏆 Milestones' },
    { key: 'check_in',     label: '🌿 Posts' },
    { key: 'donation',     label: '🌍 Planet' },
    { key: 'streak',       label: '🔥 Streaks' },
    { key: 'week_complete',label: '✨ Weeks' },
  ];

  const filtered = filter === 'all'
    ? posts
    : posts.filter(p => p.post_type === filter);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: 16 }}>
        Community · Spring Wellness Program
      </div>

      {/* Admin post input — only visible to you */}
      {isAdmin && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3f8f3', border: '2px solid #8aad8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {avEmoji || '🌿'}
            </div>
            <div style={{ flex: 1 }}>
              <textarea
                value={postText}
                onChange={e => setPostText(e.target.value)}
                placeholder="Share something with your community — a recipe, tip, science insight, or encouragement..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4de', borderRadius: 12, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2a2a2a', background: '#f7f3ed', resize: 'vertical', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#8aad8a'}
                onBlur={e => e.target.style.borderColor = '#e8e4de'}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#bbb' }}>Only you can post here · members can comment</span>
                <button
                  onClick={submitPost}
                  disabled={posting || !postText.trim()}
                  style={{ padding: '8px 18px', background: postText.trim() ? '#8aad8a' : '#e8e4de', color: postText.trim() ? 'white' : '#aaa', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: postText.trim() ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                >
                  {posting ? 'Posting...' : 'Post →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${filter === f.key ? '#8aad8a' : '#e8e4de'}`, background: filter === f.key ? '#f3f8f3' : 'white', color: filter === f.key ? '#5a7a5a' : '#888', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 520, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: 20 }}>Loading community...</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: 20 }}>Nothing here yet — check back soon 🌱</p>
        ) : filtered.map(post => {
          const isExpanded = expandedPost === post.id;
          const postComments = comments[post.id] || [];
          const commentCount = postComments.length;

          return (
            <div key={post.id} style={{ borderRadius: 14, border: '1px solid #e8e4de', overflow: 'hidden' }}>
              {/* Post */}
              <div style={{ display: 'flex', gap: 10, padding: 14, background: typeBg(post.post_type) }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8d9c4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {post.user_avatar_emoji || '🌱'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a' }}>{post.user_name || 'Anonymous'}</span>
                    {post.post_type !== 'check_in' && (
                      <span style={{ fontSize: 10, color: typeColor(post.post_type), background: 'white', border: `1px solid ${typeColor(post.post_type)}33`, borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
                        {typeIcon(post.post_type)} {typeLabel(post.post_type)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#444', lineHeight: 1.55, marginBottom: 8, wordBreak: 'break-word' }}>{post.content}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: '#bbb' }}>{timeAgo(post.created_at)}</span>
                    <button
                      onClick={() => toggleExpand(post.id)}
                      style={{ fontSize: 11, color: '#8aad8a', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: 0 }}
                    >
                      💬 {isExpanded ? 'Hide' : `Reply${commentCount > 0 ? ` (${commentCount})` : ''}`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments section */}
              {isExpanded && (
                <div style={{ background: 'white', borderTop: '1px solid #f0ece6' }}>
                  {/* Existing comments */}
                  {postComments.length > 0 && (
                    <div style={{ padding: '10px 14px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {postComments.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f0ece6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                            {c.user_avatar_emoji || '🌱'}
                          </div>
                          <div style={{ flex: 1, background: '#f7f3ed', borderRadius: 10, padding: '8px 12px' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#2a2a2a', marginBottom: 2 }}>{c.user_name}</div>
                            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{c.content}</div>
                            <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>{timeAgo(c.created_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment input — available to all users */}
                  <div style={{ padding: '10px 14px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f0ece6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {avEmoji || '🌱'}
                    </div>
                    <input
                      value={commentText[post.id] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && submitComment(post.id)}
                      placeholder="Add a comment..."
                      style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e8e4de', borderRadius: 10, fontSize: 12, fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#f7f3ed', color: '#2a2a2a', transition: 'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor = '#8aad8a'}
                      onBlur={e => e.target.style.borderColor = '#e8e4de'}
                    />
                    <button
                      onClick={() => submitComment(post.id)}
                      disabled={submittingComment === post.id || !(commentText[post.id] || '').trim()}
                      style={{ padding: '8px 14px', background: (commentText[post.id] || '').trim() ? '#8aad8a' : '#e8e4de', color: (commentText[post.id] || '').trim() ? 'white' : '#aaa', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: (commentText[post.id] || '').trim() ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
                      {submittingComment === post.id ? '...' : '→'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
