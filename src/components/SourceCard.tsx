import React from 'react';
import { ArrowUpRight, Flask, TestTube, ChartBar, Question } from '@phosphor-icons/react';

export interface Citation {
  index: number;
  pmid: string;
  title: string;
  year: number | null;
  study_type: string | null;
  sample_size: number | null;
  funding_source: string | null;
  url: string;
}

interface SourceCardProps {
  citation: Citation;
}

const STUDY_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'meta-analysis': { label: 'Meta-analysis',  color: '#00685f' },
  rct:             { label: 'RCT (Randomized Controlled Trial)', color: '#3f6560' },
  observational:   { label: 'Observational',   color: '#d97706' },
  animal:          { label: 'Animal study',    color: '#9e6a03' },
  other:           { label: 'Study',           color: '#6d7a77' },
};

const STUDY_TYPE_ICONS: Record<string, React.ReactNode> = {
  'meta-analysis': <ChartBar size={12} weight="fill" />,
  rct:             <Flask size={12} weight="fill" />,
  observational:   <TestTube size={12} weight="fill" />,
  animal:          <TestTube size={12} weight="fill" />,
  other:           <Question size={12} weight="fill" />,
};

export default function SourceCard({ citation }: SourceCardProps) {
  const typeInfo = STUDY_TYPE_LABELS[citation.study_type ?? 'other'] ?? STUDY_TYPE_LABELS.other;
  const typeIcon = STUDY_TYPE_ICONS[citation.study_type ?? 'other'] ?? STUDY_TYPE_ICONS.other;

  const meta = [
    citation.year,
    citation.sample_size ? `n=${citation.sample_size.toLocaleString()}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '0.875rem 1rem',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = '#00685f';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 0 3px rgba(0,104,95,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
      }}
    >
      {/* Top row: index badge + study type pill + arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{
          width: '20px', height: '20px',
          background: '#00685f', color: '#fff',
          borderRadius: '50%',
          fontSize: '0.6875rem', fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {citation.index}
        </span>

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          background: `${typeInfo.color}18`,
          color: typeInfo.color,
          border: `1px solid ${typeInfo.color}40`,
          borderRadius: '999px',
          padding: '0.125rem 0.5rem',
          fontSize: '0.6875rem', fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
        }}>
          {typeIcon}
          {typeInfo.label}
        </span>

        {citation.funding_source === 'industry' && (
          <span style={{
            fontSize: '0.625rem', fontWeight: 600,
            color: '#d97706',
            fontFamily: "'Inter', sans-serif",
            marginLeft: 'auto',
          }}>
            Industry funded
          </span>
        )}

        <ArrowUpRight
          size={14}
          color="var(--text-secondary)"
          style={{ marginLeft: citation.funding_source === 'industry' ? '0' : 'auto', flexShrink: 0 }}
        />
      </div>

      {/* Title */}
      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: 'var(--text-primary)',
        lineHeight: 1.45,
        margin: '0 0 0.375rem',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {citation.title}
      </p>

      {/* Meta row */}
      {meta && (
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          margin: 0,
        }}>
          {meta} · PMID {citation.pmid}
        </p>
      )}
    </a>
  );
}
