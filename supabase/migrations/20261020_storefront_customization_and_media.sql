-- BentaBuddy storefront customization + image uploads
-- Run once in Supabase SQL Editor. This does not modify orders, checkout, or payment records.

ALTER TABLE public.storefront_designs
  ADD COLUMN IF NOT EXISTS font_style text NOT NULL DEFAULT 'sans'
    CHECK (font_style IN ('sans', 'serif', 'rounded')),
  ADD COLUMN IF NOT EXISTS card_style text NOT NULL DEFAULT 'rounded'
    CHECK (card_style IN ('rounded', 'square')),
  ADD COLUMN IF NOT EXISTS show_welcome boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_description boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_cover boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_logo boolean NOT NULL DEFAULT true;

-- Public storefronts may read the design settings for enabled stores.
DROP FUNCTION IF EXISTS public.get_public_store_design(text);

CREATE FUNCTION public.get_public_store_design(p_store_slug text)
RETURNS TABLE (
  store_name text,
  theme text,
  primary_color text,
  background_color text,
  accent_color text,
  welcome_message text,
  logo_url text,
  cover_image_url text,
  description text,
  layout text,
  store_layout text,
  font_style text,
  card_style text,
  show_welcome boolean,
  show_description boolean,
  show_cover boolean,
  show_logo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    d.store_name,
    d.theme,
    d.primary_color,
    d.background_color,
    d.accent_color,
    d.welcome_message,
    d.logo_url,
    d.cover_image_url,
    d.description,
    d.layout,
    d.store_layout,
    d.font_style,
    d.card_style,
    d.show_welcome,
    d.show_description,
    d.show_cover,
    d.show_logo
  FROM public.businesses AS b
  JOIN public.storefront_designs AS d ON d.business_id = b.id
  WHERE b.store_slug = p_store_slug
    AND b.storefront_enabled IS TRUE
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_public_store_design(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_design(text) TO anon, authenticated;

-- Two fixed image slots per business: logo.jpg and cover.jpg.
-- Each uploaded image is compressed by the app and limited to 1 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('storefront-media', 'storefront-media', true, 1048576, ARRAY['image/jpeg']::text[])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 1048576,
    allowed_mime_types = ARRAY['image/jpeg']::text[];

DROP POLICY IF EXISTS storefront_media_public_read ON storage.objects;
CREATE POLICY storefront_media_public_read
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'storefront-media');

DROP POLICY IF EXISTS storefront_media_owner_insert ON storage.objects;
CREATE POLICY storefront_media_owner_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'storefront-media'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses AS b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS storefront_media_owner_update ON storage.objects;
CREATE POLICY storefront_media_owner_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'storefront-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses AS b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'storefront-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses AS b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS storefront_media_owner_delete ON storage.objects;
CREATE POLICY storefront_media_owner_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'storefront-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses AS b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = (SELECT auth.uid())
  )
);
