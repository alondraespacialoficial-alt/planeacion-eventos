// Solo el valor exacto "true" activa el modo demo forzado.
export const isForceDemoValue = (value: unknown): boolean => String(value ?? '').trim().toLowerCase() === 'true';

export const isForceDemo = isForceDemoValue((import.meta as any).env?.VITE_FORCE_DEMO);
