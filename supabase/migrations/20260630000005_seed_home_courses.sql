-- 20260630000005_seed_home_courses.sql
-- Seed the "HOME_FEATURED_COURSES" section

DO $$ 
DECLARE
  v_teacher_id uuid;
  v_page_id uuid;
BEGIN
  -- Get any active profile to assign as creator (fallback to null if none exists)
  SELECT id INTO v_teacher_id FROM public.profiles LIMIT 1;

  -- Upsert HOME page
  INSERT INTO public.site_pages (page_key, name, slug, status, seo_title, seo_description, created_by, updated_by, published_at)
  VALUES (
    'HOME', 
    'Home Page', 
    '', 
    'PUBLISHED',
    'Shifat''s Tales | Admission & Academic Care',
    'Providing quality education to build the future of our students.',
    v_teacher_id, 
    v_teacher_id, 
    now()
  )
  ON CONFLICT (page_key) DO UPDATE SET 
    updated_at = now()
  RETURNING id INTO v_page_id;

  -- Upsert HOME_FEATURED_COURSES section
  INSERT INTO public.site_page_sections (
    page_id, section_key, component_key, eyebrow, title, subtitle, description, status, is_enabled, created_by, updated_by, published_at, content
  )
  VALUES (
    v_page_id,
    'HOME_FEATURED_COURSES',
    'CoursesSection',
    NULL,
    'Offered Courses',
    NULL,
    NULL,
    'PUBLISHED',
    true,
    v_teacher_id,
    v_teacher_id,
    now(),
    '{"selectedCourseIds": []}'::jsonb
  )
  ON CONFLICT (page_id, section_key) DO UPDATE SET 
    updated_at = now();

END $$;
