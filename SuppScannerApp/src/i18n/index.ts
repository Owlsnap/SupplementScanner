import strings from './en.json';

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const value = getByPath(strings as Record<string, unknown>, key);
  if (typeof value !== 'string') return key;
  if (!vars) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
}

export function ta(key: string): string[] {
  const value = getByPath(strings as Record<string, unknown>, key);
  if (Array.isArray(value)) return value.map(String);
  return [];
}
