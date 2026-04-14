'use client';

import { useState } from 'react';
import { useStore } from '../lib/store';

// ─── ARCHETYPE PROGRAM DATA ───────────────────────────────────────────────────
const ARCHETYPE_PROGRAMS = {
  burnout: {
    programTitle: 'Rest &',
    programTitleItalic: 'Rise',
    programDesc: 'A 4-week nervous system restoration program that prioritises sleep, breathwork, and nourishment before any intensity. Built for someone who needs to refill before they can pour.',
    color: '#7a6e9e',
    pillars: [
      { icon: '😴', name: 'Sleep Architecture', habit: 'Phone off at 9:30 PM', why: 'Cortisol dysregulation from chronic stress disrupts sleep. Re-anchoring your sleep timing is the single highest-leverage reset.', science: 'Walker (2017): consistent sleep timing reduces cortisol variance and improves mood stability within 14 days.' },
      { icon: '🫁', name: 'Nervous System Reset', habit: '5-min box breathing after lunch + before bed', why: 'Box breathing directly activates the vagal nerve — your body\'s parasympathetic brake. Two daily sessions begin down-regulating your chronic stress response.', science: 'Zaccaro et al. (2018): slow-paced breathing activates vagal tone; effects measurable within a single session.' },
      { icon: '🥗', name: 'Cortisol Nutrition', habit: 'Protein + fat breakfast within 90 min of waking', why: 'Skipping breakfast elevates cortisol further. Protein and fat stabilise blood glucose and blunt the morning cortisol spike.', science: 'Farshchi et al. (2005): regular breakfast improved insulin sensitivity and reduced cortisol response in fatigued individuals.' },
      { icon: '🚶', name: 'Gentle Movement', habit: 'Daily outdoor walk (10 min)', why: 'Even 10 minutes of outdoor walking reduces cortisol measurably. Nature exposure reduces rumination — the thought pattern most associated with burnout.', science: 'Bratman et al. (2015): nature walks reduce rumination and subgenual prefrontal cortex activity.' },
      { icon: '📖', name: 'Mindful Anchor', habit: '2-min evening gratitude log', why: 'Gratitude practice before sleep reduces pre-sleep cognitive arousal — the racing thoughts that keep burnt-out people awake.', science: 'Digdon & Koble (2011): gratitude journalling significantly improved sleep quality and reduced sleep latency.' },
      { icon: '🌱', name: 'Plant Reset', habit: 'One plant-based meal daily', why: 'Gut microbiome diversity directly impacts mood and stress resilience via the gut-brain axis.', science: 'Sonnenburg & Sonnenburg (2021): dietary fibre diversity reduces systemic inflammation markers in 4 weeks.' },
    ],
  },
  nightowl: {
    programTitle: 'Night Bloom',
    programTitleItalic: 'Spring',
    programDesc: 'A late-shifted circadian support program. Rather than forcing early mornings, this anchors your rhythm at the right phase and helps your peak energy emerge — on your schedule.',
    color: '#5a6e8a',
    pillars: [
      { icon: '🌅', name: 'Light Anchor', habit: '15 min outdoor light within 60 min of waking', why: 'Morning light is the strongest circadian signal. Even for late types, consistent light exposure gradually advances the circadian phase.', science: 'Leproult et al. (1997): morning bright light advances the circadian phase in delayed sleep phase types within 7 days.' },
      { icon: '🏃', name: 'Afternoon Movement', habit: '20-min movement between 2–5 PM', why: 'Your alertness peaks in the afternoon. Scheduling movement here aligns exercise with your natural cortisol and temperature rise.', science: 'Atkinson et al. (2008): afternoon exercise improves performance more for evening types than morning exercise.' },
      { icon: '🥗', name: 'Aligned Eating', habit: 'Delay first meal to match your natural hunger cue', why: 'Wolf types often have poor appetite in the morning. Aligning eating with hunger is more metabolically optimal than forcing early breakfast.', science: 'Sutton et al. (2018): time-restricted eating aligned with circadian biology improved metabolic markers in 5 weeks.' },
      { icon: '📵', name: 'Evening Wind-Down', habit: 'Blue light off 90 min before sleep', why: 'Wolves produce melatonin later than average. Blue light suppression prevents melatonin delay from compounding.', science: 'Chang et al. (2015): evening screen use significantly delayed melatonin onset and reduced REM sleep.' },
      { icon: '🌱', name: 'Plant Diversity', habit: '5 different plants daily', why: 'Gut microbiome diversity has been linked to mood stability and reduced fatigue — both challenges for social jet lag sufferers.', science: 'Sonnenburg & Sonnenburg (2021): dietary fibre diversity increases microbiome diversity in 4 weeks.' },
      { icon: '📝', name: 'Evening Intention', habit: 'Evening planning ritual (10 min)', why: 'Wolf types have sharper cognitive clarity in the evening. A brief planning session leverages your peak to design the next day.', science: 'Gollwitzer (1999): implementation intentions formed during high-clarity periods significantly improve follow-through.' },
    ],
  },
  optimizer: {
    programTitle: 'Sharpen &',
    programTitleItalic: 'Flourish',
    programDesc: 'A 4-week optimisation protocol for someone with established habits who wants to identify and close the specific gaps holding back their energy ceiling.',
    color: '#5a8a6a',
    pillars: [
      { icon: '🌅', name: 'Pre-Dawn Anchor', habit: 'Sunrise walk within 30 min of waking', why: 'Anchoring light exposure immediately sharpens your cortisol awakening response and advances your peak cognitive window.', science: 'Huberman (2022): morning sunlight within 30–60 min optimises the cortisol awakening response for early risers.' },
      { icon: '🥗', name: 'Precision Nutrition', habit: 'Protein 30g at breakfast + plant diversity', why: 'Optimisers often nail routine but neglect micronutrient variety. Maximising plant diversity closes the gap between good and great energy.', science: 'Paddon-Jones et al. (2015): 30g+ protein per meal maximises muscle protein synthesis compared to backloading.' },
      { icon: '🏋️', name: 'Strength Signal', habit: '2x/week strength training at peak energy', why: 'Resistance training at your natural energy peak maximises hormonal response and adaptation.', science: 'Schoenfeld et al. (2016): resistance training at peak circadian phase produced greater strength gains.' },
      { icon: '🧘', name: 'Recovery Protocol', habit: 'NSDR or Yoga Nidra (20 min) post-workout', why: 'Optimisers often neglect recovery. Non-sleep deep rest accelerates adaptation and prevents the plateau from under-recovering.', science: 'Wamsley & Stickgold (2011): rest periods following learning accelerate memory and motor consolidation.' },
      { icon: '🌿', name: 'Gut Diversity Upgrade', habit: '30 different plant species per week', why: 'High performers often eat protein-rich but microbiome-poor diets. The 30-plant target dramatically shifts gut diversity.', science: 'McDonald et al. (2018, American Gut Project): 30+ plant species/week correlated with significantly more diverse microbiomes.' },
      { icon: '📊', name: 'Weekly Reflection', habit: '10-min weekly habit audit', why: 'Systematic self-reflection is the difference between a plateau and a compound curve.', science: 'Ellis et al. (2014): structured reflection on goal progress significantly improved subsequent performance.' },
    ],
  },
  scattered: {
    programTitle: 'Ground &',
    programTitleItalic: 'Gather',
    programDesc: 'A 4-week rhythm anchoring program for variable schedules and irregular sleep. Built around the minimum viable anchors that create consistency even when life is chaotic.',
    color: '#8a7a5a',
    pillars: [
      { icon: '⏰', name: 'Anchor Points', habit: 'Fixed wake time (same every day)', why: 'Dolphin types need external anchors because internal ones are unreliable. A fixed wake time is the single highest-leverage circadian reset.', science: 'Phillips et al. (2019): consistent wake times improve alertness and circadian biomarkers faster than consistent bedtimes.' },
      { icon: '💧', name: 'Morning Signal', habit: 'Water before coffee', why: 'A simple, achievable morning anchor that signals the body to begin waking without caffeine dependency.', science: 'Benton & Young (2015): mild morning dehydration impairs mood and concentration — reversed rapidly with rehydration.' },
      { icon: '🥗', name: 'Minimum Viable Nutrition', habit: 'Protein + veg at two meals daily', why: 'Scattered types often eat reactively. This simple framework replaces planning with a 2-question decision.', science: 'Leidy et al. (2015): higher protein at meals reduced appetite dysregulation and improved satiety signals.' },
      { icon: '🤸', name: 'Micro Movement', habit: '3x 5-min movement snacks daily', why: 'Long workouts become an obstacle for scattered schedules. Three 5-minute movement snacks accumulate equivalent metabolic benefit.', science: 'Francois et al. (2014): exercise snacks interrupted sedentary time more effectively for blood glucose than a single continuous bout.' },
      { icon: '🫁', name: 'Grounding Practice', habit: 'Box breathing before sleep', why: 'Irregular rhythms keep the nervous system in anticipatory stress. A pre-sleep practice down-regulates the default mode network.', science: 'Zaccaro et al. (2018): slow-paced breathing reduces pre-sleep hyperarousal within single sessions.' },
      { icon: '📖', name: 'Evening Offload', habit: 'Brain dump — 3 things written before sleep', why: 'Dolphin sleep is disrupted by unprocessed thoughts. Writing a brief to-do list closes open mental loops.', science: 'Scullin et al. (2018): writing a to-do list before bed significantly reduced time to fall asleep.' },
    ],
  },
  nurturer: {
    programTitle: 'Nourish &',
    programTitleItalic: 'Bloom',
    programDesc: 'A 4-week program centred on the gut-brain axis and emotional eating patterns. Built to add pleasure and satisfaction, not restriction.',
    color: '#8a5a6a',
    pillars: [
      { icon: '🧠', name: 'Gut-Brain Axis', habit: 'Daily probiotic-rich food + prebiotic fibre', why: 'The gut produces 90% of the body\'s serotonin. Improving gut diversity directly improves mood baseline.', science: 'Jacka et al. (2017): dietary improvements significantly reduced depression scores — effect mediated by gut microbiome changes.' },
      { icon: '🥗', name: 'Pleasure-First Nourishment', habit: 'Build meals around one food you genuinely love', why: 'Restrictive thinking triggers the reward-deprivation cycle that drives emotional eating. Pleasure-anchored meals satisfy genuinely.', science: 'Van Strien et al. (2012): dietary restraint predicted increased emotional eating; flexible control was associated with lower scores.' },
      { icon: '🫁', name: 'Pre-Craving Breathwork', habit: '4-7-8 breathing when a craving hits', why: 'Most cravings peak and pass in 10 minutes. A breathing protocol interrupts the impulse-to-action loop.', science: 'Garland et al. (2011): mindfulness interventions targeting craving response significantly reduced food cravings.' },
      { icon: '😴', name: 'Sleep for Appetite', habit: 'Prioritise 7+ hours — non-negotiable bedtime', why: 'A single night of poor sleep raises ghrelin (hunger) and reduces leptin (satiety), dramatically increasing next-day cravings.', science: 'Spiegel et al. (2004): sleep restriction increased ghrelin by 28% and decreased leptin by 18%.' },
      { icon: '🍽', name: 'Mindful Eating', habit: 'One meal per day without screen distraction', why: 'Distracted eating reduces satiety signal detection by up to 30%, leading to larger portions and post-meal dissatisfaction.', science: 'Higgs & Woodward (2009): eating while distracted increased food intake and reduced meal memory.' },
      { icon: '🌸', name: 'Self-Compassion', habit: 'Morning 2-min self-compassion intention', why: 'Shame around eating paradoxically increases binge-restrict cycling. Self-compassion reduces emotional eating more than willpower training.', science: 'Adams & Leary (2007): self-compassion interventions significantly reduced guilt-driven overeating.' },
    ],
  },
  rebuilder: {
    programTitle: 'Seeds &',
    programTitleItalic: 'Roots',
    programDesc: 'A 4-week foundation program designed for busy, time-constrained people. Habits max at 15 minutes each. Consistency at low intensity beats intensity that never happens.',
    color: '#6a8a5a',
    pillars: [
      { icon: '💧', name: 'Morning Anchor', habit: 'Full glass of water before anything else', why: 'Even mild dehydration reduces cognitive performance and increases fatigue. This one habit requires zero time.', science: 'Armstrong et al. (2012): mild dehydration impaired cognitive performance and mood — reversed rapidly with rehydration.' },
      { icon: '🚶', name: 'Movement Minimum', habit: '10-min walk daily — any time, any pace', why: 'The greatest fitness gains come from the first 10 minutes of daily movement for sedentary individuals.', science: 'Warburton et al. (2006): even low-intensity short exercise produced significant health benefit for previously sedentary people.' },
      { icon: '🥦', name: 'One Vegetable Rule', habit: 'One vegetable at every meal', why: 'Adding one plant to every meal is the minimum dose for gut diversity benefit. Achievable even with grab-and-go eating.', science: 'Sonnenburg & Sonnenburg (2021): small increases in dietary fibre diversity measurably shift microbiome composition in 2–3 weeks.' },
      { icon: '😴', name: 'Sleep Floor', habit: 'Protect 7 hours — set a phone bedtime alarm', why: 'Sleep is the master lever for energy. Protecting a sleep floor has more ROI than any new morning habit.', science: 'Walker (2017): adults regularly sleeping under 7 hours showed impaired cognitive function and metabolic health.' },
      { icon: '🫁', name: 'Micro Mindfulness', habit: '3 conscious breaths before meals', why: 'A 30-second pre-meal pause activates the parasympathetic system, improving digestion and reducing stress-driven eating.', science: 'Rosenzweig et al. (2010): brief mindfulness practices reduced cortisol-driven appetite in time-constrained adults.' },
      { icon: '🌿', name: 'Green Energy Habit', habit: 'One reusable or sustainable swap per week', why: 'Small environmental choices reinforce your identity as someone who cares for themselves and their world.', science: 'Verplanken & Roy (2016): pro-environmental habits correlate with higher life satisfaction and self-regulatory capacity.' },
    ],
  },
  slowstarter: {
    programTitle: 'Slow Rise,',
    programTitleItalic: 'Full Bloom',
    programDesc: 'A 4-week morning rhythm program designed for people who need a gentle on-ramp. No 5 AM workouts — just a graceful, effective ascent into the day.',
    color: '#8a7a4a',
    pillars: [
      { icon: '💧', name: 'Hydration Ramp', habit: 'Electrolyte water immediately on waking', why: 'Cortisol is naturally lowest on waking. Electrolytes and water signal the body to begin its ascent without a harsh caffeine spike.', science: 'Benton & Young (2015): morning dehydration significantly impairs mood and concentration — reversed rapidly.' },
      { icon: '🌅', name: 'Light First, Coffee Second', habit: '10 min outside before first coffee', why: 'Morning light suppresses residual melatonin and advances the cortisol awakening response. Caffeine masks but does not fix the slow ramp.', science: 'Cajochen (2007): morning bright light is more effective than caffeine for improving subjective alertness.' },
      { icon: '🥗', name: 'Nourishing First Meal', habit: 'Protein breakfast 60–90 min after waking', why: 'Delaying breakfast until hunger is present, then leading with protein, stabilises glucose and prevents the mid-morning crash.', science: 'Leidy et al. (2013): high-protein breakfast reduced appetite, ghrelin, and evening snacking.' },
      { icon: '🏃', name: 'Peak-Time Movement', habit: 'Schedule movement for your energy window', why: 'Trying to exercise during your body\'s ramp-up period is demoralising. Shifting to your 10 AM–12 PM window aligns effort with biology.', science: 'Atkinson et al. (2008): exercise performance improved when timed to individual circadian peak.' },
      { icon: '🧘', name: 'Midday Reset', habit: '5-min breathwork or stretch after lunch', why: 'For slow starters, the post-lunch dip can be dramatic. A brief reset preserves afternoon energy.', science: 'Zaccaro et al. (2018): slow-paced breathing activates vagal tone within a single 5-minute session.' },
      { icon: '📝', name: 'Evening Intention', habit: '3-minute tomorrow plan before sleep', why: 'Pre-deciding what the first 30 minutes look like dramatically reduces morning decision fatigue.', science: 'Gollwitzer (1999): if-then implementation intentions more than doubled follow-through rates versus goal intentions alone.' },
    ],
  },
  steadybuilder: {
    programTitle: 'Rise &',
    programTitleItalic: 'Regenerate',
    programDesc: 'A 4-week morning rhythm protocol built for consistent, building-phase wellness. Each week layers one new habit to help your energy compound without overwhelm.',
    color: '#5a7a5a',
    pillars: [
      { icon: '😴', name: 'Sleep Anchor', habit: 'Consistent 10:30 PM wind-down ritual', why: 'Bears have the most consistent sleep architecture of all chronotypes — but still need a clear wind-down cue. Consistent timing locks in circadian consistency.', science: 'Walker (2017): consistent sleep-wake timing reduces cortisol variance and improves mood stability within 2 weeks.' },
      { icon: '🚶', name: 'Morning Movement', habit: '10-min walk within 1hr of waking', why: 'Morning light exposure combined with gentle movement suppresses residual melatonin and sharpens your mid-morning peak.', science: 'Huberman (2022): morning sunlight within 30–60 min optimises cortisol awakening response and alertness.' },
      { icon: '🥗', name: 'Protein-First Breakfast', habit: '30g protein within 90 min of waking', why: 'Bears have reliable hunger cues. A protein-anchored breakfast stabilises blood glucose and prevents the 2 PM slump.', science: 'Sutton et al. (2018): time-aligned first meal with protein improved energy stability throughout the day.' },
      { icon: '🧘', name: 'Midday Reset', habit: '5-min breathwork after lunch', why: 'Post-lunch dip is your chronotype\'s most predictable challenge. A brief reset prevents it from becoming an unproductive afternoon.', science: 'Zaccaro et al. (2018): slow-paced breathing activates the vagal system, reducing afternoon fatigue within one session.' },
      { icon: '🌿', name: 'Plant Diversity', habit: 'One plant-based meal daily', why: 'Spring is optimal for shifting gut microbiome diversity. Plant diversity is the single strongest predictor of gut health.', science: 'Sonnenburg & Sonnenburg (2021): dietary fibre diversity increases microbiome diversity and reduces inflammation in 4 weeks.' },
      { icon: '🌸', name: 'Evening Intention', habit: '2-min gratitude log before sleep', why: 'Gratitude journalling buffers the negativity bias and reduces pre-sleep cognitive arousal.', science: 'Emmons & McCullough (2003): weekly gratitude writing increased wellbeing and energy levels across multiple studies.' },
    ],
  },
};

