'use client';

import { useState, useEffect } from 'react';
import Onboarding from '../components/Onboarding';
import Dashboard from '../components/Dashboard';
import { useStore } from '../lib/store';

export default function Home() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const userId = useStore((state) => state.userId);

  useEffect(() => {
    if (userId) {
      setIsOnboarded(true);
    }
  }, [userId]);

  if (!isOnboarded) {
    return <Onboarding onComplete={() => setIsOnboarded(true)} />;
  }

  return <Dashboard />;
}
