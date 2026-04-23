'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

const ONESIGNAL_APP_ID = 'ede9e6ac-5493-439c-9f44-89a82acb21d8';

export default function OneSignalProvider() {
  const userId = useStore(s => s.userId);
  const name   = useStore(s => s.name);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!userId) return;
    if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') return;
    initOneSignal();
  }, [userId]);

  async function saveSubscription(subscriptionId) {
    if (!subscriptionId || !userId) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';

    // Upsert — one row per device, no duplicates
    await supabase
      .from('user_subscriptions')
      .upsert(
        { user_id: userId, onesignal_id: subscriptionId, device_type: deviceType },
        { onConflict: 'user_id,onesignal_id', ignoreDuplicates: true }
      );

    // Keep most recent on users table for backwards compatibility
    await supabase
      .from('users')
      .update({ onesignal_id: subscriptionId, notification_name: name || 'Member' })
      .eq('id', userId);
  }

  async function initOneSignal() {
    try {
      if (!window.OneSignalDeferred) {
        window.OneSignalDeferred = [];
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);

      window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          safari_web_id: '',
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        });

        // Link this device to your Supabase user ID
        // OneSignal can now target all devices for a user by their UUID
        await OneSignal.login(userId);

        // If already subscribed, save subscription ID
        const isSubscribed = OneSignal.User.PushSubscription.optedIn;
        if (isSubscribed) {
          const subscriptionId = OneSignal.User.PushSubscription.id;
          await saveSubscription(subscriptionId);
        }

        // Listen for future subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
          if (event.current.optedIn && event.current.id) {
            await saveSubscription(event.current.id);
          }
        });
      });
    } catch (err) {
      console.error('OneSignal init error:', err);
    }
  }

  return null;
}
