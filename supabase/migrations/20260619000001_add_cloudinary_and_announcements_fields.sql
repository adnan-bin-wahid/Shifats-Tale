-- Migration: Add Cloudinary and Announcements scheduling fields
-- File: supabase/migrations/20260619000001_add_cloudinary_and_announcements_fields.sql

-- =========================================================================
-- 1. ALTER BATCH_CONTENTS TABLE
-- =========================================================================

ALTER TABLE public.batch_contents
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT,
  ADD COLUMN IF NOT EXISTS cloudinary_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS cloudinary_resource_type TEXT,
  ADD COLUMN IF NOT EXISTS cloudinary_delivery_type TEXT DEFAULT 'authenticated',
  ADD COLUMN IF NOT EXISTS cloudinary_format TEXT,
  ADD COLUMN IF NOT EXISTS cloudinary_version TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS page_count INTEGER;
-- =========================================================================
-- 2. ALTER ANNOUNCEMENTS TABLE
-- =========================================================================

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
-- =========================================================================
-- 3. INDEXES SETUP
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_batch_contents_status ON public.batch_contents(status);
CREATE INDEX IF NOT EXISTS idx_batch_contents_content_type ON public.batch_contents(content_type);
CREATE INDEX IF NOT EXISTS idx_batch_contents_release_at ON public.batch_contents(release_at);
CREATE INDEX IF NOT EXISTS idx_batch_contents_expires_at ON public.batch_contents(expires_at);
CREATE INDEX IF NOT EXISTS idx_batch_contents_created_at ON public.batch_contents(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_contents_published_at ON public.batch_contents(published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_release_at ON public.announcements(release_at);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON public.announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON public.announcements(published_at);
-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES UPDATES
-- =========================================================================

-- Re-create select policy for announcements to respect release/expiry
DROP POLICY IF EXISTS select_announcements ON public.announcements;
CREATE POLICY select_announcements ON public.announcements
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher() OR 
    (
      status = 'PUBLISHED' AND 
      public.has_active_enrollment(batch_id) AND 
      (release_at IS NULL OR release_at <= now()) AND 
      (expires_at IS NULL OR expires_at > now())
    )
  );
-- Re-verify RLS select policies on batch_contents to match scheduling strictly
DROP POLICY IF EXISTS select_batch_contents ON public.batch_contents;
CREATE POLICY select_batch_contents ON public.batch_contents
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher() OR 
    (
      status = 'PUBLISHED' AND 
      public.has_active_enrollment(batch_id) AND 
      (release_at IS NULL OR release_at <= now()) AND 
      (expires_at IS NULL OR expires_at > now())
    )
  );
