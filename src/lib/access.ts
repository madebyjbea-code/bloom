// ============================================================================
// lib/access.ts   →   src/lib/access.ts
//
// The single source of truth for "does this person have premium access."
// Beta lifetime members, coaching clients, and (later) course purchasers all
// funnel through the same `enrollments` table — this file is what reads it.
//
// IMPORTANT — nothing in the app calls hasActiveAccess() to actually lock
// anything yet. That's deliberate: courses stay free for all beta signups
// until Mid-Summer Reset launches. This file exists now so the plumbing is
// ready; wiring it into Dashboard to actually gate content is a separate,
// later step, done on purpose at launch time — not now.
// ============================================================================

import { supabase } from './supabase';

export type Enrollment = {
  id: string;
  user_id: string;
  product_id: string;
  status: 'active' | 'completed' | 'paused' | 'expired' | 'revoked';
  started_at: string;
  expires_at: string | null; // null = lifetime
};

// Does this user have ANY enrollment that grants current access — regardless
// of which product (beta, coaching, a specific course) it came from.
// This is intentionally the broad check: right now every product type grants
// the same blanket premium access. If/when a course-specific gate is needed
// later (e.g. "premium but hasn't bought Living Well"), that's a narrower,
// separate function built at that time — don't guess at it now.
export async function hasActiveAccess(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data } = await supabase
      .from('enrollments')
      .select('status, expires_at')
      .eq('user_id', userId)
      .in('status', ['active', 'completed']);
    if (!data || data.length === 0) return false;
    const today = new Date().toISOString().split('T')[0];
    return data.some((e) => e.expires_at === null || e.expires_at >= today);
  } catch {
    return false; // fail closed — never accidentally grant access on an error
  }
}

// All of a user's enrollments (for a future account/settings view — "your
// programs" — showing what they own and when it expires, if ever).
export async function getUserEnrollments(userId: string): Promise<Enrollment[]> {
  if (!userId) return [];
  try {
    const { data } = await supabase.from('enrollments').select('*').eq('user_id', userId);
    return (data as Enrollment[]) || [];
  } catch {
    return [];
  }
}

// Does this user have access to one SPECIFIC product (by slug)? Narrower than
// hasActiveAccess — use this once course-specific gating exists (e.g. "has
// this person bought Living Well specifically," once purchases aren't just
// blanket premium anymore).
export async function hasProductAccess(userId: string, productSlug: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data: product } = await supabase.from('products').select('id').eq('slug', productSlug).maybeSingle();
    if (!product) return false;
    const { data } = await supabase
      .from('enrollments')
      .select('status, expires_at')
      .eq('user_id', userId)
      .eq('product_id', product.id)
      .in('status', ['active', 'completed'])
      .maybeSingle();
    if (!data) return false;
    const today = new Date().toISOString().split('T')[0];
    return data.expires_at === null || data.expires_at >= today;
  } catch {
    return false;
  }
}
