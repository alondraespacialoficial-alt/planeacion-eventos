// Si la migración de horarios aún no se aplicó, se reintenta el guardado sin esas columnas.
const NEW_TIME_COLUMNS = ['ceremony_time', 'reception_time'] as const;

export const isMissingNewTimeColumn = (message?: string): boolean =>
  !!message && NEW_TIME_COLUMNS.some(col => message.includes(col));

export const withoutNewTimeColumns = <T extends object>(fields: T): T => {
  const copy = { ...fields } as Record<string, unknown>;
  NEW_TIME_COLUMNS.forEach(col => delete copy[col]);
  return copy as T;
};
