'use client';

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'DM Sans, sans-serif' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '32px', marginBottom: '30px', color: '#1a1a1a' }}>
        Privacy Policy & GDPR Rights
      </h1>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          Data Controller
        </h2>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          <strong>Bloom (well with j bea)</strong><br />
          Jess Bea<br />
          Rotterdam, Netherlands<br />
          Contact: dm[@byjbea](https://instagram.com/byjbea) on Instagram
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          What Data We Collect
        </h2>
        <ul style={{ color: '#555', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>
            <strong>Profile data:</strong> Name, region (for seasonal produce), avatar preferences
          </li>
          <li>
            <strong>Quiz answers:</strong> Wellness Archetype assessment (13 questions) — stored locally in your browser first, then in your secure profile
          </li>
          <li>
            <strong>Habit logs:</strong> Daily habit completions, bad habits, rest days — stored only in your profile
          </li>
          <li>
            <strong>Nutrition logs:</strong> Meals logged via Nourish, including ingredients and nutrient data
          </li>
          <li>
            <strong>Other activities:</strong> Sleep logs, focus sessions, community posts, Green Energy donations
          </li>
          <li>
            <strong>Push notification token:</strong> Via OneSignal for reminders (you can opt out anytime)
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          Where Data Is Stored
        </h2>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          All data is stored in <strong>Supabase (PostgreSQL)</strong>, which is GDPR-compliant and operates data centers in the EU. 
          We use permissive access policies — all access control happens in the app layer, not at the database level.
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          Your GDPR Rights
        </h2>

        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2a2a2a', marginTop: '20px', marginBottom: '8px' }}>
          ✅ Right to Access (Article 15)
        </h3>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          All your data is visible in the app. You can see your profile, habit logs, nutrition data, and community posts anytime. 
          To export as JSON, contact us via Instagram DM.
        </p>

        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2a2a2a', marginTop: '20px', marginBottom: '8px' }}>
          ✅ Right to Deletion (Article 17 — "Right to be Forgotten")
        </h3>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          You can delete all your data anytime. Go to <strong>More → Settings → Delete My Data</strong>. 
          This permanently removes all habit logs, nutrition data, profiles, and posts. <strong>This action cannot be undone.</strong>
        </p>

        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2a2a2a', marginTop: '20px', marginBottom: '8px' }}>
          ✅ Right to Data Portability (Article 20)
        </h3>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          You can request your data in a portable format (JSON). Contact us via Instagram DM with your user ID, 
          and we'll provide your complete dataset within 10 days.
        </p>

        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2a2a2a', marginTop: '20px', marginBottom: '8px' }}>
          ✅ Right to Rectification (Article 16)
        </h3>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          You can edit your profile, name, region, and archetype anytime in Settings. Quiz answers can be redone 
          to reflect your current state.
        </p>

        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2a2a2a', marginTop: '20px', marginBottom: '8px' }}>
          ✅ Right to Withdraw Consent
        </h3>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          You can opt out of push notifications anytime in Settings. You can stop sharing community posts by marking them private.
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          Data Sharing & Third Parties
        </h2>
        <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '12px' }}>
          <strong>We do not sell your data. Ever.</strong>
        </p>
        <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '12px' }}>
          Your data is shared with the following processors only:
        </p>
        <ul style={{ color: '#555', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>
            <strong>Supabase:</strong> Database hosting (GDPR-compliant, EU data center)
          </li>
          <li>
            <strong>OneSignal:</strong> Push notifications — receives only your push token, not your habit or health data
          </li>
          <li>
            <strong>Vercel:</strong> App hosting (GDPR-compliant)
          </li>
        </ul>
        <p style={{ color: '#888', lineHeight: '1.6', marginTop: '12px', fontSize: '13px' }}>
          We never share your Wellness Archetype, habit logs, nutrition data, or health information with anyone, 
          including affiliates, advertisers, or third-party researchers — even anonymously.
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          Data Retention
        </h2>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          We keep your data as long as you have an active account or membership. If you cancel your subscription and don't log in for 12 months, 
          we may archive your data. If you request deletion (Right to be Forgotten), we delete everything immediately.
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          Security
        </h2>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          <strong>Important:</strong> This app uses localStorage UUIDs for authentication (not Supabase Auth yet). 
          This means access control is enforced at the app layer, not the database level. 
          <strong> We are migrating to Supabase Auth before full production launch</strong> to enforce database-level security.
        </p>
        <p style={{ color: '#555', lineHeight: '1.6', marginTop: '12px' }}>
          All data in transit is encrypted (HTTPS). All data at rest is encrypted by Supabase.
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          How to Exercise Your GDPR Rights
        </h2>
        <ol style={{ color: '#555', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>
            <strong>To delete your data:</strong> In the app, go to More → Settings → Delete My Data
          </li>
          <li>
            <strong>To export your data:</strong> DM us on [@byjbea](https://instagram.com/byjbea) Instagram with your user ID
          </li>
          <li>
            <strong>To opt out of notifications:</strong> Settings → Notifications (off)
          </li>
          <li>
            <strong>To file a complaint:</strong> Contact your local data protection authority
          </li>
        </ol>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          Cookies & Tracking
        </h2>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          We do not use cookies for tracking or advertising. We use localStorage for app state (like your preferences and habit logs). 
          This is essential for the app to function.
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2a2a2a', marginBottom: '12px' }}>
          Questions?
        </h2>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          Email or DM [@byjbea](https://instagram.com/byjbea) on Instagram. We respond within 7 days.
        </p>
      </section>

      <section style={{ 
        padding: '20px', 
        background: '#f7f3ed', 
        borderRadius: '12px', 
        borderLeft: '4px solid #8aad8a',
        marginBottom: '40px'
      }}>
        <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
          <strong>Last updated:</strong> July 21, 2026<br />
          This Privacy Policy complies with GDPR (EU 2016/679) and CCPA standards.
        </p>
      </section>

      <div style={{ textAlign: 'center', marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e8e4de' }}>
        <a 
          href="/"
          style={{
            color: '#8aad8a',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          ← Back to App
        </a>
      </div>
    </div>
  );
}
