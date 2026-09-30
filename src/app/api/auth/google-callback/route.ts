// app/api/auth/google-callback/route.ts
// CORRECT: Backend API route handles OAuth callback securely

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_SECRET || '';  // ← NOT public
// The redirect URI must be byte-for-byte the one the browser sent to Google.
// The app builds it from window.location.origin, so use this request's own
// origin here too — that way production, the dev preview and localhost all
// work without an env var. (Each origin must still be listed in Google Cloud.)
function redirectUriFor(request: NextRequest) {
  return `${request.nextUrl.origin}/api/auth/google-callback`;
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const oauthError = request.nextUrl.searchParams.get('error');

    if (!code) {
      return NextResponse.redirect(new URL(`/?calendar_error=${encodeURIComponent(oauthError || 'no_code')}`, request.url));
    }

    // Exchange code for tokens (backend only — SECRET is safe here)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,  // ← SECRET safe on backend
        redirect_uri: redirectUriFor(request),
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(new URL('/?calendar_error=token_failed', request.url));
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    // Get user ID from session/auth (you'll need to implement this based on your auth setup)
    // For now, redirect with tokens so frontend can save them
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('access_token', accessToken);
    if (refreshToken) redirectUrl.searchParams.set('refresh_token', refreshToken);
    redirectUrl.searchParams.set('calendar_connected', 'true');

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?calendar_error=auth_failed', request.url));
  }
}
