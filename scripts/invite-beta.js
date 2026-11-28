/**
 * Beta invite script
 * Adds each email to public.beta_testers (full premium access) and sends a
 * branded invite through Resend, styled like the deep-dive access email.
 *
 * Usage:
 *   node scripts/invite-beta.js anna@example.com "erik@example.com:Erik"
 *   node scripts/invite-beta.js anna@example.com --dry-run     # no DB write, no send; writes HTML preview
 *   node scripts/invite-beta.js anna@example.com --no-email    # grant access only
 *   node scripts/invite-beta.js anna@example.com --resend      # send again even if already a tester
 *
 * An optional ":FirstName" after the email personalises the greeting.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const SITE_URL = (process.env.SITE_URL || 'https://www.supplementscanner.io').trim().replace(/\/$/, '');
const SUPPORT_EMAIL = 'supplementscanner.io@gmail.com';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const DRY_RUN = flags.has('--dry-run');
const NO_EMAIL = flags.has('--no-email');
const FORCE_RESEND = flags.has('--resend');

const invitees = args
  .filter(a => !a.startsWith('--'))
  .map(raw => {
    const [email, ...nameParts] = raw.split(':');
    return { email: email.trim().toLowerCase(), name: nameParts.join(':').trim() || null };
  });

if (invitees.length === 0) {
  console.error('Usage: node scripts/invite-beta.js <email[:FirstName]> [...] [--dry-run] [--no-email] [--resend]');
  process.exit(1);
}

const bad = invitees.filter(i => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email));
if (bad.length) {
  console.error(`Invalid email(s): ${bad.map(b => b.email).join(', ')}`);
  process.exit(1);
}

const escapeHtml = s =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function buildInviteEmail({ email, name }) {
  const signInUrl = `${SITE_URL}/premium`;
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
  const safeEmail = escapeHtml(email);

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:2rem 1.5rem;color:#171d1c">
      <p style="display:inline-block;background:#e6f2f0;color:#00685f;font-size:0.75rem;font-weight:700;
                letter-spacing:0.06em;text-transform:uppercase;padding:0.25rem 0.75rem;border-radius:28px;margin:0 0 1rem">
        Beta access
      </p>
      <h1 style="font-family:Manrope,sans-serif;font-size:1.375rem;font-weight:800;color:#00685f;margin:0 0 0.75rem">
        You're invited to the SupplementScanner beta
      </h1>
      <p style="color:#3d4947;line-height:1.65;margin:0 0 1rem">${greeting}</p>
      <p style="color:#3d4947;line-height:1.65;margin:0 0 1rem">
        You've got full premium access while we're in beta, free. That includes every research deep dive,
        built only from PubMed meta-analyses and randomized controlled trials, with every claim linked to its source.
      </p>
      <p style="color:#3d4947;line-height:1.65;margin:0 0 1.5rem">
        Sign up or sign in with <strong style="color:#171d1c">${safeEmail}</strong>. Your access is tied
        to this address, so a different email won't unlock premium.
      </p>
      <a href="${signInUrl}"
         style="display:inline-block;background:#00685f;color:#fff;text-decoration:none;
                padding:0.75rem 1.5rem;border-radius:28px;font-weight:600;font-size:0.9375rem">
        Activate My Beta Access →
      </a>
      <p style="color:#6d7a77;font-size:0.8125rem;line-height:1.6;margin:1.5rem 0 0">
        If the button doesn't work, copy and paste this URL:<br>
        <span style="color:#00685f;word-break:break-all">${signInUrl}</span>
      </p>
      <div style="background:#f4f7f6;border-radius:12px;padding:1rem 1.25rem;margin:1.5rem 0 0">
        <p style="font-family:Manrope,sans-serif;font-weight:700;color:#171d1c;margin:0 0 0.375rem;font-size:0.9375rem">
          We'd love your feedback
        </p>
        <p style="color:#3d4947;line-height:1.6;margin:0;font-size:0.875rem">
          Something confusing, broken, or missing? Just reply to this email. It comes straight to us.
        </p>
      </div>
      <hr style="border:none;border-top:1px solid #e4e9e7;margin:1.5rem 0">
      <p style="color:#6d7a77;font-size:0.75rem;margin:0">
        Questions? Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#00685f">${SUPPORT_EMAIL}</a>
      </p>
    </div>
  `;

  const text = [
    greeting,
    '',
    "You're invited to the SupplementScanner beta. You've got full premium access while we're in beta, free. That includes every research deep dive, built only from PubMed meta-analyses and randomized controlled trials.",
    '',
    `Sign up or sign in with ${email}. Your access is tied to this address.`,
    '',
    `Activate your beta access: ${signInUrl}`,
    '',
    'Feedback? Just reply to this email.',
    '',
    `Questions? ${SUPPORT_EMAIL}`,
  ].join('\n');

  return { subject: "You're in: SupplementScanner beta access", html, text };
}

async function main() {
  if (DRY_RUN) {
    const preview = buildInviteEmail(invitees[0]);
    const out = 'beta-invite-preview.html';
    writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>${preview.subject}</title>${preview.html}`);
    console.log(`[dry-run] Subject: ${preview.subject}`);
    console.log(`[dry-run] Would invite: ${invitees.map(i => i.email).join(', ')}`);
    console.log(`[dry-run] Preview written to ${out}`);
    return;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  }
  if (!NO_EMAIL && !process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY must be set in .env.local (or pass --no-email)');
  }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const resend = NO_EMAIL ? null : new Resend(process.env.RESEND_API_KEY);
  let failures = 0;

  for (const invitee of invitees) {
    const { email } = invitee;
    try {
      const { data: existing, error: selErr } = await db
        .from('beta_testers').select('email').eq('email', email).maybeSingle();
      if (selErr) throw selErr;

      if (existing) {
        console.log(`• ${email} is already a beta tester`);
      } else {
        const { error: insErr } = await db.from('beta_testers').insert({ email });
        if (insErr) throw insErr;
        console.log(`✅ ${email} added to beta_testers`);
      }

      if (NO_EMAIL) continue;
      if (existing && !FORCE_RESEND) {
        console.log(`  skipped email (already invited; pass --resend to send again)`);
        continue;
      }

      const { subject, html, text } = buildInviteEmail(invitee);
      const { error: sendErr } = await resend.emails.send({
        from: 'SupplementScanner <noreply@supplementscanner.io>',
        replyTo: SUPPORT_EMAIL,
        to: email,
        subject,
        html,
        text,
      });
      if (sendErr) throw new Error(sendErr.message || JSON.stringify(sendErr));
      console.log(`📧 Invite sent to ${email}`);
    } catch (err) {
      failures++;
      console.error(`❌ ${email}: ${err.message || err}`);
    }
  }

  if (failures) process.exit(1);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
