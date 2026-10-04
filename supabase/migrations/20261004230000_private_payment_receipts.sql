-- Create private receipt storage only when its existing configuration has been reviewed.
BEGIN;

DO $$
DECLARE
  existing_bucket storage.buckets%ROWTYPE;
BEGIN
  SELECT * INTO existing_bucket
  FROM storage.buckets
  WHERE id = 'payment-receipts';

  IF FOUND THEN
    RAISE EXCEPTION 'Bucket payment-receipts already exists; inspect its configuration before continuing.'
      USING DETAIL = format(
        'name=%s, public=%s, file_size_limit=%s, allowed_mime_types=%s',
        existing_bucket.name,
        existing_bucket.public,
        existing_bucket.file_size_limit,
        existing_bucket.allowed_mime_types
      );
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'payment-receipts',
    'payment-receipts',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  );
END $$;

ALTER TABLE public.payment_receipts
  ADD COLUMN IF NOT EXISTS receipt_path TEXT;

CREATE OR REPLACE FUNCTION public.is_storage_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_storage_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_storage_admin() TO authenticated;

-- Remove the broad policies defined by the previous setup blueprint.
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public read event assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload event assets" ON storage.objects;
DROP POLICY IF EXISTS "Clients upload own payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins read payment receipts" ON storage.objects;

CREATE POLICY "Public read event assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'event-assets');

CREATE POLICY "Admins upload event assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-assets'
  AND public.is_storage_admin()
);

CREATE POLICY "Clients upload own payment receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND cardinality(storage.foldername(name)) = 1
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners and admins read payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    (
      cardinality(storage.foldername(name)) = 1
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    OR public.is_storage_admin()
  )
);

COMMIT;
