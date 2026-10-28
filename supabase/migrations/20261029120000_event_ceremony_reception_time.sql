-- Horarios independientes de ceremonia y recepción por evento (opcionales, sin backfill).
-- Rollback: ALTER TABLE public.eventos DROP COLUMN IF EXISTS ceremony_time, DROP COLUMN IF EXISTS reception_time;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS ceremony_time TIME WITHOUT TIME ZONE;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS reception_time TIME WITHOUT TIME ZONE;
