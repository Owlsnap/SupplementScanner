import React from 'react';
import { Helmet } from 'react-helmet-async';

interface PageSEOProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  schema?: object | object[];
}

const DEFAULT_OG_IMAGE = 'https://www.supplementscanner.io/og/home-1200x630.png';

export default function PageSEO({ title, description, canonical, ogImage, schema }: PageSEOProps) {
  const image = ogImage ?? DEFAULT_OG_IMAGE;
  const schemas = schema ? (Array.isArray(schema) ? schema : [schema]) : [];

  return (
    <Helmet>
      <html lang="sv" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="sv-SE" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="SupplementScanner" />
      <meta property="og:locale" content="sv_SE" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}
