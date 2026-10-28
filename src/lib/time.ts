// Acepta "HH:MM" o "HH:MM:SS" (columna TIME de Postgres) y devuelve "5:30 p. m."; null si está vacío o es inválido.
export function formatTime12h(value?: string | null): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec((value || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23 || Number(minutes) > 59) return null;
  const suffix = hours >= 12 ? 'p. m.' : 'a. m.';
  return `${hours % 12 || 12}:${minutes} ${suffix}`;
}
