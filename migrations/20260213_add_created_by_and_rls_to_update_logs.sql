-- Migration: Add created_by to update_logs and tighten RLS
-- Date: 2026-02-13

-- 1) Add column to track who created the update (optional FK to users.id)
ALTER TABLE IF EXISTS public.update_logs
ADD COLUMN IF NOT EXISTS created_by uuid;

-- (Optional) Add foreign key constraint if you want DB-level integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'update_logs' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'created_by'
  ) THEN
    ALTER TABLE public.update_logs
    ADD CONSTRAINT update_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 2) Enable Row Level Security on update_logs (if not already enabled)
ALTER TABLE IF EXISTS public.update_logs ENABLE ROW LEVEL SECURITY;

-- 3) Allow anyone to SELECT update_logs (so UI can read notifications)
-- If you prefer only authenticated users, change USING (auth.role() IS NOT NULL) or similar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'allow_select_update_logs') THEN
    CREATE POLICY allow_select_update_logs ON public.update_logs
      FOR SELECT
      USING (true);
  END IF;
END$$;

-- 4) Allow INSERT only if the authenticated user is a Developer
-- This checks the "users" table: the row with id = auth.uid() must have role = 'Developer'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'dev_insert_update_logs') THEN
    CREATE POLICY dev_insert_update_logs ON public.update_logs
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND lower(u.role) = 'developer'
        )
      );
  END IF;
END$$;

-- 5) Allow DELETE only for Developer as well
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'dev_delete_update_logs') THEN
    CREATE POLICY dev_delete_update_logs ON public.update_logs
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND lower(u.role) = 'developer'
        )
      );
  END IF;
END$$;

-- 6) Optionally allow UPDATE only for Developer
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'dev_update_update_logs') THEN
    CREATE POLICY dev_update_update_logs ON public.update_logs
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND lower(u.role) = 'developer'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND lower(u.role) = 'developer'
        )
      );
  END IF;
END$$;

-- 7) Backfill created_by for existing rows if you want (optional)
-- Example: set to NULL (no-op). You can update this to a specific user id if appropriate.
-- UPDATE public.update_logs SET created_by = NULL WHERE created_by IS NULL;

-- Notes:
-- - If you use a server-side service role (recommended), the service role bypasses RLS and can insert regardless of these policies.
-- - Keep SUPABASE_SERVICE_ROLE_KEY secret and use it server-side only.
-- - If you prefer reads only for authenticated users, replace the SELECT policy's USING clause with "EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid())".
