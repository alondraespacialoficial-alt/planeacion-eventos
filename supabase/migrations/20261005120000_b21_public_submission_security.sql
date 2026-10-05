BEGIN;

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS max_plus_ones INTEGER NOT NULL DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'eventos_max_plus_ones_check'
      AND conrelid = 'public.eventos'::regclass
  ) THEN
    ALTER TABLE public.eventos
      ADD CONSTRAINT eventos_max_plus_ones_check
      CHECK (max_plus_ones BETWEEN 0 AND 300);
  END IF;
END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS guests_count INTEGER,
  ADD COLUMN IF NOT EXISTS consent_privacy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consented_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS privacy_notice_version TEXT;

COMMIT;