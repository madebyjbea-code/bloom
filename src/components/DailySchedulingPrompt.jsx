'use client';

// Home screen: today's time-blocked plan (calendar + Bloom blocks) with "Add to day".
// Kept as its own file so Dashboard's existing import keeps working.

import DayPlanner from './DayPlanner';
import { localDateStr } from '../lib/scheduleStorage';

export default function DailySchedulingPrompt({ userId, habits = [], routines = [], chronotype = 'bear' }) {
  return (
    <DayPlanner
      variant="home"
      userId={userId}
      date={localDateStr()}
      habits={habits}
      routines={routines}
      chronotype={chronotype}
    />
  );
}
