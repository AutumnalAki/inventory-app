-- Migration: create app_settings table for storing app-wide settings (e.g. app_version)
-- Created: 2026-02-12

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Simple trigger to update `updated_at` on update
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.app_settings;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Seed a default app_version if none exists
INSERT INTO public.app_settings (key, value)
VALUES ('app_version', '0.0.0')
ON CONFLICT (key) DO NOTHING;

COMMIT;
