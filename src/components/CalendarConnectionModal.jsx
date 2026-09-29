'use client';

import { useState } from 'react';
import { getGoogleAuthUrl, saveICalURL } from '../lib/calendarIntegration';
import { supabase } from '../lib/supabase';

export default function CalendarConnectionModal({ userId, onConnected, onClose }) {
  const [step, setStep] = useState('choose');
  const [icalUrl, setICalUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleClick = () => {
    const authUrl = getGoogleAuthUrl();
    window.location.href = authUrl;
  };

  const handleICalSubmit = async (e) => {
    e.preventDefault();
    if (!icalUrl.trim()) {
      setError('Please enter a valid calendar URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(icalUrl);
      if (!res.ok) {
        setError('Unable to access this URL. Make sure it\'s public and correct.');
        setLoading(false);
        return;
      }

      const success = await saveICalURL(userId, icalUrl);
      if (success) {
        if (onConnected) onConnected('ical');
        if (onClose) onClose();
      } else {
        setError('Failed to save. Please try again.');
      }
    } catch (e) {
      setError('Error accessing calendar URL. Check it\'s correct.');
      console.error('iCal error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: 32,
        maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {step === 'choose' && (
          <div>
            <div style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 12,
              color: '#1a1a1a',
            }}>
              Connect your calendar
            </div>
            <div style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 28,
              lineHeight: 1.6,
            }}>
              Bloom reads your calendar to find free time for wellness. Choose how you want to connect:
            </div>

            {/* Google Calendar */}
            <button
              onClick={() => setStep('google')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: '100%',
                background: 'white',
                border: '2px solid #e8e4de',
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: 14,
                fontWeight: 500,
              }}
              onMouseOver={(e) => e.target.style.borderColor = '#d4af6a'}
              onMouseOut={(e) => e.target.style.borderColor = '#e8e4de'}
            >
              <div style={{ fontSize: 24 }}>📅</div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1a1a1a' }}>Google Calendar</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  Automatic sync • Auto-create event blocks
                </div>
              </div>
              <div style={{ color: '#ccc' }}>›</div>
            </button>

            {/* iCal */}
            <button
              onClick={() => setStep('ical')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: '100%',
                background: 'white',
                border: '2px solid #e8e4de',
                borderRadius: 16,
                padding: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: 14,
                fontWeight: 500,
              }}
              onMouseOver={(e) => e.target.style.borderColor = '#d4af6a'}
              onMouseOut={(e) => e.target.style.borderColor = '#e8e4de'}
            >
              <div style={{ fontSize: 24 }}>🔗</div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1a1a1a' }}>iCal URL</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  Works with any calendar provider
                </div>
              </div>
              <div style={{ color: '#ccc' }}>›</div>
            </button>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                background: '#f3f8f3',
                border: '1px solid #b5ceb5',
                borderRadius: 12,
                padding: 12,
                marginTop: 20,
                fontSize: 14,
                fontWeight: 500,
                color: '#5a7a5a',
                cursor: 'pointer',
              }}
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 'google' && (
          <div>
            <button
              onClick={() => setStep('choose')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 20,
                color: '#888',
                marginBottom: 16,
              }}
            >
              ← Back
            </button>

            <div style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: 22,
              fontWeight: 600,
              marginBottom: 12,
              color: '#1a1a1a',
            }}>
              Connect Google Calendar
            </div>

            <div style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 24,
              lineHeight: 1.6,
            }}>
              You'll be redirected to Google to authorize Bloom. Only your calendar is shared—we never get your password.
            </div>

            <button
              onClick={handleGoogleClick}
              style={{
                width: '100%',
                background: '#1a2e1a',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              Continue with Google
            </button>

            <button
              onClick={() => setStep('choose')}
              style={{
                width: '100%',
                background: '#f3f8f3',
                border: '1px solid #b5ceb5',
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                fontWeight: 500,
                color: '#5a7a5a',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {step === 'ical' && (
          <div>
            <button
              onClick={() => setStep('choose')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 20,
                color: '#888',
                marginBottom: 16,
              }}
            >
              ← Back
            </button>

            <div style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: 22,
              fontWeight: 600,
              marginBottom: 12,
              color: '#1a1a1a',
            }}>
              Add iCal calendar
            </div>

            <div style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 16,
              lineHeight: 1.6,
            }}>
              Paste your calendar's public iCal URL. Works with Google, Outlook, Apple, Notion, and others.
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#888',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                Calendar URL (ends in .ics)
              </label>
              <input
                type="url"
                value={icalUrl}
                onChange={(e) => setICalUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%',
                  border: '1.5px solid #e8e4de',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  fontFamily: 'DM Sans, sans-serif',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#d4af6a'}
                onBlur={(e) => e.target.style.borderColor = '#e8e4de'}
              />
            </div>

            {error && (
              <div style={{
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: 8,
                padding: 10,
                marginBottom: 16,
                fontSize: 12,
                color: '#c33',
              }}>
                {error}
              </div>
            )}

            <div style={{
              background: '#f3f8f3',
              borderRadius: 10,
              padding: 12,
              marginBottom: 20,
              fontSize: 12,
              color: '#666',
            }}>
              <strong>How to find your iCal URL:</strong>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <strong>Google Calendar:</strong>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    Settings → Calendars → Right-click your calendar → Settings → Scroll to "Integrate calendar" → Copy the iCal link
                  </div>
                </div>
                <div>
                  <strong>Outlook:</strong>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    Calendar settings → Sharing → Copy iCal link
                  </div>
                </div>
                <div>
                  <strong>Apple Calendar:</strong>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    Calendar settings → Sharing → Copy iCloud link
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleICalSubmit}
              disabled={loading || !icalUrl.trim()}
              style={{
                width: '100%',
                background: '#1a2e1a',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading || !icalUrl.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !icalUrl.trim() ? 0.6 : 1,
                marginBottom: 12,
              }}
            >
              {loading ? 'Connecting...' : 'Connect Calendar'}
            </button>

            <button
              onClick={() => setStep('choose')}
              style={{
                width: '100%',
                background: '#f3f8f3',
                border: '1px solid #b5ceb5',
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                fontWeight: 500,
                color: '#5a7a5a',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
