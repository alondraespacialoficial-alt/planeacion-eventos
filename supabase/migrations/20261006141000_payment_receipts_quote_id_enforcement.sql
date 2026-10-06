BEGIN;

DROP POLICY IF EXISTS "Clients submit own payment receipts" ON public.payment_receipts;
CREATE POLICY "Clients submit own payment receipts" ON public.payment_receipts
  FOR INSERT WITH CHECK (
    (
      public.is_admin()
      AND (
        quote_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.quotes q
          WHERE q.id = payment_receipts.quote_id
            AND q.status = 'approved'
            AND lower(q.client_email) = lower(payment_receipts.client_email)
        )
      )
    )
    OR (
      NOT public.is_admin()
      AND auth.uid() = client_id
      AND lower(client_email) = lower(auth.jwt() ->> 'email')
      AND quote_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.quotes q
        WHERE q.id = payment_receipts.quote_id
          AND q.status = 'approved'
          AND lower(q.client_email) = lower(payment_receipts.client_email)
          AND lower(q.client_email) = lower(auth.jwt() ->> 'email')
      )
    )
  );

COMMIT;