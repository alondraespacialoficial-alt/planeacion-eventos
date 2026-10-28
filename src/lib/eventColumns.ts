// Si la migración de horarios aún no se aplicó, se reintenta el guardado sin esas columnas.
const NEW_TIME_COLUMNS = ['ceremony_time', 'reception_time'] as const;

export const isMissingNewTimeColumn = (message?: string): boolean =>
  !!message && NEW_TIME_COLUMNS.some(col => message.includes(col));

export const withoutNewTimeColumns = <T extends object>(fields: T): T => {
  const copy = { ...fields } as Record<string, unknown>;
  NEW_TIME_COLUMNS.forEach(col => delete copy[col]);
  return copy as T;
};

// Indica si el payload trae algún horario nuevo con valor, que se perdería al reintentar sin esas columnas.
export const hasNewTimeValues = (fields: object): boolean =>
  NEW_TIME_COLUMNS.some(col => {
    const value = (fields as Record<string, unknown>)[col];
    return value !== undefined && value !== null && value !== '';
  });

export const MISSING_TIME_COLUMNS_MESSAGE =
  'La base de datos aún no tiene las columnas de horarios de ceremonia/recepción. Aplica la migración 20261029120000 antes de guardar esos horarios.';
