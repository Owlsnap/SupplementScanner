import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from '@phosphor-icons/react';

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

export default function TermsPage() {
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
            <FileText size={26} color="#00685f" weight="fill" />
          </div>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--text-primary)',
            margin: 0, letterSpacing: '-0.5px',
          }}>
            Terms of Service
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
            These Terms of Service ("Terms") govern your use of SupplementScanner,
            operated at <strong style={{ color: 'var(--text-primary)' }}>supplementscanner.io</strong>{' '}
            and the SupplementScanner mobile app (collectively the "Service").
            By accessing or using the Service, you agree to be bound by these Terms.
            If you do not agree, do not use the Service.
          </p>

          {/* Health disclaimer — most important section, shown first */}
          <div style={{
            background: 'var(--card-warning-bg, #fff8f0)',
            border: '1.5px solid var(--card-warning-border, #f59e0b)',
            borderRadius: '12px', padding: '1.25rem 1.5rem', margin: '0 0 1rem',
          }}>
            <p style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 800,
              fontSize: '0.9375rem', color: 'var(--card-warning-heading, #b45309)',
              margin: '0 0 0.5rem',
            }}>
              Important Health Disclaimer
            </p>
            <p style={{ ...S.p, margin: 0, color: 'var(--card-warning-heading, #b45309)' }}>
              All content on SupplementScanner — including AI-generated deep dives,
              supplement summaries, evidence ratings, and dosage information — is
              provided for <strong>educational and informational purposes only</strong>.
              It does not constitute medical advice, diagnosis, or treatment.
              Always consult a qualified healthcare professional before starting,
              stopping, or changing any supplement or medication regimen.
              SupplementScanner accepts no liability for decisions made based on
              information found on the Service.
            </p>
          </div>

          <h2 style={S.h2}>1. Service Description</h2>
          <p style={S.p}>
            SupplementScanner provides an encyclopedia of supplement information powered by
            AI-generated content, a barcode scanner tool, and related features. The Service is
            available in a free tier and an optional premium subscription tier.
          </p>
          <p style={S.p}>
            AI-generated content is produced using large language models and may contain
            inaccuracies or outdated information. We strive for accuracy but make no
            warranties regarding the completeness or correctness of any content.
          </p>

          <h2 style={S.h2}>2. Eligibility</h2>
          <p style={S.p}>
            You must be at least 16 years old to use the Service. By using the Service you
            represent that you meet this age requirement. If you are under 18, you should
            have parental consent before using the Service.
          </p>

          <h2 style={S.h2}>3. Accounts</h2>
          <p style={S.p}>
            Certain features require creating an account. You are responsible for maintaining
            the confidentiality of your login credentials and for all activity that occurs
            under your account. Notify us immediately at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00685f', fontWeight: 600 }}>{CONTACT_EMAIL}</a>{' '}
            if you suspect unauthorised access.
          </p>
          <p style={S.p}>
            We reserve the right to suspend or terminate accounts that violate these Terms.
          </p>

          <h2 style={S.h2}>4. Premium Subscription</h2>
          <p style={S.p}>
            Premium features are available through a paid subscription billed monthly or
            annually. Payments are processed by Stripe. By subscribing, you authorise us
            to charge the applicable fee to your payment method on a recurring basis.
          </p>
          <ul style={S.ul}>
            <li style={S.li}>Prices are shown inclusive of any applicable VAT</li>
            <li style={S.li}>Subscriptions auto-renew until cancelled</li>
            <li style={S.li}>You may cancel at any time; cancellation takes effect at the end of the current billing period</li>
            <li style={S.li}>Certain one-time purchases (single deep dives) are non-subscription and are charged once</li>
          </ul>

          <h2 style={S.h2}>5. Refunds</h2>
          <p style={S.p}>
            Subscriptions may be refunded within <strong style={{ color: 'var(--text-primary)' }}>14 days</strong> of initial
            purchase if you have not used the premium features. Under the Swedish Distance and
            Off-Premises Contracts Act (Lag 2005:59), you have a 14-day right of withdrawal for
            digital services, which begins to run from the date of purchase. By using the premium
            features before the 14-day period expires, you consent to early delivery of the
            digital content and acknowledge that your right of withdrawal is thereby waived.
          </p>
          <p style={S.p}>
            Renewals are generally non-refundable, but if you believe a charge was in error,
            contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00685f', fontWeight: 600 }}>{CONTACT_EMAIL}</a>{' '}
            and we will review it on a case-by-case basis.
          </p>

          <h2 style={S.h2}>6. Acceptable Use</h2>
          <p style={S.p}>You agree not to:</p>
          <ul style={S.ul}>
            <li style={S.li}>Use the Service for any unlawful purpose</li>
            <li style={S.li}>Scrape, crawl, or extract data from the Service by automated means without our written permission</li>
            <li style={S.li}>Attempt to reverse-engineer, decompile, or disassemble any part of the Service</li>
            <li style={S.li}>Circumvent any access controls, rate limits, or paywalls</li>
            <li style={S.li}>Use the Service to transmit malware, spam, or other harmful content</li>
            <li style={S.li}>Impersonate any person or entity or misrepresent your affiliation</li>
          </ul>

          <h2 style={S.h2}>7. Intellectual Property</h2>
          <p style={S.p}>
            All original content, design, branding, and code in the Service is owned by
            SupplementScanner or its licensors and is protected by copyright and other
            intellectual property laws. You may not reproduce, distribute, or create
            derivative works without our prior written consent.
          </p>
          <p style={S.p}>
            AI-generated supplement content is provided for your personal, non-commercial use.
            Republishing such content — in whole or in part — without attribution and permission
            is not permitted.
          </p>

          <h2 style={S.h2}>8. Third-Party Content and Links</h2>
          <p style={S.p}>
            The Service may reference third-party sources (research papers, product databases).
            We do not endorse or assume responsibility for any third-party content.
            The accuracy of information from external sources is not guaranteed.
          </p>

          <h2 style={S.h2}>9. Disclaimer of Warranties</h2>
          <p style={S.p}>
            The Service is provided <strong style={{ color: 'var(--text-primary)' }}>"as is"</strong> and{' '}
            <strong style={{ color: 'var(--text-primary)' }}>"as available"</strong> without warranties of any kind,
            express or implied, including but not limited to implied warranties of
            merchantability, fitness for a particular purpose, or non-infringement.
            We do not warrant that the Service will be uninterrupted, error-free, or
            free of viruses or other harmful components.
          </p>

          <h2 style={S.h2}>10. Limitation of Liability</h2>
          <p style={S.p}>
            To the fullest extent permitted by Swedish law, SupplementScanner shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages
            arising from your use of — or inability to use — the Service, including but not
            limited to health-related decisions made based on information found on the Service.
          </p>
          <p style={S.p}>
            Our total aggregate liability to you for any claim arising from or relating to the
            Service shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>

          <h2 style={S.h2}>11. Changes to the Service and These Terms</h2>
          <p style={S.p}>
            We may modify the Service or these Terms at any time. Material changes will be
            communicated by posting the updated Terms on this page with a revised "last updated"
            date, and for registered users, by email notification at least 14 days before the
            change takes effect. Your continued use of the Service after that date constitutes
            acceptance of the updated Terms.
          </p>

          <h2 style={S.h2}>12. Governing Law and Disputes</h2>
          <p style={S.p}>
            These Terms are governed by and construed in accordance with the laws of Sweden.
            Any dispute arising from these Terms or your use of the Service shall first be
            referred to mediation. If mediation fails, disputes shall be subject to the exclusive
            jurisdiction of the Swedish courts. EU consumers may also use the EU Online Dispute
            Resolution platform at{' '}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: '#00685f' }}>
              ec.europa.eu/consumers/odr
            </a>.
          </p>

          <h2 style={S.h2}>13. Contact</h2>
          <p style={{ ...S.p, margin: 0 }}>
            Questions about these Terms? Contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00685f', fontWeight: 600 }}>{CONTACT_EMAIL}</a>.
          </p>
        </div>

        {/* Footer links */}
        <div style={{
          marginTop: '2rem', display: 'flex', gap: '1.5rem', justifyContent: 'center',
          fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
        }}>
          <Link to="/privacy" style={{ color: '#00685f', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
