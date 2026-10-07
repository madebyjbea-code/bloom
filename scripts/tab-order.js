// One-time patch: puts Nourish in the main sidebar and moves Courses into "More".
// Run from the bloom folder:   node scripts/tab-order.js
// Safe to run twice.

const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'components', 'Dashboard.jsx');
let src = fs.readFileSync(file, 'utf8');

const SIDEBAR_COURSES = "  { key: 'courses',   icon: '📚', label: 'Courses' },";
const SIDEBAR_NOURISH = "  { key: 'nourish',   icon: '🥗', label: 'Nourish' },";
const MORE_NOURISH    = "    { key: 'nourish',   icon: '🥗', label: 'Nourish' },";
const MORE_COURSES    = "    { key: 'courses',   icon: '📚', label: 'Courses' },";

const navStart = src.indexOf('const NAV = [');
const groupsStart = src.indexOf('const GROUPS = {');
if (navStart < 0 || groupsStart < 0) { console.log('✗ couldn\'t find the menu lists — nothing saved, paste this to Claude.'); process.exit(1); }

let nav = src.slice(navStart, groupsStart);
let rest = src.slice(groupsStart);

if (nav.includes("key: 'nourish'") && rest.includes(MORE_COURSES)) {
  console.log('✓ already done — Nourish is in the sidebar, Courses is under More');
  process.exit(0);
}
if (!nav.includes(SIDEBAR_COURSES) || !rest.includes(MORE_NOURISH)) {
  console.log('✗ the menu lines look different than expected — nothing saved, paste this to Claude.');
  process.exit(1);
}
nav = nav.replace(SIDEBAR_COURSES, SIDEBAR_NOURISH);
rest = rest.replace(MORE_NOURISH, MORE_COURSES);
fs.writeFileSync(file, src.slice(0, navStart) + nav + rest);
console.log('✓ Nourish moved to the sidebar (where Courses was)');
console.log('✓ Courses moved under More (where Nourish was)');
console.log('\nSaved src/components/Dashboard.jsx');
