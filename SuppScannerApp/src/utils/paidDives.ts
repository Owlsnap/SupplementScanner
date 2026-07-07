import AsyncStorage from '@react-native-async-storage/async-storage';

// Mirrors the web app's localStorage-backed paid single-dive tracking
// (SupplementAnalyzer.tsx: savePaidDive/getSessionIdForSlug) so a user who
// buys a 1x deep dive keeps access to it without needing a premium account.

const PAID_DIVES_KEY = '@paid_dives';

interface PaidDive {
  slug: string;
  sessionId: string;
}

async function getPaidDives(): Promise<PaidDive[]> {
  try {
    const raw = await AsyncStorage.getItem(PAID_DIVES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePaidDive(slug: string, sessionId: string): Promise<void> {
  const existing = await getPaidDives();
  const next = [...existing.filter(d => d.slug !== slug), { slug, sessionId }];
  await AsyncStorage.setItem(PAID_DIVES_KEY, JSON.stringify(next));
}

export async function getSessionIdForSlug(slug: string): Promise<string | null> {
  const dives = await getPaidDives();
  return dives.find(d => d.slug === slug)?.sessionId ?? null;
}
