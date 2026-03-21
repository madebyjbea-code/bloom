'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function CommunityFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
    
    // Subscribe to new posts
    const channel = supabase
      .channel('community_posts')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'community_posts' },
        (payload) => {
          setPosts(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadPosts() {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setPosts(data);
    setLoading(false);
  }

  function getPostIcon(postType) {
    const icons = {
      'streak': '🔥',
      'milestone': '🎯',
      'donation': '🌍',
      'level_up': '⭐',
      'week_complete': '✨'
    };
    return icons[postType] || '🌱';
  }

  function getTimeAgo(timestamp) {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffMs = now - posted;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  if (loading) {
    return (
      <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: '20px', padding: '24px' }}>
        <p style={{ fontSize: '13px', color: '#888', textAlign: 'center' }}>Loading community...</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: '20px', padding: '24px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#888', marginBottom: '16px' }}>
        Community · Spring Reset
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '13px' }}>
            No community posts yet. Be the first! 🌱
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f7f3ed', borderRadius: '12px', border: '1px solid #e8e4de' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e8d9c4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {post.user_avatar_emoji || '🌱'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                  {post.user_name || 'Anonymous'}
                </div>
                <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.4', marginBottom: '4px' }}>
                  {getPostIcon(post.post_type)} {post.content}
                </div>
                <div style={{ fontSize: '10px', color: '#999' }}>
                  {getTimeAgo(post.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}