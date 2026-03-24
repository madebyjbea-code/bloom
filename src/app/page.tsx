'use client';

import { useState, useEffect } from 'react';
import Onboarding from '../components/Onboarding';
import ProgramReveal from '../components/ProgramReveal';
import Dashboard from '../components/Dashboard';

type AppStep = 'loading' | 'onboarding' | 'reveal' | 'dashboard';

export default function Home() {
  const [step, setStep] = useState<AppStep>('loading');

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem('bloom-storage');
      if (!stored) {
        setStep('onboarding');
        return;
      }
      try {
        const parsed = JSON.parse(stored);
        const state = parsed?.state || {};
        if (state.userId && state.archetypeKey) {
          setStep('dashboard');
        } else {
          // Missing archetypeKey — clear stale data and restart
          localStorage.removeItem('bloom-storage');
          setStep('onboarding');
        }
      } catch {
        setStep('onboarding');
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ed' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
          <p style={{ fontSize: 14, color: '#888', fontFamily: 'DM Sans, sans-serif' }}>Loading BLOOM...</p>
        </div>
      </div>
    );
  }

  if (step === 'onboarding') {
    return <Onboarding onComplete={() => setStep('reveal')} />;
  }

  if (step === 'reveal') {
    return <ProgramReveal onAccept={() => setStep('dashboard')} />;
  }

  return <Dashboard />;
}
