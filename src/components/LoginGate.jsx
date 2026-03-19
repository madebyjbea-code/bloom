// LoginGate.jsx
import { useEffect, useState } from 'react'

export default function LoginGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const APP_PASSWORD = 'springreset2024'

  useEffect(() => {
    const saved = localStorage.getItem('bloomAccess')
    if (saved === APP_PASSWORD) {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (password === APP_PASSWORD) {
      localStorage.setItem('bloomAccess', password)
      setIsAuthenticated(true)
    } else {
      setError('Invalid password. Check your Spring Energy Reset guide or purchase below.')
      setPassword('')
    }
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
              Enter your access password from the guide to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
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
              Access Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password from guide"
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

