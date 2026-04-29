'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

const ONESIGNAL_APP_ID = 'ede9e6ac-5493-439c-9f44-89a82acb21d8';

// Go to OneSignal → Settings → Platforms → Safari → copy the Safari Web ID
// Looks like: web.onesignal.auto.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
// Leave empty string if not configured yet
const SAFARI_WEB_ID = '';

export default function OneSignalProvider() {
  const userId = useStore(s => s.userId);
  const name   = useStore(s => s.name);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!userId) return;
    initOneSignal();
  }, [userId]);

  async function saveSubscription(subscriptionId) {
    if (!subscriptionId || !userId) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';

    try {
      await supabase
        .from('user_subscriptions')
        .upsert(
          { user_id: userId, onesignal_id: subscriptionId, device_type: deviceType },
          { onConflict: 'user_id,onesignal_id', ignoreDuplicates: true }
        );
      await supabase
        .from('users')
        .update({ onesignal_id: subscriptionId, notification_name: name || 'Member' })
        .eq('id', userId);
      console.log('Subscription saved:', subscriptionId, deviceType);
    } catch(e) {
      console.error('Save subscription error:', e);
    }
  }

  async function initOneSignal() {
    try {
      // Prevent double-init
      if (window._oneSignalInitDone) return;
      window._oneSignalInitDone = true;

      if (!window.OneSignalDeferred) {
        window.OneSignalDeferred = [];
      }

      // Load SDK and WAIT for it to be ready before pushing to queue
      await new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.OneSignal) { resolve(); return; }

        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      window.OneSignalDeferred.push(async function(OneSignal) {
        // Init
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          safari_web_id: SAFARI_WEB_ID,
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: 'OneSignalSDKWorker.js',
        });

        console.log('OneSignal init complete');

        // Link to Supabase user ID
        await OneSignal.login(userId);

        // Check current state
        const isSubscribed = OneSignal.User.PushSubscription.optedIn;
        console.log('Currently subscribed:', isSubscribed);

        if (isSubscribed) {
          // Already subscribed — just save the ID
          const subscriptionId = OneSignal.User.PushSubscription.id;
          console.log('Existing subscription ID:', subscriptionId);
          await saveSubscription(subscriptionId);
        }
        // If not subscribed, the NotifButton in settings handles requestPermission()
        // We listen for the change event to catch when they opt in

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
          console.log('Subscription changed:', event.current);
          if (event.current.optedIn && event.current.id) {
            await saveSubscription(event.current.id);
          }
        });
      });

    } catch (err) {
      console.error('OneSignal init error:', err);
      window._oneSignalInitDone = false; // allow retry
    }
  }

  return null;
}
