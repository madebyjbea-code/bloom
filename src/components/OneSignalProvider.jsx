'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

// Paste your OneSignal App ID here after creating your account at onesignal.com
const ONESIGNAL_APP_ID = 'YOUR_ONESIGNAL_APP_ID';

export default function OneSignalProvider() {
  const userId = useStore(s => s.userId);
  const name   = useStore(s => s.name);

  useEffect(() => {
    // Only run on client, only if user is logged in
    if (typeof window === 'undefined') return;
    if (!userId) return;
    if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') return;

    initOneSignal();
  }, [userId]);

  async function initOneSignal() {
    try {
      // Dynamically load OneSignal SDK
      if (!window.OneSignalDeferred) {
        window.OneSignalDeferred = [];
      }

      // Load the OneSignal script
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);

      window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          safari_web_id: '', // add Safari Web ID from OneSignal dashboard if needed
          notifyButton: {
            enable: false, // we handle the prompt ourselves
          },
          allowLocalhostAsSecureOrigin: true, // for local testing
        });

        // Check if already subscribed
        const isSubscribed = await OneSignal.User.PushSubscription.optedIn;

        if (!isSubscribed) {
          // Show native browser permission prompt
          await OneSignal.Notifications.requestPermission();
        }

        // Get the player/subscription ID and save to Supabase
        const subscriptionId = OneSignal.User.PushSubscription.id;
        if (subscriptionId && userId) {
          await supabase
            .from('users')
            .update({
              onesignal_id: subscriptionId,
              notification_name: name || 'Member',
            })
            .eq('id', userId);
        }

        // Set external user ID so you can target by Supabase user ID
        await OneSignal.login(userId);
      });
    } catch (err) {
      console.error('OneSignal init error:', err);
    }
  }

  return null; // this component renders nothing
}
