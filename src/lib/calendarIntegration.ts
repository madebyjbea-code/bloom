// lib/calendarIntegration.ts
// Google Calendar (OAuth via backend API routes) + iCal support
//
// CHANGES in this version:
//  • OAuth now asks for calendar.events (write) as well as read — needed to put
//    Bloom blocks onto Google Calendar. Reconnect once after deploying.
//  • Google events default to "busy" (Google omits `transparency` for busy
//    events, so the old check marked almost everything as free).
//  • All-day events are flagged and never block time.
//  • createCalendarEvent / deleteCalendarEvent go through /api/calendar/schedule-event
//    so the token refresh + secret stay on the server.
//  • findFreeSlots returns LOCAL times (was UTC — 2h off in the Netherlands),
//    can also avoid Bloom blocks, and skips times already past today.

import { supabase } from './supabase';

export type CalendarType = 'google' | 'ical';
export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  busy: boolean;
  allDay?: boolean;
  color?: string;         // the calendar's colour in Google
  calendarName?: string;  // e.g. "Work", "iCloud", "Holidays in Netherlands"
};

// ============================================================================
// GOOGLE CALENDAR (OAuth via backend API)
// ============================================================================

export function getGoogleAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || '';
  const redirectUri = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/google-callback`;
  const scope = encodeURIComponent(
    'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
  );

  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
}

export async function saveGoogleCalendarTokens(userId: string, accessToken: string, refreshToken?: string): Promise<boolean> {
  try {
    const update: Record<string, any> = {
      calendar_type: 'google',
      calendar_connected: true,
      google_calendar_token: accessToken,
    };
    // Only overwrite the refresh token when Google actually sent a new one
    if (refreshToken) update.google_calendar_refresh_token = refreshToken;
    const { error } = await supabase.from('users').update(update).eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

export async function getGoogleCalendarEvents(
  userId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[] | null> {
  try {
    const res = await fetch(
      `/api/calendar/events?userId=${userId}&startDate=${startDate}&endDate=${endDate}`
    );

    if (!res.ok) {
      console.error('Calendar fetch error:', res.status);
      return null;
    }

    const data = await res.json();

    return (data.items || [])
      .filter((e: any) => e.status !== 'cancelled')
      .map((e: any) => ({
        id: e.id,
        summary: e.summary || 'Busy',
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        // Google leaves `transparency` out for normal (busy) events
        busy: e.transparency !== 'transparent',
        allDay: !e.start?.dateTime,
        color: e.calendarColor,
        calendarName: e.calendarName,
      }));
  } catch (error) {
    console.error('getGoogleCalendarEvents error:', error);
    return null;
  }
}

export type CreateEventResult = { eventId: string | null; error?: string; needsReconnect?: boolean };

export async function createCalendarEvent(
  userId: string,
  title: string,
  date: string,
  startTime: string,
  durationMinutes: number
): Promise<CreateEventResult> {
  try {
    const timeZone =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Europe/Amsterdam';
    const res = await fetch('/api/calendar/schedule-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, date, startTime, durationMinutes, timeZone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { eventId: null, error: data.error || `HTTP ${res.status}`, needsReconnect: !!data.needsReconnect };
    }
    return { eventId: data.eventId || null };
  } catch (e: any) {
    return { eventId: null, error: e?.message || 'Network error' };
  }
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/calendar/schedule-event?userId=${encodeURIComponent(userId)}&eventId=${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// ICAL SUPPORT (any calendar provider)
// ============================================================================

export async function saveICalURL(userId: string, icalUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        calendar_type: 'ical',
        calendar_connected: true,
        calendar_ical_url: icalUrl,
      })
      .eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

function parseICalEvents(icalText: string, dateFilter?: { start: string; end: string }): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match;

  while ((match = eventRegex.exec(icalText)) !== null) {
    const eventBlock = match[1];
    const summaryMatch = eventBlock.match(/SUMMARY:(.+)/);
    const dtStartMatch = eventBlock.match(/DTSTART(?:;[^:]*)?:(.+)/);
    const dtEndMatch = eventBlock.match(/DTEND(?:;[^:]*)?:(.+)/);
    const transpMatch = eventBlock.match(/TRANSP:(.+)/);

    if (summaryMatch && dtStartMatch && dtEndMatch) {
      const summary = summaryMatch[1].trim();
      const rawStart = dtStartMatch[1].trim();
      const start = normalizeICalDate(rawStart);
      const end = normalizeICalDate(dtEndMatch[1].trim());

      if (dateFilter) {
        const eventDate = start.split('T')[0];
        if (eventDate < dateFilter.start || eventDate > dateFilter.end) {
          continue;
        }
      }

      events.push({
        id: `ical_${Math.random().toString(36).substr(2, 9)}`,
        summary,
        start,
        end,
        busy: transpMatch ? transpMatch[1].trim() !== 'TRANSPARENT' : true,
        allDay: !/T\d{6}/.test(rawStart),
      });
    }
  }

  return events;
}

function normalizeICalDate(dateStr: string): string {
  const match = dateStr.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!match) return dateStr;

  const [, year, month, day, hour, min, sec] = match;
  const dateOnly = `${year}-${month}-${day}`;

  if (hour && min && sec) {
    const timeStr = `${hour}:${min}:${sec}`;
    const isUTC = dateStr.endsWith('Z');
    const isoStr = `${dateOnly}T${timeStr}${isUTC ? 'Z' : ''}`;
    return new Date(isoStr).toISOString();
  }

  return dateOnly;
}

export async function getICalEvents(
  userId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[] | null> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('calendar_ical_url')
      .eq('id', userId)
      .single();

    if (!user?.calendar_ical_url) return null;

    const res = await fetch(user.calendar_ical_url);
    if (!res.ok) return null;

    const icalText = await res.text();
    return parseICalEvents(icalText, { start: startDate, end: endDate });
  } catch {
    return null;
  }
}

// ============================================================================
// CALENDAR CONNECTION STATUS
// ============================================================================

export async function getCalendarConfig(userId: string): Promise<{ type: CalendarType; connected: boolean } | null> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('calendar_type, calendar_connected')
      .eq('id', userId)
      .single();

    if (!user) return null;
    return {
      type: (user.calendar_type as CalendarType) || 'google',
      connected: user.calendar_connected || false,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// UNIFIED INTERFACE
// ============================================================================

export async function getCalendarEvents(
  userId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[] | null> {
  const config = await getCalendarConfig(userId);
  if (!config?.connected) return null;

  if (config.type === 'google') {
    return getGoogleCalendarEvents(userId, startDate, endDate);
  } else if (config.type === 'ical') {
    return getICalEvents(userId, startDate, endDate);
  }

  return null;
}

// ============================================================================
// CHRONOTYPE PREFERENCES
// ============================================================================

export const CHRONOTYPE_PREFERENCES = {
  lion: {
    name: 'Lion (Early Riser)',
    windows: [
      { start: '05:00', end: '07:00', preference: 'best' },
      { start: '07:00', end: '09:00', preference: 'good' },
      { start: '09:00', end: '12:00', preference: 'ok' },
    ]
  },
  bear: {
    name: 'Bear (Balanced)',
    windows: [
      { start: '07:00', end: '09:00', preference: 'good' },
      { start: '09:00', end: '12:00', preference: 'best' },
      { start: '14:00', end: '17:00', preference: 'good' },
      { start: '17:00', end: '19:00', preference: 'ok' },
    ]
  },
  wolf: {
    name: 'Wolf (Night Owl)',
    windows: [
      { start: '10:00', end: '12:00', preference: 'ok' },
      { start: '14:00', end: '17:00', preference: 'good' },
      { start: '17:00', end: '20:00', preference: 'best' },
      { start: '20:00', end: '22:00', preference: 'best' },
    ]
  },
  dolphin: {
    name: 'Dolphin (Variable)',
    windows: [
      { start: '06:00', end: '09:00', preference: 'ok' },
      { start: '16:00', end: '19:00', preference: 'best' },
      { start: '21:00', end: '23:00', preference: 'good' },
    ]
  },
  // Fallback used when none of the chronotype windows have free time left
  anytime: {
    name: 'Any free time',
    windows: [
      { start: '06:00', end: '23:45', preference: 'ok' },
    ]
  },
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const localHM = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export function findFreeSlots(
  date: string,
  calendarEvents: CalendarEvent[],
  chronotype: string,
  durationMinutes: number = 30,
  extraBusy: Array<{ start: string; end: string }> = [] // local HH:MM ranges, e.g. Bloom blocks
): Array<{ start: string; end: string; preference: string }> {
  const key = String(chronotype || 'bear').toLowerCase() as keyof typeof CHRONOTYPE_PREFERENCES;
  const preferences = CHRONOTYPE_PREFERENCES[key] || CHRONOTYPE_PREFERENCES.bear;

  const blocked: Array<{ start: Date; end: Date }> = [];
  (calendarEvents || []).forEach((e) => {
    if (!e.busy || e.allDay) return;
    const s = new Date(e.start);
    const en = new Date(e.end);
    if (!isNaN(s.getTime()) && !isNaN(en.getTime())) blocked.push({ start: s, end: en });
  });
  extraBusy.forEach((b) => {
    const s = new Date(`${date}T${b.start}:00`);
    const en = new Date(`${date}T${b.end}:00`);
    if (!isNaN(s.getTime()) && !isNaN(en.getTime())) blocked.push({ start: s, end: en });
  });

  const dateObj = new Date(`${date}T00:00:00`);
  const now = new Date();
  const suggestions: Array<{ start: string; end: string; preference: string }> = [];

  preferences.windows.forEach((window) => {
    const [startHour, startMin] = window.start.split(':').map(Number);
    const [endHour, endMin] = window.end.split(':').map(Number);

    let current = new Date(dateObj);
    current.setHours(startHour, startMin, 0, 0);
    const windowEnd = new Date(dateObj);
    windowEnd.setHours(endHour, endMin, 0, 0);

    while (current.getTime() + durationMinutes * 60000 <= windowEnd.getTime()) {
      const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
      const isPast = current.getTime() < now.getTime();
      const isBlocked = blocked.some((b) => current < b.end && slotEnd > b.start);

      if (!isBlocked && !isPast) {
        suggestions.push({
          start: localHM(current),
          end: localHM(slotEnd),
          preference: window.preference,
        });
      }

      current = new Date(current.getTime() + 15 * 60000);
    }
  });

  const deduped = Array.from(new Map(suggestions.map((s) => [s.start, s])).values());
  return deduped.sort((a, b) => {
    const prefOrder = { best: 0, good: 1, ok: 2 };
    return (prefOrder[a.preference as keyof typeof prefOrder] ?? 3) -
           (prefOrder[b.preference as keyof typeof prefOrder] ?? 3);
  });
}
