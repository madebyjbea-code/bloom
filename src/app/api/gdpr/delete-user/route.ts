import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/gdpr/delete-user
 * GDPR Article 17 — Right to Erasure
 *
 * Deletes all rows belonging to userId across every live table.
 * Order matters: child rows before parent rows to avoid FK violations.
 *
 * Request:  { userId: "uuid" }
 * Response: { success: true, deleted_at: "ISO", summary: [...] }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(userId)) {
      return NextResponse.json({ error: 'userId must be a valid UUID' }, { status: 400 });
    }

    console.log(`[GDPR] Delete start — userId: ${userId}`);

    // Ordered: child/dependent tables first, root record (users) last.
    // Every table confirmed present in live Supabase.
    const targets: { table: string; col: string }[] = [
      { table: 'bad_habit_logs',         col: 'user_id' },
      { table: 'bad_habits',             col: 'user_id' },
      { table: 'goal_logs',              col: 'user_id' },
      { table: 'goal_week_results',      col: 'user_id' },
      { table: 'task_logs',              col: 'user_id' },
      { table: 'tasks',                  col: 'user_id' },
      { table: 'goals',                  col: 'user_id' },
      { table: 'habit_completions',      col: 'user_id' },
      { table: 'habit_streaks',          col: 'user_id' },
      { table: 'streaks',                col: 'user_id' },
      { table: 'rest_days',              col: 'user_id' },
      { table: 'weekly_reflections',     col: 'user_id' },
      { table: 'green_donations',        col: 'user_id' },
      { table: 'green_energy_donations', col: 'user_id' },
      { table: 'course_progress',        col: 'user_id' },
      { table: 'coaching_sessions',      col: 'user_id' },
      { table: 'enrollments',            col: 'user_id' },
      { table: 'user_subscriptions',     col: 'user_id' },
      { table: 'user_inventory',         col: 'user_id' },
      { table: 'intake_responses',       col: 'user_id' },
      { table: 'quiz_funnel_events',     col: 'user_id' },
      { table: 'feature_votes',          col: 'user_id' },
      { table: 'feature_requests',       col: 'user_id' },
      { table: 'feedback',               col: 'user_id' },
      { table: 'community_posts',        col: 'user_id' },
      { table: 'user_stats',             col: 'user_id' },
      { table: 'users',                  col: 'id' },      // root — must be last
    ];

    const summary: { table: string; status: string; count: number }[] = [];

    for (const { table, col } of targets) {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .eq(col, userId)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.warn(`[GDPR] ${table}: ${error.message}`);
        summary.push({ table, status: 'error', count: 0 });
      } else {
        console.log(`[GDPR] ${table}: deleted ${count ?? 0} rows`);
        summary.push({ table, status: 'ok', count: count ?? 0 });
      }
    }

    const deletedAt = new Date().toISOString();
    console.log(`[GDPR] Complete — ${userId} — ${deletedAt}`);

    return NextResponse.json({ success: true, userId, deleted_at: deletedAt, summary });

  } catch (err) {
    console.error('[GDPR] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Deletion failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