const PILLAR_COLORS = [
  '#7a9e7e', '#c4a882', '#7a9e7e', '#8a7a9e', '#c4a882', '#9e8a7a',
];

export default function ProgramReveal({ onAccept }) {
  const [showBrowse, setShowBrowse] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null); // null = your archetype plan
  const [customising, setCustomising] = useState(null); // which chip is active
  const archetypeKey = useStore(s => s.archetypeKey) || 'steadybuilder';
  const archetypeName = useStore(s => s.archetypeName) || 'The Steady Builder';
  const archetypeIcon = useStore(s => s.archetypeIcon) || '🌿';
  const name = useStore(s => s.name) || '';
  const chronotype = useStore(s => s.chronotype) || 'bear';

  const program = ARCHETYPE_PROGRAMS[archetypeKey] || ARCHETYPE_PROGRAMS.steadybuilder;
  const accentColor = program.color;

  const chronoLabels = {
    lion: '🦁 Lion chronotype',
    bear: '🐻 Bear chronotype',
    wolf: '🐺 Wolf chronotype',
    dolphin: '🐬 Dolphin chronotype',
  };

  const CHIPS = [
    { key: 'reminders', label: '⏰ Set reminders', tip: 'Reminder times can be adjusted in your Profile settings after you start.' },
    { key: 'duration', label: '⏱ Adjust durations', tip: 'Habit durations can be customised in your Profile settings.' },
    { key: 'start', label: '📅 Choose start date', tip: 'Your program starts today by default. Change it in Profile → Program Settings.' },
    { key: 'swap', label: '🔄 Swap a pillar', tip: 'You can swap any pillar from your Dashboard once you start.' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3ed', overflowX: 'hidden' }}>

      {/* HEADER */}
      <div style={{ background: '#1a1a16', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#b5ceb5', letterSpacing: 3, textTransform: 'uppercase' }}>BLOOM</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(122,158,126,0.15)', border: '1px solid rgba(122,158,126,0.3)', borderRadius: 99, padding: '6px 16px', fontSize: 12, color: '#b5ceb5', fontWeight: 600 }}>
          {archetypeIcon} {archetypeName} · {chronoLabels[chronotype] || 'Bear chronotype'}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#8aad8a', marginBottom: 12 }}>
            Your personalised spring reset
          </div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a16', marginBottom: 14 }}>
            {program.programTitle}{' '}
            <em style={{ color: accentColor, fontStyle: 'italic' }}>{program.programTitleItalic}</em>
          </h1>
          <p style={{ fontSize: 16, color: '#888', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            {program.programDesc}
          </p>
        </div>

        {/* PILLARS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 36 }}>
          {program.pillars.map((pillar, i) => (
            <div
              key={i}
              style={{
                background: 'white',
                border: '1.5px solid #e8e4de',
                borderRadius: 20,
                padding: 22,
                borderTop: `3px solid ${PILLAR_COLORS[i] || '#8aad8a'}`,
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 10 }}>{pillar.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, color: '#2a2a2a' }}>
                {pillar.name}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a', marginBottom: 8, lineHeight: 1.4 }}>
                {pillar.habit}
              </div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.55, marginBottom: 10 }}>
                {pillar.why}
              </div>
              <div style={{ background: '#f3f8f3', border: '1px solid #b5ceb5', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#5a7a5a', lineHeight: 1.5 }}>
                🔬 {pillar.science}
              </div>
            </div>
          ))}
        </div>

        {/* CUSTOMISE ROW */}
        <div style={{ background: 'white', border: '1.5px solid #e8e4de', borderRadius: 20, padding: '22px 26px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: 14 }}>
            Customise your plan
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: customising ? 16 : 0 }}>
            {CHIPS.map(chip => (
              <div
                key={chip.key}
                onClick={() => setCustomising(customising === chip.key ? null : chip.key)}
                style={{
                  border: `1.5px solid ${customising === chip.key ? '#8aad8a' : '#e8e4de'}`,
                  background: customising === chip.key ? '#f3f8f3' : 'white',
                  color: customising === chip.key ? '#5a7a5a' : '#2a2a2a',
                  borderRadius: 99,
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {chip.label}
              </div>
            ))}
          </div>
          {customising && (
            <div style={{ background: '#f3f8f3', border: '1px solid #b5ceb5', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#5a7a5a', marginTop: 8 }}>
              💡 {CHIPS.find(c => c.key === customising)?.tip}
            </div>
          )}
        </div>

        {/* CTA ROW */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
          <button
            onClick={onAccept}
            style={{ background: '#1a1a16', color: 'white', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', flex: 1, minWidth: 200 }}
          >
            Accept this plan &amp; start →
          </button>
          <button
            onClick={() => setShowBrowse(!showBrowse)}
            style={{ background: 'transparent', color: '#2a2a2a', border: '1.5px solid #e8e4de', borderRadius: 14, padding: '14px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
          >
            {showBrowse ? 'Hide other programs ↑' : 'Browse other programs ↓'}
          </button>
        </div>

        {/* BROWSE OTHER PROGRAMS */}
        {showBrowse && (
          <div>
            <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, marginBottom: 8, color: '#1a1a16' }}>
              All 8 Spring programs
            </h3>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.6 }}>
              Every archetype gets a genuinely different plan — different pillars, different science, different timing. Tap any to preview it.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 32 }}>
              {Object.entries(ARCHETYPE_PROGRAMS).map(([key, p]) => {
                const isYours = key === archetypeKey;
                const [previewKey, setPreviewKey] = [null, () => {}]; // local state handled below
                return (
                  <ArchetypePreviewCard
                    key={key}
                    archetypeKey={key}
                    program={p}
                    isYours={isYours}
                    onAccept={onAccept}
                  />
                );
              })}
            </div>

            <button
              onClick={onAccept}
              style={{ width: '100%', background: '#1a1a16', color: 'white', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              Continue with my plan →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Archetype preview card with expand/collapse ──────────────────────────────
function ArchetypePreviewCard({ archetypeKey, program, isYours, onAccept }) {
  const [expanded, setExpanded] = useState(false);

  const ARCHETYPE_LABELS = {
    burnout:      { name: 'The Burnt-Out Rebuilder', icon: '🌿', chrono: 'Dolphin' },
    nightowl:     { name: 'The Night Owl',           icon: '🌙', chrono: 'Wolf' },
    optimizer:    { name: 'The Optimizer',            icon: '⚡', chrono: 'Lion' },
    scattered:    { name: 'The Scattered Spark',      icon: '✨', chrono: 'Dolphin' },
    nurturer:     { name: 'The Nourishment Seeker',   icon: '🌸', chrono: 'Bear' },
    rebuilder:    { name: 'The Steady Rebuilder',     icon: '🌱', chrono: 'Bear' },
    slowstarter:  { name: 'The Slow Starter',         icon: '🌅', chrono: 'Bear' },
    steadybuilder:{ name: 'The Steady Builder',       icon: '🏗',  chrono: 'Bear' },
  };

  const label = ARCHETYPE_LABELS[archetypeKey] || { name: archetypeKey, icon: '🌿', chrono: 'Bear' };

  return (
    <div style={{
      border: `${isYours ? '2px' : '1.5px'} solid ${isYours ? '#8aad8a' : '#e8e4de'}`,
      background: isYours ? '#f3f8f3' : 'white',
      borderRadius: 16,
      padding: 18,
      transition: 'all 0.2s',
      borderTop: `3px solid ${program.color}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          {isYours && (
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8aad8a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>✓ Your Plan</div>
          )}
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#1a1a16', marginBottom: 2 }}>
            {program.programTitle} {program.programTitleItalic}
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>{label.icon} {label.name}</div>
        </div>
        <div style={{ fontSize: 11, color: '#aaa', flexShrink: 0, marginLeft: 8 }}>🕐 {label.chrono}</div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.55, marginBottom: 12 }}>
        {program.programDesc.slice(0, 100)}...
      </div>

      {/* Pillar names — always visible */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {program.pillars.map((pillar, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#555' }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{pillar.icon}</span>
            <span style={{ fontWeight: 500 }}>{pillar.name}</span>
          </div>
        ))}
      </div>

      {/* Expand to see habits + science */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '7px 0', background: 'transparent', border: `1px solid ${program.color}44`, borderRadius: 8, fontSize: 12, color: program.color, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', marginBottom: expanded ? 12 : 0 }}
      >
        {expanded ? 'Hide detail ↑' : 'See habits & science ↓'}
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {program.pillars.map((pillar, i) => (
            <div key={i} style={{ background: '#f7f3ed', borderRadius: 10, padding: '10px 12px', borderLeft: `3px solid ${program.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2a2a2a', marginBottom: 3 }}>{pillar.icon} {pillar.name}</div>
              <div style={{ fontSize: 12, color: '#5a7a5a', fontWeight: 500, marginBottom: 4 }}>{pillar.habit}</div>
              <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>🔬 {pillar.science}</div>
            </div>
          ))}
        </div>
      )}

      {!isYours && (
        <div style={{ marginTop: 12, fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 1.5 }}>
          Your quiz results determined your archetype. Retake the quiz from Settings to change your plan.
        </div>
      )}
    </div>
  );
}
