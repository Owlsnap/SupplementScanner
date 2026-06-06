import React, { useState } from 'react';
import {
  ArrowLeft, X, Check,
  Barbell, Fire, Lightning, Moon, Shield, PersonSimpleRun, Brain, Heart,
  ForkKnife, Leaf, Plant, Egg, Bone, Drop,
  PersonSimpleWalk, Bicycle, Trophy,
  BookOpen, Flask,
  type Icon,
} from '@phosphor-icons/react';
import { useLanguage } from '../contexts/LanguageContext';

export interface WizardData {
  age_range: string;
  goal: string;
  diet: string[];
  training_level: string;
  supplement_knowledge: string;
}

interface ProfileSetupWizardProps {
  initial: WizardData;
  onComplete: (data: WizardData) => Promise<void>;
  onClose: () => void;
}

interface StepOption {
  value: string;
  labelKey: string;
  descKey?: string;
  icon?: Icon;
}

interface StepDef {
  field: keyof WizardData;
  type: 'single' | 'multi';
  questionKey: string;
  subtitleKey: string;
  options: StepOption[];
  optional?: boolean;
}

const STEPS: StepDef[] = [
  {
    field: 'age_range',
    type: 'single',
    questionKey: 'profileSetup.ageQuestion',
    subtitleKey: 'profileSetup.ageSubtitle',
    options: [
      { value: 'under_25', labelKey: 'profileSetup.ageUnder25' },
      { value: '25_34', labelKey: 'profileSetup.age2534' },
      { value: '35_44', labelKey: 'profileSetup.age3544' },
      { value: '45_54', labelKey: 'profileSetup.age4554' },
      { value: '55_plus', labelKey: 'profileSetup.age55plus' },
    ],
  },
  {
    field: 'goal',
    type: 'single',
    questionKey: 'profileSetup.goalQuestion',
    subtitleKey: 'profileSetup.goalSubtitle',
    options: [
      { value: 'Build muscle', labelKey: 'healthProfileOptions.goals.buildMuscle', icon: Barbell },
      { value: 'Lose fat', labelKey: 'healthProfileOptions.goals.loseFat', icon: Fire },
      { value: 'Improve energy', labelKey: 'healthProfileOptions.goals.improveEnergy', icon: Lightning },
      { value: 'Better sleep', labelKey: 'healthProfileOptions.goals.betterSleep', icon: Moon },
      { value: 'Immune support', labelKey: 'healthProfileOptions.goals.immuneSupport', icon: Shield },
      { value: 'Athletic performance', labelKey: 'healthProfileOptions.goals.athleticPerformance', icon: PersonSimpleRun },
      { value: 'Cognitive focus', labelKey: 'healthProfileOptions.goals.cognitiveFocus', icon: Brain },
      { value: 'General health', labelKey: 'healthProfileOptions.goals.generalHealth', icon: Heart },
    ],
  },
  {
    field: 'diet',
    type: 'multi',
    questionKey: 'profileSetup.dietQuestion',
    subtitleKey: 'profileSetup.dietSubtitle',
    optional: true,
    options: [
      { value: 'Standard', labelKey: 'healthProfileOptions.diet.standard', icon: ForkKnife },
      { value: 'Vegetarian', labelKey: 'healthProfileOptions.diet.vegetarian', icon: Leaf },
      { value: 'Vegan', labelKey: 'healthProfileOptions.diet.vegan', icon: Plant },
      { value: 'Keto', labelKey: 'healthProfileOptions.diet.keto', icon: Egg },
      { value: 'Paleo', labelKey: 'healthProfileOptions.diet.paleo', icon: Bone },
      { value: 'Gluten-free', labelKey: 'healthProfileOptions.diet.glutenFree', icon: Leaf },
      { value: 'Dairy-free', labelKey: 'healthProfileOptions.diet.dairyFree', icon: Drop },
    ],
  },
  {
    field: 'training_level',
    type: 'single',
    questionKey: 'profileSetup.trainingQuestion',
    subtitleKey: 'profileSetup.trainingSubtitle',
    options: [
      { value: 'sedentary', labelKey: 'profileSetup.trainingSedentary', descKey: 'profileSetup.trainingSedentaryDesc', icon: Moon },
      { value: 'lightly_active', labelKey: 'profileSetup.trainingLightly', descKey: 'profileSetup.trainingLightlyDesc', icon: PersonSimpleWalk },
      { value: 'moderately_active', labelKey: 'profileSetup.trainingModerately', descKey: 'profileSetup.trainingModeratelyDesc', icon: PersonSimpleRun },
      { value: 'very_active', labelKey: 'profileSetup.trainingVery', descKey: 'profileSetup.trainingVeryDesc', icon: Bicycle },
      { value: 'athlete', labelKey: 'profileSetup.trainingAthlete', descKey: 'profileSetup.trainingAthleteDesc', icon: Trophy },
    ],
  },
  {
    field: 'supplement_knowledge',
    type: 'single',
    questionKey: 'profileSetup.knowledgeQuestion',
    subtitleKey: 'profileSetup.knowledgeSubtitle',
    options: [
      { value: 'beginner', labelKey: 'profileSetup.knowledgeBeginner', descKey: 'profileSetup.knowledgeBeginnerDesc', icon: Leaf },
      { value: 'intermediate', labelKey: 'profileSetup.knowledgeIntermediate', descKey: 'profileSetup.knowledgeIntermediateDesc', icon: BookOpen },
      { value: 'advanced', labelKey: 'profileSetup.knowledgeAdvanced', descKey: 'profileSetup.knowledgeAdvancedDesc', icon: Flask },
    ],
  },
];

