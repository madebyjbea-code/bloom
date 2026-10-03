// One-time patch: hides the calendar/scheduling feature unless
// NEXT_PUBLIC_ENABLE_SCHEDULING=true is set in Vercel.
// Run from the bloom folder:   node scripts/scheduling-flag.js
// Safe to run twice — it skips anything already done and only saves
// if every step either applied or was already there.

const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'components', 'Dashboard.jsx');
let src = fs.readFileSync(file, 'utf8');

const steps = [
  {
    name: 'add the on/off switch',
    done: "const SCHEDULING_ENABLED =",
    find: "import DailySchedulingPrompt from './DailySchedulingPrompt';",
    replace: "import DailySchedulingPrompt from './DailySchedulingPrompt';\n// Calendar & scheduling is hidden unless NEXT_PUBLIC_ENABLE_SCHEDULING=true (set it for Preview in Vercel)\nconst SCHEDULING_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SCHEDULING === 'true';",
  },
  {
    name: 'hide Planner in the More menu',
    done: "...(SCHEDULING_ENABLED ? [{ key: 'planner'",
    find: "    { key: 'planner',   icon: '📅', label: 'Planner' },",
    replace: "    ...(SCHEDULING_ENABLED ? [{ key: 'planner',   icon: '📅', label: 'Planner' }] : []),",
  },
  {
    name: "send 'More' to Community when Planner is hidden",
    done: "setTab(SCHEDULING_ENABLED ? 'planner' : 'community')",
    find: "if(n.key==='more'){ setTab('planner'); return; }",
    replace: "if(n.key==='more'){ setTab(SCHEDULING_ENABLED ? 'planner' : 'community'); return; }",
  },
  {
    name: "hide today's plan on Home",
    done: "{SCHEDULING_ENABLED && <DailySchedulingPrompt",
    find: "<DailySchedulingPrompt userId={userId} habits={allHabits} routines={routineList} chronotype={chronotype} />",
    replace: "{SCHEDULING_ENABLED && <DailySchedulingPrompt userId={userId} habits={allHabits} routines={routineList} chronotype={chronotype} />}",
  },
  {
    name: 'block the Planner tab',
    done: "SCHEDULING_ENABLED && <TabPlanner/>",
    find: "{tab==='planner'    && <TabPlanner/>}",
    replace: "{tab==='planner' && SCHEDULING_ENABLED && <TabPlanner/>}",
  },
  {
    name: 'health details on the Companion page',
    done: "onHealthDetails={()=>setHealthInfoOpen(true)}",
    find: "onNavigate={(t)=>setTab(t)}/>}",
    replace: "onNavigate={(t)=>setTab(t)} onHealthDetails={()=>setHealthInfoOpen(true)}/>}",
  },
];

let ok = true;
for (const s of steps) {
  if (src.includes(s.done)) { console.log(`✓ already done: ${s.name}`); continue; }
  if (!src.includes(s.find)) { console.log(`✗ couldn't find the spot to ${s.name}`); ok = false; continue; }
  src = src.replace(s.find, s.replace);
  console.log(`✓ ${s.name}`);
}
if (!ok) { console.log('\nNothing saved — paste this output to Claude.'); process.exit(1); }
fs.writeFileSync(file, src);
console.log('\nSaved src/components/Dashboard.jsx');
