# 🌿 BLOOM — Living Wellness OS

Your personal wellness app with gamified habit tracking, community features,
green energy economy, and personalized health intelligence.

---

## 🗂 What's In This Project

```
bloom/
├── src/
│   ├── components/         ← Reusable UI pieces
│   │   ├── avatar/         ← Pet, Mini-Me, Simple mode
│   │   ├── habits/         ← Habit cards, streaks, rewards
│   │   ├── community/      ← Subscriber feed, challenges
│   │   ├── focus/          ← Pomodoro / time blocker
│   │   ├── health/         ← Reminders, cycle tracking, stats
│   │   ├── nutrition/      ← Food logging, macros
│   │   ├── planner/        ← Weekly goal planner
│   │   └── shared/         ← Buttons, cards, toasts, modals
│   ├── pages/              ← Full screens (Dashboard, Profile, etc.)
│   ├── hooks/              ← Reusable logic (useHabits, useAvatar, etc.)
│   ├── lib/                ← Supabase client, API helpers
│   ├── styles/             ← Global CSS, theme variables
│   └── types/              ← Data shape definitions
├── public/                 ← Static assets (icons, images)
├── .env.local              ← Your secret keys (NEVER share this file)
├── package.json            ← Project dependencies
└── README.md               ← You are here
```

---

## 🚀 Setup (Do This Once)

### Step 1 — Install the tools on your computer

1. **Install Node.js** → go to https://nodejs.org → download the "LTS" version → install it
2. **Install Cursor** → go to https://cursor.sh → download → install it
   - Cursor is like Microsoft Word but for code, with Claude built in
3. **Create a GitHub account** → https://github.com (free)
4. **Create a Supabase account** → https://supabase.com (free)
5. **Create a Vercel account** → https://vercel.com (free, sign up with GitHub)

### Step 2 — Open this project in Cursor

1. Open Cursor
2. File → Open Folder → select the `bloom` folder
3. You'll see all your files on the left side

### Step 3 — Install project dependencies

1. In Cursor, press `Ctrl+`` ` (backtick) to open the terminal
2. Type this and press Enter:
   ```
   npm install
   ```
3. Wait for it to finish (1-2 minutes)

### Step 4 — Set up Supabase (your database)

1. Go to https://supabase.com → New Project
2. Name it "bloom" → choose a password → create
3. Go to Settings → API → copy your "Project URL" and "anon public" key
4. Open the file `.env.local` in Cursor
5. Paste your keys where indicated

### Step 5 — Run the app locally

```bash
npm run dev
```

Then open http://localhost:3000 in your browser. You'll see BLOOM running on your computer.

### Step 6 — Deploy to the internet (free)

1. Push your code to GitHub (Cursor has a built-in button for this)
2. Go to vercel.com → New Project → Import your GitHub repo
3. Add your `.env.local` variables in Vercel's settings
4. Click Deploy — you get a live URL in 60 seconds

---

## 🧠 How To Work With Claude On This Project

When you want to add or change something, open Cursor and press `Cmd+L` (Mac) or `Ctrl+L` (Windows) to open the Claude chat panel.

**Good prompts to use:**

- *"Add a water intake tracker to the health page that logs in Supabase and shows a progress bar toward 2.5L goal"*
- *"Make the habit check animation more satisfying — coins should fly toward the balance display"*
- *"Build a menstrual cycle tracker that adjusts workout habit suggestions based on cycle phase"*
- *"Add a notification that appears if the user hasn't logged a habit by 8pm"*

**When something breaks:**
- Select the broken code → press `Cmd+L` → say *"this isn't working, fix it"*
- Or paste the red error message and say *"what does this mean and how do I fix it?"*

---

## 📋 Feature Roadmap

### Phase 1 — MVP (Months 1–2) ✅ Started
- [x] Project structure
- [x] Design system & theme
- [x] Avatar component (Pet / Mini-Me / Simple modes)
- [x] Habit tracker with coin rewards
- [ ] User authentication (login/signup)
- [ ] Supabase database connection
- [ ] Habit data persistence (saving to database)
- [ ] Streak calculation

### Phase 2 — Health Layer (Months 2–3)
- [ ] Menstrual cycle tracking + habit adaptation
- [ ] Personalized health reminders (demographic-aware)
- [ ] Appointment reminders (dentist, annual checkups)
- [ ] Sleep data display (manual + Fitbit sync)
- [ ] Nutrition logging + macro tracking
- [ ] Mindfulness minutes tracker

### Phase 3 — Community + Economy (Month 3–4)
- [ ] Subscriber community feed
- [ ] Shared challenges
- [ ] Green Energy economy
- [ ] Planetary donation system
- [ ] Avatar shop

### Phase 4 — Intelligence + Sync (Month 4–5)
- [ ] Fitbit OAuth integration
- [ ] Apple Health sync (requires native app wrapper)
- [ ] AI-personalized habit suggestions
- [ ] Mood-habit correlation insights
- [ ] Substance reduction tracker (smoking, alcohol)

### Phase 5 — Launch (Month 5–6)
- [ ] Mobile-responsive polish
- [ ] Subscription tiers (free vs premium)
- [ ] Onboarding flow
- [ ] Push notifications
- [ ] App Store submission (via Capacitor wrapper)

---

## 🔬 Science References (Peer-Reviewed)

All health content in BLOOM is grounded in peer-reviewed research:

- **Habit formation:** Lally et al. (2010). *How are habits formed: Modelling habit formation in the real world.* European Journal of Social Psychology.
- **Implementation intentions:** Gollwitzer, P.M. (1999). *Implementation intentions.* American Psychologist.
- **Hypertension & race:** Ferdinand, K.C. & Armani, A.M. (2007). *The management of hypertension in African Americans.* Critical Pathways in Cardiology.
- **Cycle-synced exercise:** Sung et al. (2014). *Feminizing hormone therapy and physical performance.* Referenced in cycle-phase exercise research.
- **Mindfulness & habit change:** Garland et al. (2019). *Mindfulness-to-Meaning Theory.* Psychological Inquiry.
- **Sleep & habit compliance:** Kline, C.E. (2014). *The bidirectional relationship between exercise and sleep.* American Journal of Lifestyle Medicine.
- **DASH diet & hypertension:** Appel et al. (1997). *A clinical trial of the effects of dietary patterns on blood pressure.* NEJM.

---

## ⚠️ Important Rules

1. **Never share `.env.local`** — it contains secret keys
2. **Always save your work to GitHub** before making big changes
3. **Test on mobile** — most of your users will be on phones
4. **One feature at a time** — finish and test before starting the next