export default function ProfileSetupWizard({ initial, onComplete, onClose }: ProfileSetupWizardProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(initial);
  const [visible, setVisible] = useState(true);
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const transition = (fn: () => void) => {
    setVisible(false);
    setTimeout(() => {
      fn();
      setVisible(true);
      setPendingValue(null);
    }, 180);
  };

  const advance = () => {
    if (isLast) {
      handleFinish();
    } else {
      transition(() => setStep(s => s + 1));
    }
  };

  const goBack = () => {
    if (step === 0) { onClose(); return; }
    transition(() => setStep(s => s - 1));
  };

  const handleSingleSelect = (value: string) => {
    setPendingValue(value);
    setData(d => ({ ...d, [currentStep.field]: value }));
    setTimeout(advance, 320);
  };

  const handleMultiToggle = (value: string) => {
    setData(d => {
      const arr = d.diet as string[];
      return { ...d, diet: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      await onComplete(data);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
      setSaving(false);
    }
  };

  const getValue = (): string | string[] => data[currentStep.field];
  const singleValue = currentStep.type === 'single' ? (getValue() as string) : '';
  const multiValue = currentStep.type === 'multi' ? (getValue() as string[]) : [];

  const canContinue = currentStep.optional || (
    currentStep.type === 'single' ? !!singleValue : true
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-page)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <button
            onClick={goBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif",
              fontWeight: 600, fontSize: '0.875rem', padding: '0.25rem',
            }}
          >
            <ArrowLeft size={16} />
            {step === 0 ? t('common.cancel') : t('common.back')}
          </button>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '999px',
                  background: i < step ? '#00685f' : i === step ? '#00685f' : 'var(--border-strong)',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-hover)', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', borderRadius: '50%',
              width: '32px', height: '32px', padding: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step content */}
        <div
          style={{
            flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
          }}
        >
          <div style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: '1.25rem', color: 'var(--text-primary)',
            marginBottom: '0.375rem', letterSpacing: '-0.3px', lineHeight: 1.3,
          }}>
            {t(currentStep.questionKey)}
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
            color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5,
          }}>
            {t(currentStep.subtitleKey)}
            {currentStep.optional && (
              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.375rem' }}>
                ({t('profileSetup.optional')})
              </span>
            )}
          </div>

          {/* Options */}
          {currentStep.type === 'single' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {currentStep.options.map(opt => {
                const selected = singleValue === opt.value || pendingValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => !pendingValue && handleSingleSelect(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.875rem 1rem',
                      background: selected ? '#e6f4f1' : 'var(--bg-surface)',
                      border: selected ? '1.5px solid #00685f' : '1.5px solid var(--border)',
                      borderRadius: '12px',
                      cursor: pendingValue ? 'default' : 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {opt.icon && (
                          <opt.icon
                            size={18}
                            color={selected ? '#00685f' : 'var(--text-secondary)'}
                            weight={selected ? 'fill' : 'regular'}
                          />
                        )}
                        <span style={{
                          fontFamily: "'Inter', sans-serif", fontWeight: 600,
                          fontSize: '0.9375rem', color: selected ? '#00685f' : 'var(--text-primary)',
                        }}>
                          {t(opt.labelKey)}
                        </span>
                      </div>
                      {opt.descKey && (
                        <div style={{
                          fontFamily: "'Inter', sans-serif", fontSize: '0.8rem',
                          color: selected ? '#3f8c7a' : 'var(--text-muted)', marginTop: '0.125rem',
                          paddingLeft: opt.icon ? '1.625rem' : 0,
                        }}>
                          {t(opt.descKey)}
                        </div>
                      )}
                    </div>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      border: selected ? 'none' : '2px solid var(--border-strong)',
                      background: selected ? '#00685f' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.15s ease',
                    }}>
                      {selected && <Check size={12} color="#fff" weight="bold" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {currentStep.options.map(opt => {
                const selected = multiValue.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleMultiToggle(opt.value)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.5rem 1rem',
                      background: selected ? '#e6f4f1' : 'var(--bg-surface)',
                      border: selected ? '1.5px solid #00685f' : '1.5px solid var(--border)',
                      borderRadius: '999px', cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {selected && <Check size={12} color="#00685f" weight="bold" />}
                    {opt.icon && (
                      <opt.icon
                        size={14}
                        color={selected ? '#00685f' : 'var(--text-secondary)'}
                        weight={selected ? 'fill' : 'regular'}
                      />
                    )}
                    <span style={{
                      fontFamily: "'Inter', sans-serif", fontWeight: 600,
                      fontSize: '0.875rem', color: selected ? '#00685f' : 'var(--text-secondary)',
                    }}>
                      {t(opt.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: '#fff1f1', border: '1px solid #ffcdd2', borderRadius: '10px',
              fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#ba1a1a',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer — only shown for multi-select or last step */}
        {(currentStep.type === 'multi' || isLast) && (
          <div style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border)',
          }}>
            <button
              onClick={advance}
              disabled={saving || !canContinue}
              style={{
                width: '100%', padding: '0.875rem',
                background: canContinue ? '#00685f' : 'var(--bg-hover)',
                color: canContinue ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: '28px',
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.9375rem',
                cursor: (saving || !canContinue) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.15s ease',
              }}
            >
              {saving && (
                <div style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
              )}
              {saving
                ? t('profileSetup.saving')
                : currentStep.optional && multiValue.length === 0
                  ? t('profileSetup.skip')
                  : isLast
                    ? t('profileSetup.done')
                    : t('profileSetup.continue')}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
