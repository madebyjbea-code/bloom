// app/api/calendar/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('google_calendar_token')
      .eq('id', userId)
      .single();

    if (!user?.google_calendar_token) {
      return NextResponse.json({ error: 'No token' }, { status: 401 });
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      headers: { Authorization: `Bearer ${user.google_calendar_token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'API error', status: res.status }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('List calendars error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}