import { useLanguage } from '../contexts/LanguageContext';

export type InteractionSourceType = 'pubmed' | 'guidance' | null;

/**
 * Source line under an interaction: a badge saying whether the row rests on a PubMed
 * study or on regulatory/clinical guidance, followed by the citation text.
 * Rows without a source_type (no citation yet) render nothing.
 */
export default function InteractionSource({
  sourceType,
  source,
}: {
  sourceType?: InteractionSourceType;
  source?: string | null;
}) {
  const { t } = useLanguage();
  if (!sourceType) return null;

  const isPubmed = sourceType === 'pubmed';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem',
        flexWrap: 'wrap',
        marginTop: '0.5rem',
      }}
    >
      <span
        title={isPubmed ? undefined : t('premiumDeepDive.sourceGuidanceHint')}
        style={{
          flexShrink: 0,
          borderRadius: '999px',
          padding: '0.0625rem 0.5rem',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          fontSize: '0.6875rem',
          ...(isPubmed
            ? { background: 'var(--primary-light)', color: '#00685f', border: '1px solid #6bd8cb' }
            : {
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }),
        }}
      >
        {isPubmed ? t('premiumDeepDive.sourcePubmed') : t('premiumDeepDive.sourceGuidance')}
      </span>
      {source && (
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            minWidth: 0,
          }}
        >
          {source}
        </span>
      )}
    </div>
  );
}
