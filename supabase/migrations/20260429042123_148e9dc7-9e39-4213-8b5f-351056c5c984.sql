CREATE TABLE public.content_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text NOT NULL CHECK (content_type IN ('insight','manual','regulation')),
  content_id text NOT NULL,
  slug text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_views_unique UNIQUE (content_type, content_id)
);

CREATE INDEX content_views_type_content_id_idx ON public.content_views (content_type, content_id);
CREATE INDEX content_views_slug_idx ON public.content_views (slug);

ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read view counts"
  ON public.content_views
  FOR SELECT
  USING (true);

-- No insert/update/delete policies => only SECURITY DEFINER functions can write.

CREATE OR REPLACE FUNCTION public.increment_view(
  p_type text,
  p_slug text,
  p_content_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_views integer;
BEGIN
  IF p_type NOT IN ('insight','manual','regulation') THEN
    RAISE EXCEPTION 'invalid content_type: %', p_type;
  END IF;

  INSERT INTO public.content_views (content_type, slug, content_id, views, updated_at)
  VALUES (p_type, p_slug, p_content_id, 1, now())
  ON CONFLICT (content_type, content_id)
  DO UPDATE SET
    slug = EXCLUDED.slug,
    views = public.content_views.views + 1,
    updated_at = now()
  RETURNING views INTO v_views;

  RETURN v_views;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_view(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_view(text, text, text) TO anon, authenticated;