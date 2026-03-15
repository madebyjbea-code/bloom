# 🤝 How to Build BLOOM with Claude

This guide is written for you — the founder — not a developer.
It explains exactly how to talk to Claude (in Cursor) to add new features.

---

## The Golden Rule

**Never say "make it better."**
Always say *exactly* what you want, where it goes, and what it should do.

---

## How to Open Claude in Cursor

1. Open Cursor
2. Press `Cmd+L` (Mac) or `Ctrl+L` (Windows)
3. The Claude panel opens on the right
4. Type your request, hit Enter

---

## Prompt Templates (Copy & Adapt These)

### Adding a new feature
```
I want to add [FEATURE NAME] to BLOOM.

It should:
- [What it does, step by step]
- [Where it appears — which page/component]
- [What happens when the user interacts with it]
- [What gets saved to the database, if anything]

The relevant files are probably:
- src/components/[folder]/
- src/lib/supabase.ts (if it saves data)

Please build this and explain what you changed.
```

### Fixing something broken
```
This isn't working correctly:
[Paste the error message OR describe what's wrong]

Here's the relevant code:
[Select the broken code, then drag it into the chat]

Please fix it and explain what was wrong.
```

### Changing how something looks
```
I want to change the appearance of [COMPONENT NAME].

Currently it looks like [describe].
I want it to look like [describe].

The file is at src/components/[path].

Please update the styling.
```

### Adding a database table
```
I need to store [TYPE OF DATA] in the database.

Each record should have:
- [field name]: [what it is]
- [field name]: [what it is]

Please:
1. Add the SQL to src/lib/schema.sql
2. Add the TypeScript type to src/types/index.ts
3. Add helper functions to src/lib/supabase.ts
```

---

## Feature Request Log

Use this section to track what you want to build next.
Check things off as they're done.

### 🔴 Priority 1 (Build First)
- [ ] User signup and login page
- [ ] Onboarding flow (set habits, choose avatar, fill health profile)
- [ ] Habit data saving to Supabase (right now it only saves locally)
- [ ] Streak calculation logic

### 🟡 Priority 2
- [ ] Menstrual cycle log UI component
- [ ] Health reminders page
- [ ] Demographic profile setup (drives personalized reminders)
- [ ] Nutrition log form
- [ ] Sleep log (manual entry)
- [ ] Weekly planner with drag-and-drop

### 🟢 Priority 3
- [ ] Community feed (read posts from other users)
- [ ] Create community post
- [ ] Green Energy donation flow (with org selection)
- [ ] Avatar shop with purchase confirmation
- [ ] Fitbit OAuth connection

### 🔵 Later
- [ ] Push notifications
- [ ] Subscription/paywall
- [ ] Mobile app wrapper (Capacitor)
- [ ] Fitbit real-time sync
- [ ] AI habit suggestions based on patterns

---

## Understanding Your File Structure

When Claude says "edit this file," here's a map:

| If it's about... | Look in... |
|---|---|
| How something looks | `src/components/[name]/` |
| Saving/reading data | `src/lib/supabase.ts` |
| Database tables | `src/lib/schema.sql` |
| Health reminders logic | `src/lib/healthIntelligence.ts` |
| Global app data (coins, etc.) | `src/lib/store.ts` |
| Data shapes/definitions | `src/types/index.ts` |
| Full pages | `src/pages/` |

---

## When Something Goes Wrong

1. **Copy the full error message** (the red text in the terminal or browser)
2. Open Claude in Cursor (`Cmd+L`)
3. Paste the error and say: *"I got this error. What does it mean and how do I fix it?"*
4. Claude will explain it in plain English and fix it

**The most common errors and what they mean:**

- `Cannot find module` → You're importing a file that doesn't exist yet. Ask Claude to create it.
- `is not a function` → You're calling something wrong. Paste the error to Claude.
- `undefined is not an object` → Data isn't loaded yet when you're trying to use it.
- `401 Unauthorized` → Your Supabase keys in `.env.local` are wrong or missing.
- `CORS error` → Usually a Supabase setup issue — paste to Claude.

---

## Saving Your Work to GitHub

Do this every time you finish adding a feature:

1. In Cursor, look at the left sidebar — click the branch icon (looks like a fork)
2. You'll see a list of changed files
3. Type a short message describing what you did (e.g. "Add menstrual cycle tracker")
4. Click "Commit & Push"

That's it. Your work is saved forever and can never be lost.

---

## Getting Help Beyond Claude

- **BLOOM questions** → Ask Claude right here in this chat
- **Supabase issues** → https://supabase.com/docs (excellent docs)
- **Next.js questions** → https://nextjs.org/docs
- **Community help** → https://www.reddit.com/r/nocode (welcoming to beginners)
- **Video walkthroughs** → Search "Next.js Supabase tutorial" on YouTube
