-- KRISNApedia self-hosted PostgreSQL schema
-- Run with: psql "$DATABASE_URL" -f database/schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
  password_hash text NOT NULL, name text NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('insight', 'manual', 'regulation')),
  title text NOT NULL, slug text NOT NULL, category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  category_text text, sub_category text, description text NOT NULL,
  long_description jsonb NOT NULL DEFAULT '[]'::jsonb, cover_image_url text, file_url text, file_name text,
  youtube_url text, viewer text NOT NULL DEFAULT 'pdf' CHECK (viewer IN ('pdf', 'slides', 'image', 'video', 'web')),
  file_type text, author text, published_date date NOT NULL DEFAULT CURRENT_DATE, effective_date date,
  version text, pages integer, file_size text, language text DEFAULT 'Bahasa Indonesia', read_time text,
  tags text[] NOT NULL DEFAULT '{}', display_status text DEFAULT 'Aktif', regulation_status text,
  jurisdiction text, published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, slug)
);
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question text NOT NULL, answer jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text, order_index integer NOT NULL DEFAULT 0, published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_type text NOT NULL CHECK (content_type IN ('insight', 'manual', 'regulation')),
  content_id uuid REFERENCES content_items(id) ON DELETE CASCADE, slug text NOT NULL, views integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (content_type, content_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS content_views_type_content_id_unique ON content_views (content_type, content_id);
CREATE INDEX IF NOT EXISTS content_views_type_content_id_idx ON content_views (content_type, content_id);
CREATE INDEX IF NOT EXISTS content_views_slug_idx ON content_views (slug);
CREATE INDEX IF NOT EXISTS content_items_type_published_date_idx ON content_items (content_type, published, published_date DESC);
CREATE INDEX IF NOT EXISTS content_items_slug_idx ON content_items (slug);
CREATE INDEX IF NOT EXISTS faqs_order_idx ON faqs (order_index, created_at);
CREATE OR REPLACE FUNCTION increment_content_view(p_type text, p_slug text, p_content_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$ DECLARE current_views integer; BEGIN
  INSERT INTO content_views (content_type, slug, content_id, views) VALUES (p_type, p_slug, p_content_id, 1)
  ON CONFLICT (content_type, content_id) DO UPDATE SET slug = EXCLUDED.slug, views = content_views.views + 1, updated_at = now()
  RETURNING views INTO current_views; RETURN current_views; END; $$;