import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from '@phosphor-icons/react';

const LAST_UPDATED = 'May 21, 2026';
const CONTACT_EMAIL = 'supplementscanner.io@gmail.com';

const S = {
  h2: {
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 800,
    fontSize: '1.125rem',
    color: '#00685f',
    margin: '2rem 0 0.625rem',
    letterSpacing: '-0.2px',
  } as React.CSSProperties,
  p: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
    margin: '0 0 0.75rem',
  } as React.CSSProperties,
  li: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
    marginBottom: '0.375rem',
  } as React.CSSProperties,
  ul: {
    paddingLeft: '1.25rem',
    margin: '0.5rem 0 0.75rem',
  } as React.CSSProperties,
};

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Top padding for fixed navbar */}
      <div style={{ paddingTop: '80px' }} />

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
        {/* Back button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '2rem' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600,
              fontFamily: "'Inter', sans-serif", padding: 0,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '0.5rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: '#e6f4f1', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '1rem',
          }}>
            <ShieldCheck size={26} color="#00685f" weight="fill" />
          </div>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--text-primary)',
            margin: 0, letterSpacing: '-0.5px',
          }}>
            Privacy Policy & Cookie Policy
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.375rem 0 0' }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)', margin: '1.75rem 0' }} />

        {/* Content card */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '16px',
          border: '1.5px solid var(--border)', padding: '2rem',
        }}>
          <p style={S.p}>
            SupplementScanner ("we", "us", or "our") operates the website{' '}
            <strong style={{ color: 'var(--text-primary)' }}>supplementscanner.io</strong> and the
            SupplementScanner mobile app. This policy explains how we collect, use, and protect your
            personal data, and describes your rights under the General Data Protection Regulation
            (GDPR) and applicable Swedish law.
          </p>
          <p style={S.p}>
            By using our service you acknowledge this policy. If you do not agree, please stop
            using the service.
          </p>

          <h2 style={S.h2}>1. Data Controller</h2>
          <p style={S.p}>
            The data controller responsible for your personal data is SupplementScanner, operated
            as a sole-trader business. You can contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00685f', fontWeight: 600 }}>{CONTACT_EMAIL}</a>.
          </p>

          <h2 style={S.h2}>2. What Data We Collect</h2>
          <p style={S.p}>We collect the following categories of personal data:</p>
          <ul style={S.ul}>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Account data</strong> — email address when you create an account (used for authentication via Supabase)</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Payment data</strong> — name and billing details when you purchase a premium subscription. Card details are handled directly by Stripe and are never stored on our servers</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Usage data</strong> — supplement pages you view, features you use, and general interaction patterns (used to improve the service)</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Technical data</strong> — IP address, browser type, device information, and crash reports (collected automatically for security and debugging)</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Cookie data</strong> — see the Cookie Policy section below</li>
          </ul>
          <p style={S.p}>
            We do <strong style={{ color: 'var(--text-primary)' }}>not</strong> collect or store health records, medical information, or supplement purchase history on our servers.
          </p>

          <h2 style={S.h2}>3. Legal Basis for Processing</h2>
          <ul style={S.ul}>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Contract performance</strong> (Art. 6(1)(b) GDPR) — processing your account and payment data to deliver the service you subscribed to</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Consent</strong> (Art. 6(1)(a) GDPR) — analytics and non-essential cookies, which you can withdraw at any time via the cookie banner</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Legitimate interests</strong> (Art. 6(1)(f) GDPR) — security monitoring, fraud prevention, and service improvement</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Legal obligation</strong> (Art. 6(1)(c) GDPR) — retaining transaction records as required by Swedish accounting law (Bokföringslagen)</li>
          </ul>

          <h2 style={S.h2}>4. How We Use Your Data</h2>
          <ul style={S.ul}>
            <li style={S.li}>To create and manage your account</li>
            <li style={S.li}>To process premium subscription payments via Stripe</li>
            <li style={S.li}>To deliver AI-generated supplement content through the encyclopedia</li>
            <li style={S.li}>To send transactional emails (account confirmation, password reset)</li>
            <li style={S.li}>To detect and prevent fraudulent or abusive use</li>
            <li style={S.li}>To improve and develop the service</li>
          </ul>
          <p style={S.p}>We do not sell your personal data to third parties. We do not use your data for automated decision-making that produces legal or similarly significant effects.</p>

          <h2 style={S.h2}>5. Third-Party Processors</h2>
          <p style={S.p}>
            We share your data only with trusted processors who are bound by data processing agreements:
          </p>
          <ul style={S.ul}>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Supabase</strong> (Supabase Inc., USA) — database and authentication. Data stored in EU region (eu-west-1) where available. Covered by Standard Contractual Clauses (SCCs)</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Stripe</strong> (Stripe Payments Europe, Ltd.) — payment processing. Stripe is the data controller for payment card information</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Railway</strong> (Railway Corp., USA) — backend API hosting. Covered by SCCs</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Vercel</strong> (Vercel Inc., USA) — frontend hosting. Covered by SCCs</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>OpenAI</strong> (OpenAI OpCo, LLC, USA) — AI processing for supplement data extraction. Input/output data is not used to train OpenAI models under our API agreement. Covered by SCCs</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Anthropic</strong> (Anthropic PBC, USA) — AI processing for encyclopedia deep dive generation. Input/output data is not used to train models under our API agreement. Covered by SCCs</li>
          </ul>

          <h2 style={S.h2}>6. Data Retention</h2>
          <ul style={S.ul}>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Account data</strong> — retained until you delete your account. Deleted within 30 days of a deletion request</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Payment records</strong> — retained for 7 years as required by Swedish accounting law (Bokföringslagen 7 kap. 2 §)</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>AI-generated content</strong> — supplement deep-dive content is cached for up to 30 days and is not linked to any individual user</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Analytics cookies</strong> — deleted after your consent expires or is withdrawn</li>
          </ul>

          <h2 style={S.h2}>7. Your Rights Under GDPR</h2>
          <p style={S.p}>As a data subject you have the following rights:</p>
          <ul style={S.ul}>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Access</strong> — request a copy of the personal data we hold about you</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Rectification</strong> — request correction of inaccurate data</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Erasure</strong> — request deletion of your data ("right to be forgotten")</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Portability</strong> — receive your data in a machine-readable format</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Objection</strong> — object to processing based on legitimate interests</li>
            <li style={S.li}><strong style={{ color: 'var(--text-primary)' }}>Withdrawal of consent</strong> — withdraw consent at any time without affecting prior processing</li>
          </ul>
          <p style={S.p}>
            To exercise any right, email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00685f', fontWeight: 600 }}>{CONTACT_EMAIL}</a>.
            We will respond within 30 days. You also have the right to lodge a complaint with the
            Swedish supervisory authority:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Integritetsskyddsmyndigheten (IMY)</strong>,{' '}
            <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" style={{ color: '#00685f' }}>www.imy.se</a>.
          </p>

          <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

          <h2 style={{ ...S.h2, marginTop: 0 }}>Cookie Policy</h2>
          <p style={S.p}>
            We use cookies and similar technologies to operate and improve the service. A cookie
            consent banner is shown on your first visit. You can change your preferences at any time
            by clicking the cookie settings link in the footer.
          </p>

          <p style={{ ...S.p, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Strictly necessary cookies</p>
          <p style={S.p}>
            Required for the website to function. These cannot be disabled. They include session
            tokens for authentication and a cookie storing your consent choice.
          </p>

          <p style={{ ...S.p, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Analytics cookies</p>
          <p style={S.p}>
            With your consent, we collect anonymised usage data to understand how the service is
            used and how it can be improved. We do not use advertising or tracking cookies.
          </p>

          <h2 style={S.h2}>8. Security</h2>
          <p style={S.p}>
            We implement appropriate technical and organisational measures to protect your data,
            including HTTPS encryption for all data in transit, access controls on our
            database, and regular security reviews. In the event of a personal data breach that
            affects your rights and freedoms, we will notify the relevant supervisory authority
            within 72 hours and, where required, notify you directly.
          </p>

          <h2 style={S.h2}>9. Changes to This Policy</h2>
          <p style={S.p}>
            We may update this policy from time to time. We will post the updated version on this
            page with a new "last updated" date. For material changes, we will notify registered
            users by email before the change takes effect.
          </p>

          <h2 style={S.h2}>10. Contact</h2>
          <p style={S.p}>
            For any questions, requests, or complaints about this policy or how we handle your
            data, please contact:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00685f', fontWeight: 600 }}>{CONTACT_EMAIL}</a>
          </p>
        </div>

        {/* Footer links */}
        <div style={{
          marginTop: '2rem', display: 'flex', gap: '1.5rem', justifyContent: 'center',
          fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
        }}>
          <Link to="/terms" style={{ color: '#00685f', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
