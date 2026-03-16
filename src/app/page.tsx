'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type HabitReward = {
  coins: number
  ge: number
  isGreen: boolean
  isQuit: boolean
}

type TimerPreset = { mins: number; label: string }

const HABIT_REWARDS: HabitReward[] = [
  { coins: 30, ge: 12, isGreen: true, isQuit: false },
  { coins: 50, ge: 0, isGreen: false, isQuit: false },
  { coins: 30, ge: 0, isGreen: false, isQuit: true },
  { coins: 25, ge: 25, isGreen: true, isQuit: false },
  { coins: 25, ge: 0, isGreen: false, isQuit: false },
  { coins: 20, ge: 0, isGreen: false, isQuit: false },
]

const TIMER_PRESETS: TimerPreset[] = [
  { mins: 25, label: 'Deep Work' },
  { mins: 5, label: 'Short Break' },
  { mins: 15, label: 'Long Break' },
  { mins: 10, label: 'Mindfulness 🧘' },
]

type AvatarMode = 'pet' | 'mini' | 'simple'
type NavView =
  | 'dashboard'
  | 'habits'
  | 'nutrition'
  | 'focus'
  | 'planner'
  | 'planet'
  | 'community'
  | 'shop'
  | 'settings'

function formatTimer(secs: number) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.max(0, secs % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

export default function Home() {
  const [activeNav, setActiveNav] = useState<NavView>('dashboard')
  const [avatarMode, setAvatarMode] = useState<AvatarMode>('pet')

  const [coins, setCoins] = useState(2340)
  const [greenEnergy, setGreenEnergy] = useState(847)
  const [health, setHealth] = useState(78)
  const [habitStates, setHabitStates] = useState<boolean[]>([false, false, false, false, false, false])

  const [shopOpen, setShopOpen] = useState(false)

  const [timerRunning, setTimerRunning] = useState(false)
  const [timerPresetIdx, setTimerPresetIdx] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(TIMER_PRESETS[0]!.mins * 60)

  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimeoutRef = useRef<number | null>(null)

  const timerLabel = TIMER_PRESETS[timerPresetIdx]!.label

  const avatarDisplay = useMemo(() => {
    if (avatarMode === 'pet') return { icon: '🦔', name: 'Fern' }
    if (avatarMode === 'mini') return { icon: '🧑‍🌿', name: 'Mini Jordan' }
    return { icon: '📊', name: 'Your Stats' }
  }, [avatarMode])

  const avatarMood = useMemo(() => {
    if (health > 70) return 'Thriving · Streak bonus active 🔥'
    if (health > 40) return 'Doing okay · Keep going 💪'
    return 'Needs care · Complete habits to help 🌱'
  }, [health])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setToastVisible(true)
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = window.setTimeout(() => setToastVisible(false), 3000)
  }

  useEffect(() => {
    if (!timerRunning) return
    const id = window.setInterval(() => {
      setTimerSeconds((s) => s - 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [timerRunning])

  useEffect(() => {
    if (timerSeconds >= 0) return
    setTimerRunning(false)
    setTimerSeconds(0)
    setCoins((c) => c + 15)
    showToast('🎉 Session complete! +15 🪙 earned')
  }, [timerSeconds])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  const openShop = () => {
    setShopOpen(true)
    setActiveNav('shop')
  }

  const closeShop = () => setShopOpen(false)

  const toggleHabit = (idx: number) => {
    setHabitStates((prev) => {
      const next = [...prev]
      next[idx] = !next[idx]
      const reward = HABIT_REWARDS[idx]!

      if (next[idx]) {
        setCoins((c) => c + reward.coins)
        if (reward.ge) setGreenEnergy((g) => g + reward.ge)
        setHealth((h) => Math.min(100, h + 3))
        let msg = `✅ Habit done! +${reward.coins} 🪙`
        if (reward.ge) msg += ` +${reward.ge} ⚡ GE`
        showToast(msg)
      } else {
        setCoins((c) => c - reward.coins)
        if (reward.ge) setGreenEnergy((g) => g - reward.ge)
        if (reward.isQuit) {
          setHealth((h) => Math.max(0, h - 8))
          showToast('💔 That hurts your progress. Keep going — you got this.')
        } else {
          setHealth((h) => Math.max(0, h - 2))
          showToast('↩️ Habit unmarked')
        }
      }

      return next
    })
  }

  const toggleTimer = () => {
    setTimerRunning((r) => {
      const next = !r
      return next
    })
  }

  const resetTimer = () => {
    setTimerRunning(false)
    setTimerSeconds(TIMER_PRESETS[timerPresetIdx]!.mins * 60)
  }

  const setTimerMode = (idx: number) => {
    setTimerPresetIdx(idx)
    setTimerRunning(false)
    setTimerSeconds(TIMER_PRESETS[idx]!.mins * 60)
  }

  const onNavClick = (view: NavView, label: string) => {
    setActiveNav(view)
    if (view === 'shop') openShop()
    else showToast(`📍 ${label} — full view in production build`)
  }

  const buyItem = (name: string, cost: number, isGE = false) => {
    if (isGE) {
      const geCost = 100
      if (greenEnergy >= geCost) {
        setGreenEnergy((g) => g - geCost)
        showToast(`🍃 Equipped ${name}! -${geCost} GE`)
        closeShop()
      } else {
        showToast('⚡ Not enough Green Energy!')
      }
      return
    }

    if (coins >= cost) {
      setCoins((c) => c - cost)
      showToast(`🛍 Equipped ${name}! -${cost} 🪙`)
      closeShop()
    } else {
      showToast('🪙 Not enough Bloom Coins — complete more habits!')
    }
  }

  const timerButtonLabel = timerRunning ? '⏸ Pause' : timerSeconds === TIMER_PRESETS[timerPresetIdx]!.mins * 60 ? '▶ Start' : '▶ Resume'

  return (
    <>
      <div className="app-shell">
        <nav className="sidebar" aria-label="Primary">
          <div className="sidebar-logo">B</div>

          <button
            className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavClick('dashboard', 'Dashboard')}
            aria-label="Dashboard"
          >
            🌿
            <span className="tooltip">Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeNav === 'habits' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavClick('habits', 'Habits')}
            aria-label="Habits"
          >
            ✅
            <span className="tooltip">Habits</span>
          </button>
          <button
            className={`nav-item ${activeNav === 'nutrition' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavClick('nutrition', 'Nutrition')}
            aria-label="Nutrition"
          >
            🥗
            <span className="tooltip">Nutrition</span>
          </button>
          <button
            className={`nav-item ${activeNav === 'focus' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavClick('focus', 'Focus')}
            aria-label="Focus"
          >
            ⏱
            <span className="tooltip">Focus</span>
          </button>
          <button
            className={`nav-item ${activeNav === 'planner' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavClick('planner', 'Planner')}
            aria-label="Planner"
          >
            📅
            <span className="tooltip">Planner</span>
          </button>
          <button
            className={`nav-item ${activeNav === 'planet' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavClick('planet', 'Planet')}
            aria-label="Planet"
          >
            🌍
            <span className="tooltip">Planet</span>
          </button>
          <button
            className={`nav-item ${activeNav === 'community' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavClick('community', 'Community')}
            aria-label="Community"
          >
            👥
            <span className="tooltip">Community</span>
            <div className="notif-dot" />
          </button>

          <div className="sidebar-spacer" />

          <button
            className={`nav-item ${activeNav === 'shop' ? 'active' : ''}`}
            type="button"
            onClick={openShop}
            aria-label="Avatar Shop"
          >
            🛍
            <span className="tooltip">Avatar Shop</span>
          </button>
          <button
            className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavClick('settings', 'Settings')}
            aria-label="Settings"
          >
            ⚙️
            <span className="tooltip">Settings</span>
          </button>
        </nav>

        <main className="main">
          <div className="topbar">
            <div className="topbar-greeting">
              <h1>Good morning, Jordan ✨</h1>
              <p>Wednesday, March 11 · 6 habits to complete today</p>
            </div>
            <div className="topbar-currencies">
              <button className="currency-chip" type="button" onClick={openShop}>
                <span className="icon">🪙</span>
                <span>{coins.toLocaleString()}</span>
              </button>
              <div className="currency-chip green-chip">
                <span className="icon">⚡</span>
                <span>{greenEnergy} GE</span>
              </div>
            </div>
          </div>

          <div className="mode-switcher" role="tablist" aria-label="Dashboard mode">
            <button
              className={`mode-btn ${avatarMode === 'pet' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setAvatarMode('pet')
                showToast('Switched to 🐾 Pet Mode')
              }}
            >
              🐾 Pet Mode
            </button>
            <button
              className={`mode-btn ${avatarMode === 'mini' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setAvatarMode('mini')
                showToast('Switched to 🪞 Mini-Me mode')
              }}
            >
              🪞 Mini-Me
            </button>
            <button
              className={`mode-btn ${avatarMode === 'simple' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setAvatarMode('simple')
                showToast('Switched to 📋 Simple mode')
              }}
            >
              📋 Simple
            </button>
          </div>

          <div className="dashboard-grid">
            <div>
              <div className="card avatar-card" id="avatar-card">
                <div className="card-title">Your Companion</div>
                <div className="avatar-stage">
                  <button
                    className="avatar-creature"
                    type="button"
                    aria-label="Avatar"
                    onClick={() => showToast('🌿 Fern is happy! Keep up the great habits!')}
                  >
                    {avatarDisplay.icon}
                  </button>
                  <div className="avatar-level">Lv. 7</div>
                </div>
                <div className="avatar-name">{avatarDisplay.name}</div>
                <div className="avatar-mood">{avatarMood}</div>

                <div className="stat-bar-row">
                  <div className="stat-bar">
                    <div className="stat-bar-label">
                      <span>❤️ Health</span>
                      <span>{health}%</span>
                    </div>
                    <div className="stat-bar-track">
                      <div className="stat-bar-fill fill-health" style={{ width: `${health}%` }} />
                    </div>
                  </div>
                  <div className="stat-bar">
                    <div className="stat-bar-label">
                      <span>😊 Mood</span>
                      <span>65%</span>
                    </div>
                    <div className="stat-bar-track">
                      <div className="stat-bar-fill fill-mood" style={{ width: '65%' }} />
                    </div>
                  </div>
                  <div className="stat-bar">
                    <div className="stat-bar-label">
                      <span>⚡ Green Energy</span>
                      <span>42%</span>
                    </div>
                    <div className="stat-bar-track">
                      <div className="stat-bar-fill fill-energy" style={{ width: '42%' }} />
                    </div>
                  </div>
                </div>

                <div className="coins-display">
                  <div className="coin-badge">
                    <div className="amount" style={{ color: 'var(--gold)' }}>
                      {coins.toLocaleString()}
                    </div>
                    <div className="label">🪙 Bloom Coins</div>
                  </div>
                  <div className="coin-badge">
                    <div className="amount" style={{ color: '#38a855' }}>
                      {greenEnergy.toLocaleString()}
                    </div>
                    <div className="label">⚡ Green Energy</div>
                  </div>
                </div>

                <div className="science-note">
                  <span className="icon">🔬</span>
                  <span>
                    Habit streaks reduce decision fatigue. Lally et al. (2010) found habits form in
                    18–254 days—consistency is the key variable.
                  </span>
                </div>
              </div>
            </div>

            <div className="right-col">
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon">😴</div>
                  <div className="stat-value">7h 22m</div>
                  <div className="stat-label">Sleep · Fitbit synced</div>
                  <div className="stat-sub">↑ 18min vs avg</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🧘</div>
                  <div className="stat-value">14 min</div>
                  <div className="stat-label">Mindfulness today</div>
                  <div className="stat-sub">Goal: 20 min</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🚶</div>
                  <div className="stat-value">6,240</div>
                  <div className="stat-label">Steps · synced</div>
                  <div className="stat-sub">Goal: 8,000</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💧</div>
                  <div className="stat-value">1.4 L</div>
                  <div className="stat-label">Hydration</div>
                  <div className="stat-sub">Goal: 2.5 L</div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Today&apos;s Habits</div>
                <div className="habits-grid">
                  <div
                    className={`habit-item sustainable ${habitStates[0] ? 'completed' : ''}`}
                    onClick={() => toggleHabit(0)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="habit-top">
                      <span className="habit-icon">🥦</span>
                      <div className="habit-check">{habitStates[0] ? '✓' : ''}</div>
                    </div>
                    <div className="habit-name">Whole foods meal</div>
                    <div className="habit-meta">
                      <span className="habit-streak">🔥 14 days</span>
                      <span className="green-tag">+12 GE</span>
                    </div>
                  </div>

                  <div
                    className={`habit-item ${habitStates[1] ? 'completed' : ''}`}
                    onClick={() => toggleHabit(1)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="habit-top">
                      <span className="habit-icon">🏋️</span>
                      <div className="habit-check">{habitStates[1] ? '✓' : ''}</div>
                    </div>
                    <div className="habit-name">Workout</div>
                    <div className="habit-meta">
                      <span className="habit-streak">🔥 6 days</span>
                      <span className="habit-time">~3:00 PM</span>
                      <span className="reward-tag">+50 🪙</span>
                    </div>
                  </div>

                  <div
                    className={`habit-item quit-type ${habitStates[2] ? 'completed' : ''}`}
                    onClick={() => toggleHabit(2)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="habit-top">
                      <span className="habit-icon">🚬</span>
                      <div className="habit-check">{habitStates[2] ? '✓' : ''}</div>
                    </div>
                    <div className="habit-name">Smoke-free day</div>
                    <div className="habit-meta">
                      <span className="habit-streak">✨ 3 days</span>
                      <span className="reward-tag">+30 🪙</span>
                    </div>
                  </div>

                  <div
                    className={`habit-item sustainable ${habitStates[3] ? 'completed' : ''}`}
                    onClick={() => toggleHabit(3)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="habit-top">
                      <span className="habit-icon">🌱</span>
                      <div className="habit-check">{habitStates[3] ? '✓' : ''}</div>
                    </div>
                    <div className="habit-name">Plant-based day</div>
                    <div className="habit-meta">
                      <span className="habit-streak">🔥 9 days</span>
                      <span className="green-tag">+25 GE</span>
                    </div>
                  </div>

                  <div
                    className={`habit-item ${habitStates[4] ? 'completed' : ''}`}
                    onClick={() => toggleHabit(4)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="habit-top">
                      <span className="habit-icon">🧘</span>
                      <div className="habit-check">{habitStates[4] ? '✓' : ''}</div>
                    </div>
                    <div className="habit-name">Mindfulness 20min</div>
                    <div className="habit-meta">
                      <span className="habit-streak">🔥 21 days</span>
                      <span className="reward-tag">+25 🪙</span>
                    </div>
                  </div>

                  <div
                    className={`habit-item ${habitStates[5] ? 'completed' : ''}`}
                    onClick={() => toggleHabit(5)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="habit-top">
                      <span className="habit-icon">📖</span>
                      <div className="habit-check">{habitStates[5] ? '✓' : ''}</div>
                    </div>
                    <div className="habit-name">Read 30 minutes</div>
                    <div className="habit-meta">
                      <span className="habit-streak">🔥 4 days</span>
                      <span className="reward-tag">+20 🪙</span>
                    </div>
                  </div>
                </div>
                <button
                  className="add-habit-btn"
                  type="button"
                  onClick={() => showToast('➕ Goal planner coming in full version!')}
                >
                  ＋ Add habit or goal
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card focus-card">
                  <div className="card-title">Focus Timer</div>
                  <div className="timer-display">{formatTimer(Math.max(0, timerSeconds))}</div>
                  <div className="timer-label">{timerLabel}</div>
                  <div className="timer-controls">
                    <button className="timer-btn primary" type="button" onClick={toggleTimer}>
                      {timerButtonLabel}
                    </button>
                    <button className="timer-btn secondary" type="button" onClick={resetTimer}>
                      ↺ Reset
                    </button>
                  </div>
                  <div className="timer-modes">
                    {TIMER_PRESETS.map((p, idx) => (
                      <button
                        key={p.label}
                        className={`timer-mode-btn ${idx === timerPresetIdx ? 'active' : ''}`}
                        type="button"
                        onClick={() => setTimerMode(idx)}
                      >
                        {idx === 0 ? 'Focus' : idx === 1 ? 'Break' : idx === 2 ? 'Long' : 'Mindful'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card green-card">
                  <div className="card-title">Green Energy</div>
                  <div className="green-energy-display">
                    <div className="green-orb" />
                    <div className="green-info">
                      <h3>{greenEnergy} GE</h3>
                      <p>Generated this week</p>
                    </div>
                  </div>
                  <div className="green-actions">
                    <div className="green-action-item">
                      <div className="dot" />
                      Plant-based · 9 days
                    </div>
                    <div className="green-action-item">
                      <div className="dot" />
                      No car · 3 days
                    </div>
                    <div className="green-action-item">
                      <div className="dot" />
                      Whole foods · 14 days
                    </div>
                  </div>
                  <button
                    className="donate-btn"
                    type="button"
                    onClick={() => showToast('🌍 200 GE donated to Ocean Conservancy!')}
                  >
                    🌍 Donate 200 GE to Planet
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card">
                  <div className="card-title">Week at a Glance</div>
                  <div className="planner-grid">
                    <div className="planner-day">
                      <div className="planner-day-name">Mon</div>
                      <div className="planner-day-num">9</div>
                    </div>
                    <div className="planner-day">
                      <div className="planner-day-name">Tue</div>
                      <div className="planner-day-num">10</div>
                    </div>
                    <div className="planner-day today has-event">
                      <div className="planner-day-name">Wed</div>
                      <div className="planner-day-num">11</div>
                    </div>
                    <div className="planner-day has-event">
                      <div className="planner-day-name">Thu</div>
                      <div className="planner-day-num">12</div>
                    </div>
                    <div className="planner-day has-event">
                      <div className="planner-day-name">Fri</div>
                      <div className="planner-day-num">13</div>
                    </div>
                    <div className="planner-day">
                      <div className="planner-day-name">Sat</div>
                      <div className="planner-day-num">14</div>
                    </div>
                    <div className="planner-day">
                      <div className="planner-day-name">Sun</div>
                      <div className="planner-day-num">15</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        fontSize: 12,
                        padding: '8px 10px',
                        background: 'var(--cream)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span>🏋️</span>
                      <span style={{ flex: 1 }}>Workout · flexible ~3pm</span>
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>today</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        fontSize: 12,
                        padding: '8px 10px',
                        background: 'var(--cream)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span>🧘</span>
                      <span style={{ flex: 1 }}>Mindfulness · 7:00 AM</span>
                      <span style={{ color: 'var(--sage)', fontSize: 11 }}>✓ done</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        fontSize: 12,
                        padding: '8px 10px',
                        background: 'var(--cream)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span>🥗</span>
                      <span style={{ flex: 1 }}>Meal prep · 6:00 PM</span>
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>Thu</span>
                    </div>
                  </div>
                  <div className="science-note" style={{ marginTop: 12 }}>
                    <span className="icon">🔬</span>
                    <span>
                      Flexible scheduling (&quot;workout around 3pm&quot;) outperforms rigid times.
                      Implementation intention research (Gollwitzer, 1999) supports if-then planning
                      for variable-time habits.
                    </span>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">Community · Your Circle</div>
                  <div className="community-feed">
                    <div className="community-item">
                      <div className="community-avatar">🦊</div>
                      <div className="community-text">
                        <div className="community-name">Maya R.</div>
                        <div className="community-action">
                          Completed a 30-day plant-based streak 🌱 — earned 500 GE!
                        </div>
                        <div className="community-time">12 min ago</div>
                      </div>
                    </div>
                    <div className="community-item">
                      <div className="community-avatar">🐻</div>
                      <div className="community-text">
                        <div className="community-name">Sam T.</div>
                        <div className="community-action">
                          Hit their 7am mindfulness goal for the 3rd week in a row 🧘
                        </div>
                        <div className="community-time">1 hr ago</div>
                      </div>
                    </div>
                    <div className="community-item">
                      <div className="community-avatar">🦋</div>
                      <div className="community-text">
                        <div className="community-name">Priya K.</div>
                        <div className="community-action">
                          Donated 500 GE to Amazon Rainforest Alliance 🌍
                        </div>
                        <div className="community-time">2 hr ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div
        className={`shop-overlay ${shopOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeShop()
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Avatar Shop"
      >
        <div className="shop-modal">
          <div className="shop-header">
            <h2>Avatar Shop 🛍</h2>
            <button className="close-btn" type="button" onClick={closeShop} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="shop-balance">
            <div>
              🪙 <strong>{coins.toLocaleString()}</strong> Bloom Coins
            </div>
            <div>
              ⚡ <strong>{greenEnergy.toLocaleString()}</strong> Green Energy
            </div>
          </div>

          <div className="card-title" style={{ marginBottom: 12 }}>
            Accessories for Fern
          </div>
          <div className="shop-grid">
            <button className="shop-item" type="button" onClick={() => buyItem('tiny crown 👑', 200)}>
              <div className="shop-item-icon">👑</div>
              <div className="shop-item-name">Tiny Crown</div>
              <div className="shop-item-cost">🪙 200</div>
            </button>
            <button className="shop-item" type="button" onClick={() => buyItem('cozy scarf 🧣', 150)}>
              <div className="shop-item-icon">🧣</div>
              <div className="shop-item-name">Cozy Scarf</div>
              <div className="shop-item-cost">🪙 150</div>
            </button>
            <button className="shop-item" type="button" onClick={() => buyItem('flower garden 🌸', 300)}>
              <div className="shop-item-icon">🌸</div>
              <div className="shop-item-name">Flower Garden</div>
              <div className="shop-item-cost">🪙 300</div>
            </button>
            <button className="shop-item" type="button" onClick={() => buyItem('starry background ✨', 500)}>
              <div className="shop-item-icon">✨</div>
              <div className="shop-item-name">Starry BG</div>
              <div className="shop-item-cost">🪙 500</div>
            </button>
            <button className="shop-item" type="button" onClick={() => buyItem('green wings 🍃', 0, true)}>
              <div className="shop-item-icon">🍃</div>
              <div className="shop-item-name">Green Wings</div>
              <div className="shop-item-cost">⚡ 100 GE</div>
            </button>
            <button className="shop-item" type="button" onClick={() => buyItem('sun hat ☀️', 250)}>
              <div className="shop-item-icon">☀️</div>
              <div className="shop-item-name">Sun Hat</div>
              <div className="shop-item-cost">🪙 250</div>
            </button>
          </div>
        </div>
      </div>

      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toastMsg ?? ''}</div>
    </>
  )
}
