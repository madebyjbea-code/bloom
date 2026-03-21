// LoginGate.jsx (Supabase-backed)
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')

  // Single shared access code for Spring Energy Reset
  const VALID_ACCESS_CODE = 'springreset2024'

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    if (accessCode.trim() !== VALID_ACCESS_CODE) {
      setError('Invalid access code. Check your Spring Energy Reset guide or purchase below.')
      return
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          source: 'bloom-app',
        },
      },
    })

    if (authError) {
      setError('Error sending login link. Please double-check your email and try again.')
      return
    }

    alert('Check your email for a secure login link to access BLOOM.')
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f3ed',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🌱</div>
          <p style={{ color: '#888', fontSize: '14px' }}>Loading BLOOM...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f3ed',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            padding: '40px',
            background: 'white',
            borderRadius: '20px',
            border: '1.5px solid #e8e4de',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: '36px',
                marginBottom: '8px',
                color: '#1a1a1a',
              }}
            >
              🌱 BLOOM
            </h1>
            <p
              style={{
                color: '#888',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontWeight: '600',
              }}
            >
              Living Wellness OS
            </p>
          </div>

          <div
            style={{
              background: '#f7f3ed',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px',
              border: '1px solid #e8e4de',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                color: '#2a2a2a',
                lineHeight: '1.6',
                margin: 0,
              }}
            >
              This app is included with your <strong>Spring Energy Reset</strong> guide purchase.
              Enter your email and the <strong>access code</strong> from the guide to receive a
              secure login link.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#2a2a2a',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1.5px solid #e8e4de',
                marginBottom: '16px',
                fontSize: '15px',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'border-color 0.2s',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8aad8a'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e8e4de'
              }}
            />
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#2a2a2a',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Access Code
            </label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code from guide"
              required
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1.5px solid #e8e4de',
                marginBottom: '16px',
                fontSize: '15px',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'border-color 0.2s',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8aad8a'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e8e4de'
              }}
            />

            {error && (
              <div
                style={{
                  background: '#fff5f5',
                  border: '1.5px solid #e07070',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '16px',
                }}
              >
                <p
                  style={{
                    color: '#e07070',
                    fontSize: '13px',
                    margin: 0,
                    lineHeight: '1.5',
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: '#8aad8a',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#5a7a5a'
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#8aad8a'
              }}
            >
              Access App →
            </button>
          </form>

          <div
            style={{
              marginTop: '30px',
              paddingTop: '24px',
              borderTop: '1px solid #e8e4de',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                color: '#888',
                marginBottom: '12px',
              }}
            >
              Don&apos;t have the Spring Energy Reset guide?
            </p>
            <a
              href="https://byjbea.myshopify.com/products/spring-energy-reset"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                color: '#8aad8a',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                padding: '8px 16px',
                border: '1.5px solid #8aad8a',
                borderRadius: '20px',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#8aad8a'
                e.target.style.color = 'white'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#8aad8a'
              }}
            >
              Get the guide →
            </a>
          </div>
        </div>
      </div>
    )
  }

  return children
}

