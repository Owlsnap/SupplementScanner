import React, { useState, useEffect, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, User, Tag, X as XIcon, Sparkle } from '@phosphor-icons/react';
import { useAuth, supabase } from '../contexts/AuthContext';
import { useStack } from '../contexts/StackContext';
import { encyclopediaSupplements } from '../data/encyclopediaData';
import { useLanguage } from '../contexts/LanguageContext';

interface HealthProfilePageProps {
  onBack: () => void;
  onSignIn: () => void;
}

interface Profile {
  goal: string;
  diet: string[];
  conditions: string[];
  current_stack: string[];
}

const GOALS = [
  'Build muscle',
  'Lose fat',
  'Improve energy',
  'Better sleep',
  'Immune support',
  'Athletic performance',
  'Cognitive focus',
  'General health',
];

const DIET_OPTIONS = [
  'Standard',
  'Vegetarian',
  'Vegan',
  'Keto',
  'Paleo',
  'Gluten-free',
  'Dairy-free',
];

const CONDITION_SUGGESTIONS = [
  'Diabetes', 'Hypertension', 'Thyroid', 'IBS', 'PCOS',
  'Anxiety', 'Depression', 'Heart disease', 'Kidney disease',
];

export default function HealthProfilePage({ onBack, onSignIn }: HealthProfilePageProps) {
  const { t } = useLanguage();
  const { user, session, isPremium } = useAuth();

  const goalDisplayLabels: Record<string, string> = {
    'Build muscle': t('healthProfileOptions.goals.buildMuscle'),
    'Lose fat': t('healthProfileOptions.goals.loseFat'),
    'Improve energy': t('healthProfileOptions.goals.improveEnergy'),
    'Better sleep': t('healthProfileOptions.goals.betterSleep'),
    'Immune support': t('healthProfileOptions.goals.immuneSupport'),
    'Athletic performance': t('healthProfileOptions.goals.athleticPerformance'),
    'Cognitive focus': t('healthProfileOptions.goals.cognitiveFocus'),
    'General health': t('healthProfileOptions.goals.generalHealth'),
  };

  const dietDisplayLabels: Record<string, string> = {
    'Standard': t('healthProfileOptions.diet.standard'),
    'Vegetarian': t('healthProfileOptions.diet.vegetarian'),
    'Vegan': t('healthProfileOptions.diet.vegan'),
    'Keto': t('healthProfileOptions.diet.keto'),
    'Paleo': t('healthProfileOptions.diet.paleo'),
    'Gluten-free': t('healthProfileOptions.diet.glutenFree'),
    'Dairy-free': t('healthProfileOptions.diet.dairyFree'),
  };
  const navigate = useNavigate();
  const { stack, removeFromStack } = useStack();

  const [profile, setProfile] = useState<Profile>({
    goal: '',
    diet: [],
    conditions: [],
    current_stack: [],
  });
  const [conditionInput, setConditionInput] = useState('');
  const [stackInput, setStackInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<{
    type: 'free' | 'beta' | 'paid';
    plan?: string;
    periodEnd?: string;
  } | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from('user_health_profiles')
      .select('goal, diet, conditions, current_stack')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { setError(error.message); }
        if (data) {
          setProfile({
            goal: data.goal ?? '',
            diet: data.diet ?? [],
            conditions: data.conditions ?? [],
            current_stack: data.current_stack ?? [],
          });
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user?.id || !user?.email) { setPlanDetails({ type: 'free' }); return; }
    Promise.all([
      supabase.from('beta_testers').select('email').eq('email', user.email).maybeSingle(),
      supabase
        .from('subscriptions')
        .select('plan, current_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .maybeSingle(),
    ]).then(([{ data: tester }, { data: sub }]) => {
      if (sub) {
        setPlanDetails({ type: 'paid', plan: sub.plan, periodEnd: sub.current_period_end });
      } else if (tester) {
        setPlanDetails({ type: 'beta' });
      } else {
        setPlanDetails({ type: 'free' });
      }
    });
  }, [user?.id, user?.email]);

  const toggleArray = (arr: string[], value: string): string[] =>
    arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

  const addTag = (field: 'conditions' | 'current_stack', value: string) => {
    const trimmed = value.trim();
    if (!trimmed || profile[field].includes(trimmed)) return;
    setProfile(p => ({ ...p, [field]: [...p[field], trimmed] }));
  };

  const removeTag = (field: 'conditions' | 'current_stack', value: string) =>
    setProfile(p => ({ ...p, [field]: p[field].filter(v => v !== value) }));

  const handleTagKey = (
    e: KeyboardEvent<HTMLInputElement>,
    field: 'conditions' | 'current_stack',
    inputValue: string,
    setInput: (v: string) => void,
  ) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addTag(field, inputValue.replace(/,$/, '').trim());
      setInput('');
    } else if (e.key === 'Backspace' && !inputValue && profile[field].length) {
      removeTag(field, profile[field][profile[field].length - 1]);
    }
  };

  const save = async () => {
    if (!user || !session) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from('user_health_profiles')
      .upsert(
        {
          user_id: user.id,
          goal: profile.goal || null,
          diet: profile.diet,
          conditions: profile.conditions,
          current_stack: profile.current_stack,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const sectionLabel: React.CSSProperties = {
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 800,
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    marginBottom: '0.75rem',
    letterSpacing: '-0.2px',
  };

  const card: React.CSSProperties = {
    background: 'var(--bg-surface)',
    borderRadius: '16px',
    border: '1.5px solid var(--border)',
    padding: '1.25rem 1.5rem',
    marginBottom: '1rem',
  };

  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.375rem 0.875rem',
    borderRadius: '999px',
    border: active ? 'none' : '1.5px solid var(--border-strong)',
    background: active ? '#00685f' : 'transparent',
    color: active ? '#ffffff' : 'var(--text-secondary)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  });

  const tagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.3125rem 0.625rem',
    background: '#e6f4f1',
    borderRadius: '999px',
    border: '1px solid #b3ddd8',
    color: '#00685f',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: '0.8125rem',
  };

  const tagInput: React.CSSProperties = {
    flex: 1,
    minWidth: '120px',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    padding: '0.375rem 0',
  };

  const tagWrap: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    alignItems: 'center',
    padding: '0.625rem 0.875rem',
    border: '1.5px solid var(--border-strong)',
    borderRadius: '12px',
    background: 'var(--bg-page)',
    minHeight: '48px',
    cursor: 'text',
  };

  const stackSupplements = encyclopediaSupplements.filter(s => stack.includes(s.slug));

  const myStackSection = (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={sectionLabel}>{t('healthProfile.myStack')}</div>
        {stackSupplements.length > 0 && (
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {stackSupplements.length !== 1 ? t('healthProfile.supplementCountPlural', { count: stackSupplements.length }) : t('healthProfile.supplementCount', { count: stackSupplements.length })}
          </span>
        )}
      </div>

      {stackSupplements.length === 0 ? (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1rem', lineHeight: 1.55 }}>
          {t('healthProfile.noStackYet')}{' '}
          <button
            onClick={() => navigate('/')}
            style={{ color: '#00685f', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', padding: 0 }}
          >
            {t('healthProfile.browseIndex')}
          </button>{' '}
          {t('healthProfile.noStackBuildText')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {stackSupplements.map(supp => (
            <span key={supp.slug} style={tagStyle}>
              <Tag size={11} />
              {supp.name}
              <button
                onClick={() => removeFromStack(supp.slug)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: '#00685f' }}
              >
                <XIcon size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ borderTop: stackSupplements.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: stackSupplements.length > 0 ? '1rem' : '0' }}>
        <button
          onClick={() => isPremium ? navigate('/stack-evaluation') : navigate('/premium')}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <Sparkle size={16} weight="fill" />
          {t('healthProfile.evaluateStack')}
          {!isPremium && (
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '999px',
              padding: '0.0625rem 0.5rem',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              fontFamily: "'Inter', sans-serif",
            }}>
              PREMIUM
            </span>
          )}
        </button>
      </div>
    </div>
  );

  // Not signed in — still show the stack section
  if (!user && !loading) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', paddingTop: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              background: 'transparent', border: 'none', padding: '0.25rem 0', marginBottom: '1.25rem',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.875rem',
            }}
          >
            <ArrowLeft size={16} /> {t('common.back')}
          </button>

          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 800,
              fontSize: 'clamp(1.375rem, 4vw, 1.75rem)',
              color: 'var(--text-primary)', margin: '0 0 0.375rem', letterSpacing: '-0.5px',
            }}>
              {t('healthProfile.title')} <span style={{ color: '#00685f' }}>{t('healthProfile.titleHighlight')}</span>
            </h1>
          </div>

          {myStackSection}

          <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-surface)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: '#e6f4f1', border: '1px solid #b3ddd8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <User size={22} color="#00685f" />
            </div>
            <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.375rem' }}>
              {t('healthProfile.signInForProfile')}
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
              {t('healthProfile.signInForProfileSubtitle')}
            </p>
            <button
              onClick={onSignIn}
              style={{
                background: '#00685f', color: '#fff', border: 'none',
                borderRadius: '28px', padding: '0.75rem 1.5rem',
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.9375rem',
                cursor: 'pointer',
              }}
            >
              {t('healthProfile.signIn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', paddingTop: '100px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            background: 'transparent', border: 'none', padding: '0.25rem 0', marginBottom: '1.25rem',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} /> {t('common.back')}
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.375rem, 4vw, 1.75rem)',
            color: 'var(--text-primary)', margin: '0 0 0.375rem', letterSpacing: '-0.5px',
          }}>
            {t('healthProfile.title')} <span style={{ color: '#00685f' }}>{t('healthProfile.titleHighlight')}</span>
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            {t('healthProfile.subtitle')}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
            {t('healthProfile.loadingProfile')}
          </div>
        ) : (
          <>
            {/* Plan */}
            {planDetails && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: planDetails.type === 'free' ? '0.75rem' : '0.375rem' }}>
                  <div style={sectionLabel}>Your Plan</div>
                  <span style={{
                    background: planDetails.type === 'free' ? 'var(--bg-hover)' : '#00685f',
                    color: planDetails.type === 'free' ? 'var(--text-secondary)' : '#ffffff',
                    borderRadius: '999px',
                    padding: '0.1875rem 0.625rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase' as const,
                  }}>
                    {planDetails.type === 'free'
                      ? 'Free'
                      : planDetails.type === 'beta'
                      ? 'Beta Access'
                      : planDetails.plan === 'yearly'
                      ? 'Premium · Yearly'
                      : 'Premium · Monthly'}
                  </span>
                </div>

                {planDetails.type === 'free' && (
                  <>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem', lineHeight: 1.6 }}>
                      Upgrade to unlock full evidence deep dives — dosing, sources, bioavailability, and interactions.
                    </p>
                    <button
                      onClick={() => navigate('/premium')}
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: '#00685f', color: '#ffffff', border: 'none',
                        borderRadius: '12px', fontFamily: "'Inter', sans-serif",
                        fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      }}
                    >
                      <Sparkle size={15} weight="fill" />
                      Upgrade to Premium
                    </button>
                  </>
                )}

                {planDetails.type === 'beta' && (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                    You have full access as a beta tester. Thank you for helping shape SupplementScanner.
                  </p>
                )}

                {planDetails.type === 'paid' && (
                  <>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem', lineHeight: 1.6 }}>
                      Full access to all deep dives, stack evaluation, and interactions.
                    </p>
                    {planDetails.periodEnd && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 0.875rem' }}>
                        Renews {new Date(planDetails.periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    <button
                      onClick={() => navigate('/premium')}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent', color: '#00685f',
                        border: '1.5px solid #00685f', borderRadius: '28px',
                        fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      Manage plan
                    </button>
                  </>
                )}
              </div>
            )}

            {/* My Stack */}
            {myStackSection}

            {/* Goal */}
            <div style={card}>
              <div style={sectionLabel}>{t('healthProfile.primaryGoal')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {GOALS.map(g => (
                  <button
                    key={g}
                    onClick={() => setProfile(p => ({ ...p, goal: p.goal === g ? '' : g }))}
                    style={chip(profile.goal === g)}
                  >
                    {goalDisplayLabels[g] || g}
                  </button>
                ))}
              </div>
            </div>

            {/* Diet */}
            <div style={card}>
              <div style={sectionLabel}>{t('healthProfile.dietaryPreference')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {DIET_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setProfile(p => ({ ...p, diet: toggleArray(p.diet, d) }))}
                    style={chip(profile.diet.includes(d))}
                  >
                    {dietDisplayLabels[d] || d}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditions */}
            <div style={card}>
              <div style={sectionLabel}>{t('healthProfile.healthConditions')} <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{t('healthProfile.healthConditionsOptional')}</span></div>
              <div
                style={tagWrap}
                onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
              >
                {profile.conditions.map(c => (
                  <span key={c} style={tagStyle}>
                    {c}
                    <button onClick={() => removeTag('conditions', c)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: '#00685f' }}>
                      <XIcon size={12} />
                    </button>
                  </span>
                ))}
                <input
                  style={tagInput}
                  placeholder={profile.conditions.length ? '' : t('healthProfile.conditionPlaceholder')}
                  value={conditionInput}
                  onChange={e => setConditionInput(e.target.value)}
                  onKeyDown={e => handleTagKey(e, 'conditions', conditionInput, setConditionInput)}
                  onBlur={() => { if (conditionInput.trim()) { addTag('conditions', conditionInput); setConditionInput(''); } }}
                />
              </div>
              {/* Suggestions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.625rem' }}>
                {CONDITION_SUGGESTIONS.filter(s => !profile.conditions.includes(s)).map(s => (
                  <button
                    key={s}
                    onClick={() => addTag('conditions', s)}
                    style={{
                      padding: '0.25rem 0.625rem', borderRadius: '999px',
                      border: '1px dashed var(--border-strong)', background: 'transparent',
                      color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif",
                      fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Current stack */}
            <div style={card}>
              <div style={sectionLabel}>{t('healthProfile.otherSupplements')} <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{t('healthProfile.otherSupplementsOptional')}</span></div>
              <div
                style={tagWrap}
                onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
              >
                {profile.current_stack.map(s => (
                  <span key={s} style={{ ...tagStyle, background: 'var(--primary-light)', border: '1px solid var(--primary-border)' }}>
                    <Tag size={11} />
                    {s}
                    <button onClick={() => removeTag('current_stack', s)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: '#00685f' }}>
                      <XIcon size={12} />
                    </button>
                  </span>
                ))}
                <input
                  style={tagInput}
                  placeholder={profile.current_stack.length ? '' : t('healthProfile.supplementsPlaceholder')}
                  value={stackInput}
                  onChange={e => setStackInput(e.target.value)}
                  onKeyDown={e => handleTagKey(e, 'current_stack', stackInput, setStackInput)}
                  onBlur={() => { if (stackInput.trim()) { addTag('current_stack', stackInput); setStackInput(''); } }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fff1f1', border: '1px solid #ffcdd2',
                borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem',
                fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#ba1a1a',
              }}>
                {error}
              </div>
            )}

            {/* Save */}
            <button
              onClick={save}
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: saved ? '#e6f4f1' : saving ? '#bcc9c6' : '#00685f',
                color: saved ? '#00685f' : '#ffffff',
                border: saved ? '1.5px solid #b3ddd8' : 'none',
                borderRadius: '28px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: '0.9375rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
            >
              {saving && <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
              {saved && <CheckCircle size={18} weight="fill" />}
              {saving ? t('healthProfile.saving') : saved ? t('healthProfile.profileSaved') : t('healthProfile.saveProfile')}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
