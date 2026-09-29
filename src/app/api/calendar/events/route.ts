// src/app/api/calendar/events/route.ts
// Returns events from ALL calendars the user has switched on in Google Calendar
// (primary, shared, subscribed iCal feeds, work calendars, etc.) — not just primary.
// Each event is tagged with calendarId / calendarName / calendarColor.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_SECRET || '';
const API = 'https://www.googleapis.com/calendar/v3';

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

type Cal = { id: string; name: string; color: string };

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');

    if (!userId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('google_calendar_token, google_calendar_refresh_token')
      .eq('id', userId)
      .single();

    if (!user?.google_calendar_token) {
      return NextResponse.json({ error: 'No calendar token' }, { status: 401 });
    }

    let token: string = user.google_calendar_token;
    const get = (url: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    // 1) Which calendars does the user have? (refresh the token once if it has expired)
    let listRes = await get(`${API}/users/me/calendarList?minAccessRole=freeBusyReader&maxResults=250`);
    if (listRes.status === 401 && user.google_calendar_refresh_token) {
      const fresh = await refreshGoogleToken(userId, user.google_calendar_refresh_token);
      if (!fresh) return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      token = fresh;
      listRes = await get(`${API}/users/me/calendarList?minAccessRole=freeBusyReader&maxResults=250`);
    }
    if (listRes.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let calendars: Cal[] = [{ id: 'primary', name: 'Calendar', color: '#9aa8c0' }];
    if (listRes.ok) {
      const list = await listRes.json();
      const shown = (list.items || []).filter((c: any) => c.selected && !c.hidden && !c.deleted);
      if (shown.length) {
        calendars = shown.map((c: any) => ({
          id: c.id,
          name: c.summaryOverride || c.summary || 'Calendar',
          color: c.backgroundColor || '#9aa8c0',
        }));
      }
    } else {
      // Token without calendar-list permission → fall back to the main calendar only
      console.warn('calendarList failed:', listRes.status, '— using primary calendar only');
    }

    // 2) Fetch events from every visible calendar in parallel; one failing calendar doesn't break the rest
    const timeMin = encodeURIComponent(`${startDate}T00:00:00Z`);
    const timeMax = encodeURIComponent(`${endDate}T23:59:59Z`);

    const results = await Promise.all(
      calendars.map(async (cal) => {
        try {
          const res = await get(
            `${API}/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`
          );
          if (!res.ok) {
            console.warn(`Calendar "${cal.name}" skipped:`, res.status);
            return [];
          }
          const data = await res.json();
          return (data.items || []).map((e: any) => ({
            ...e,
            calendarId: cal.id,
            calendarName: cal.name,
            calendarColor: cal.color,
          }));
        } catch {
          return [];
        }
      })
    );

    // De-duplicate events that show up in more than one calendar (e.g. an invite you also subscribed to)
    const seen = new Set<string>();
    const items = results.flat().filter((e: any) => {
      const key = e.iCalUID ? `${e.iCalUID}|${e.start?.dateTime || e.start?.date}` : `${e.calendarId}|${e.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ items, calendars });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
