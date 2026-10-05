BEGIN;

DROP POLICY IF EXISTS "Public insert RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Public submit lead requests" ON public.leads;

COMMIT;