BEGIN;

DROP POLICY IF EXISTS "Owners update RSVP check-in" ON public.rsvps;
CREATE POLICY "Owners update RSVP check-in" ON public.rsvps
  FOR UPDATE TO authenticated
  USING (
        EXISTS (
            SELECT 1 FROM public.eventos
            WHERE public.eventos.id = public.rsvps.event_id
            AND (
                public.eventos.created_by = auth.uid() OR
                public.eventos.client_email = auth.jwt() ->> 'email'
            )
        )
    )
  WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.eventos
            WHERE public.eventos.id = public.rsvps.event_id
            AND (
                public.eventos.created_by = auth.uid() OR
                public.eventos.client_email = auth.jwt() ->> 'email'
            )
        )
    );
REVOKE UPDATE ON TABLE public.rsvps FROM anon, authenticated;
GRANT UPDATE (checked_in, checked_in_at) ON TABLE public.rsvps TO authenticated;

COMMIT;