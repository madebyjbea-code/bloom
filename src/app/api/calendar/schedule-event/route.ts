// src/app/api/calendar/schedule-event/route.ts
// Creates (POST) or deletes (DELETE) a Bloom block on the user's Google Calendar.
// Runs on the server so the client secret + token refresh stay private.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_SECRET || '';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

async function refreshGoogleToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await supabase.from('users').update({ google_calendar_token: data.access_token }).eq('id', userId);
    return data.access_token;
  } catch {
    return null;
  }
}

async function getTokens(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('google_calendar_token, google_calendar_refresh_token')
    .eq('id', userId)
    .single();
  return user;
}

// Call Google; if the access token has expired, refresh once and retry.
async function callGoogle(userId: string, url: string, init: RequestInit) {
  const user = await getTokens(userId);
  if (!user?.google_calendar_token) return { res: null as Response | null, noToken: true };

  const withAuth = (token: string): RequestInit => ({
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });

  let res = await fetch(url, withAuth(user.google_calendar_token));
  if (res.status === 401 && user.google_calendar_refresh_token) {
    const fresh = await refreshGoogleToken(userId, user.google_calendar_refresh_token);
    if (fresh) res = await fetch(url, withAuth(fresh));
  }
  return { res, noToken: false };
}

function addMinutes(date: string, time: string, minutes: number) {
  // Pure wall-clock maths (no timezone conversion) — Google gets the timeZone separately
  const [h, m] = time.split(':').map(Number);
  const base = new Date(Date.UTC(
    Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), h, m
  ));
  const end = new Date(base.getTime() + minutes * 60000);
  return end.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS (wall clock)
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, date, startTime, durationMinutes, timeZone } = await request.json();
    if (!userId || !title || !date || !startTime) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const tz = timeZone || 'Europe/Amsterdam';
    const body = {
      summary: title,
      description: 'Planned in Bloom 🌿',
      start: { dateTime: `${date}T${startTime}:00`, timeZone: tz },
      end: { dateTime: addMinutes(date, startTime, Number(durationMinutes) || 30), timeZone: tz },
      colorId: '2', // sage green
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 5 }] },
    };

    const { res, noToken } = await callGoogle(userId, EVENTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (noToken || !res) {
      return NextResponse.json({ error: 'Google Calendar not connected', needsReconnect: true }, { status: 401 });
    }
    if (res.status === 403 || res.status === 401) {
      // Usually: token only has read-only scope → user needs to reconnect once
      const detail = await res.text();
      console.error('Create event denied:', res.status, detail);
      return NextResponse.json(
        { error: 'Bloom needs permission to add events — reconnect Google Calendar', needsReconnect: true },
        { status: 403 }
      );
    }
    if (!res.ok) {
      const detail = await res.text();
      console.error('Create event failed:', res.status, detail);
      return NextResponse.json({ error: 'Google Calendar error', status: res.status }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ eventId: data.id, htmlLink: data.htmlLink });
  } catch (error) {
    console.error('schedule-event POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!userId || !eventId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const { res, noToken } = await callGoogle(userId, `${EVENTS_URL}/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
    });
    if (noToken || !res) return NextResponse.json({ error: 'Not connected' }, { status: 401 });
    // 410 = already deleted in Google, treat as success
    if (!res.ok && res.status !== 410 && res.status !== 404) {
      return NextResponse.json({ error: 'Google Calendar error', status: res.status }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('schedule-event DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
