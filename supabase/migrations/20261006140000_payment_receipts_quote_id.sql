BEGIN;

ALTER TABLE public.payment_receipts
  ADD COLUMN IF NOT EXISTS quote_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_receipts_quote_id_fkey'
      AND conrelid = 'public.payment_receipts'::regclass
  ) THEN
    ALTER TABLE public.payment_receipts
      ADD CONSTRAINT payment_receipts_quote_id_fkey
      FOREIGN KEY (quote_id)
      REFERENCES public.quotes(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS payment_receipts_quote_id_idx
  ON public.payment_receipts (quote_id);

COMMIT;