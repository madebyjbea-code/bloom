import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getHabitsForUser } from '../lib/springProgram';
import { useStore } from '../lib/store';

const CHRONOTYPE_QUIZ = [
  {
    q: "If you had NO obligations, what time would you naturally go to bed?",
    options: [
      { text: "9:00-10:00pm", value: "lion" },
      { text: "10:00-11:00pm", value: "bear" },
      { text: "11:00pm-12:00am", value: "wolf" },
      { text: "12:00am or later", value: "dolphin" }
    ]
  },
  {
    q: "What time would you naturally wake up (no alarm)?",
    options: [
      { text: "5:00-6:30am", value: "lion" },
      { text: "6:30-7:30am", value: "bear" },
      { text: "7:30-9:00am", value: "wolf" },
      { text: "9:00am or later", value: "dolphin" }
    ]
  },
  {
    q: "When do you feel MOST alert and energized?",
    options: [
      { text: "Early morning (5-9am)", value: "lion" },
      { text: "Mid-morning to early afternoon (9am-2pm)", value: "bear" },
      { text: "Late afternoon to evening (3-7pm)", value: "wolf" },
      { text: "Evening to late night (7pm-midnight)", value: "dolphin" }
    ]
  }
];

const LIFESTYLE_QUIZ = [
  {
    q: "Do you eat breakfast within 2 hours of waking?",
    options: [
      { text: "Rarely/never", value: "foundation" },
      { text: "Sometimes (2-3 days/week)", value: "building" },
      { text: "Usually (4-5 days/week)", value: "optimization" },
      { text: "Always (6-7 days/week)", value: "optimization" }
    ]
  },
  {
    q: "How much time can you dedicate to wellness habits daily?",
    options: [
      { text: "10-15 minutes max", value: "foundation" },
      { text: "20-30 minutes", value: "building" },
      { text: "45-60 minutes", value: "optimization" },
      { text: "60+ minutes", value: "optimization" }
    ]
  },
  {
    q: "Current activity level?",
    options: [
      { text: "Sedentary - minimal movement", value: "foundation" },
      { text: "Lightly active - 1-2x/week", value: "building" },
      { text: "Moderately active - 3-4x/week", value: "optimization" },
      { text: "Very active - 5+ days/week", value: "optimization" }
    ]
  }
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [accessCode, setAccessCode] = useState('');
  const [name, setName] = useState('');
  const [avatarType, setAvatarType] = useState('pet');
  const [avatarName, setAvatarName] = useState('');
  const [chronotypeAnswers, setChronotypeAnswers] = useState([]);
  const [lifestyleAnswers, setLifestyleAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const setUser = useStore(state => state.setUser);
  const setHabits = useStore(state => state.setHabits);

  // Step 1: Access Code
  async function handleAccessCode(e) {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if access code exists
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('access_code', accessCode);

      if (error) {
        console.error('Error checking access code:', error);
        alert('Error checking access code. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Found existing user(s) with this code
        // Sort by most recent (in case multiple users have same code)
        const existingUser = data.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )[0];

        // Ask user if they want to continue or start fresh
        const shouldContinue = window.confirm(
          `Found existing account: "${existingUser.name || 'Unnamed'}"\n\nClick OK to continue your program, or Cancel to create a new account.`
        );

        if (shouldContinue) {
          // Load existing user data
          console.log('Loading existing user:', existingUser);

          setUser({
            userId: existingUser.id,
            accessCode: existingUser.access_code,
            name: existingUser.name,
            avatarType: existingUser.avatar_type,
            avatarName: existingUser.avatar_name,
            avatarEmoji: existingUser.avatar_emoji,
            chronotype: existingUser.chronotype,
            lifestyleLevel: existingUser.lifestyle_level
          });

          // Load stats
          const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', existingUser.id)
            .single();

          if (stats) {
            setUser({
              health: stats.health,
              coins: stats.coins,
              greenEnergy: stats.green_energy,
              level: stats.level
            });
          }

          // Load habits based on their week
          const week = existingUser.current_week || 1;
          const habits = getHabitsForUser(existingUser.chronotype, week);
          setHabits(habits);

          // Complete onboarding
          onComplete();
        } else {
          // User wants to create new account with same code
          console.log('User chose to create new account');
          setStep(2);
        }
      } else {
        // No existing user found - new signup
        console.log('New user, proceeding to profile setup');
        setStep(2);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Step 2: Name & Avatar
  function handleProfile(e) {
    e.preventDefault();
    setStep(3);
  }

  // Step 3: Chronotype Quiz
  function handleChronotypeAnswer(answer) {
    const newAnswers = [...chronotypeAnswers, answer];
    setChronotypeAnswers(newAnswers);

    if (newAnswers.length === CHRONOTYPE_QUIZ.length) {
      setStep(4);
    }
  }

  // Step 4: Lifestyle Quiz
  function handleLifestyleAnswer(answer) {
    const newAnswers = [...lifestyleAnswers, answer];
    setLifestyleAnswers(newAnswers);

    if (newAnswers.length === LIFESTYLE_QUIZ.length) {
      createUser();
    }
  }

  // Create user in database
  async function createUser() {
    setIsLoading(true);

    try {
      const chronotype = chronotypeAnswers.sort((a,b) =>
        chronotypeAnswers.filter(v => v === a).length - chronotypeAnswers.filter(v => v === b).length
      ).pop();

      const lifestyleLevel = lifestyleAnswers.sort((a,b) =>
        lifestyleAnswers.filter(v => v === a).length - lifestyleAnswers.filter(v => v === b).length
      ).pop();

      const avatarEmojis = {
        pet: '🦔',
        'mini-me': '🧑‍🌿',
        simple: '📊'
      };

      console.log('Creating user with:', {
        access_code: accessCode,
        name: name,
        avatar_type: avatarType,
        chronotype: chronotype,
        lifestyle_level: lifestyleLevel
      });

      const { data: user, error } = await supabase
        .from('users')
        .insert({
          access_code: accessCode,
          name: name,
          avatar_type: avatarType,
          avatar_name: avatarName || (avatarType === 'pet' ? 'Fern' : name),
          avatar_emoji: avatarEmojis[avatarType],
          chronotype: chronotype,
          lifestyle_level: lifestyleLevel
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        alert(`Failed to create user: ${error.message}`);
        setIsLoading(false);
        return;
      }

      console.log('User created:', user);

      // Set program start date to today
await supabase
.from('users')
.update({ program_start_date: new Date().toISOString() })
.eq('id', user.id);

      await supabase
        .from('user_stats')
        .insert({
          user_id: user.id,
          health: 78,
          coins: 0,
          green_energy: 0,
          level: 1
        });

      setUser({
        userId: user.id,
        accessCode: user.access_code,
        name: user.name,
        avatarType: user.avatar_type,
        avatarName: user.avatar_name,
        avatarEmoji: user.avatar_emoji,
        chronotype: user.chronotype,
        lifestyleLevel: user.lifestyle_level,
        health: 78,
        coins: 0,
        greenEnergy: 0,
        level: 1
      });

      const habits = getHabitsForUser(chronotype, lifestyleLevel);
      setHabits(habits);

      onComplete();
    } catch (err) {
      console.error('Error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // STEP 1: Access Code
  if (step === 1) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ed', padding: '20px' }}>
        <div style={{ maxWidth: '440px', width: '100%', padding: '40px', background: 'white', borderRadius: '20px', border: '1.5px solid #e8e4de' }}>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '36px', textAlign: 'center', marginBottom: '8px' }}>
            🌱 WELL with J Bea
          </h1>
          <p style={{ textAlign: 'center', color: '#888', fontSize: '13px', marginBottom: '30px' }}>
            Spring Energy Reset Program
          </p>
          
          <form onSubmit={handleAccessCode}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
              Access Code
            </label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter code from your guide"
              required
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e8e4de', marginBottom: '16px', fontSize: '15px' }}
            />
            
            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '14px', background: '#8aad8a', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              {isLoading ? 'Checking...' : 'Continue →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#888' }}>
            Don't have a code?{' '}
            <a href="https://yoursite.com/guide" style={{ color: '#8aad8a' }}>Get the guide</a>
          </p>
        </div>
      </div>
    );
  }

  // STEP 2: Profile
  if (step === 2) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ed', padding: '20px' }}>
        <div style={{ maxWidth: '440px', width: '100%', padding: '40px', background: 'white', borderRadius: '20px', border: '1.5px solid #e8e4de' }}>
          <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '28px', marginBottom: '8px' }}>
            Create Your Profile
          </h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '30px' }}>
            Step 1 of 3
          </p>
          
          <form onSubmit={handleProfile}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan"
              required
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e8e4de', marginBottom: '20px', fontSize: '15px' }}
            />

            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase' }}>
              Avatar Style
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {['pet', 'mini-me', 'simple'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAvatarType(type)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${avatarType === type ? '#8aad8a' : '#e8e4de'}`,
                    background: avatarType === type ? '#f3f8f3' : 'white',
                    cursor: 'pointer',
                    fontSize: '24px',
                    textAlign: 'center'
                  }}
                >
                  {type === 'pet' ? '🦔' : type === 'mini-me' ? '🧑‍🌿' : '📊'}
                  <div style={{ fontSize: '11px', marginTop: '8px', textTransform: 'capitalize', color: '#888' }}>
                    {type}
                  </div>
                </button>
              ))}
            </div>

            {avatarType === 'pet' && (
              <>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Pet Name
                </label>
                <input
                  type="text"
                  value={avatarName}
                  onChange={(e) => setAvatarName(e.target.value)}
                  placeholder="Fern"
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e8e4de', marginBottom: '20px', fontSize: '15px' }}
                />
              </>
            )}

            <button type="submit" style={{ width: '100%', padding: '14px', background: '#8aad8a', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              Continue →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STEP 3: Chronotype Quiz
  if (step === 3) {
    const questionIndex = chronotypeAnswers.length;
    
    // If we've answered all questions, move to next step
    if (questionIndex >= CHRONOTYPE_QUIZ.length) {
      setStep(4);
      return null;
    }

    const currentQ = CHRONOTYPE_QUIZ[questionIndex];
    
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ed', padding: '20px' }}>
        <div style={{ maxWidth: '540px', width: '100%', padding: '40px', background: 'white', borderRadius: '20px', border: '1.5px solid #e8e4de' }}>
          <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '28px', marginBottom: '8px' }}>
            Find Your Chronotype
          </h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '30px' }}>
            Step 2 of 3 · Question {questionIndex + 1} of {CHRONOTYPE_QUIZ.length}
          </p>

          <p style={{ fontSize: '16px', marginBottom: '24px', lineHeight: '1.5' }}>
            {currentQ.q}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQ.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleChronotypeAnswer(option.value)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1.5px solid #e8e4de',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.borderColor = '#8aad8a'}
                onMouseOut={(e) => e.target.style.borderColor = '#e8e4de'}
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // STEP 4: Lifestyle Quiz
  if (step === 4) {
    const questionIndex = lifestyleAnswers.length;
    
    // If we've answered all questions, createUser is already triggered
    if (questionIndex >= LIFESTYLE_QUIZ.length) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ed' }}>
          <p style={{ fontSize: '16px', color: '#888' }}>Creating your program...</p>
        </div>
      );
    }

    const currentQ = LIFESTYLE_QUIZ[questionIndex];
    
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ed', padding: '20px' }}>
        <div style={{ maxWidth: '540px', width: '100%', padding: '40px', background: 'white', borderRadius: '20px', border: '1.5px solid #e8e4de' }}>
          <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '28px', marginBottom: '8px' }}>
            Customize Your Program
          </h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '30px' }}>
            Step 3 of 3 · Question {questionIndex + 1} of {LIFESTYLE_QUIZ.length}
          </p>

          <p style={{ fontSize: '16px', marginBottom: '24px', lineHeight: '1.5' }}>
            {currentQ.q}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQ.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleLifestyleAnswer(option.value)}
                disabled={isLoading}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1.5px solid #e8e4de',
                  background: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  textAlign: 'left',
                  opacity: isLoading ? 0.5 : 1
                }}
                onMouseOver={(e) => !isLoading && (e.target.style.borderColor = '#8aad8a')}
                onMouseOut={(e) => !isLoading && (e.target.style.borderColor = '#e8e4de')}
              >
                {option.text}
              </button>
            ))}
          </div>

          {isLoading && (
            <p style={{ textAlign: 'center', marginTop: '20px', color: '#888', fontSize: '14px' }}>
              Creating your personalized program...
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}