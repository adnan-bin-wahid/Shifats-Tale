-- 20260630000002_seed_other_heroes.sql
-- Seed the RESULTS, GALLERY, CONTACT pages and their HERO sections

DO $$ 
DECLARE
  v_teacher_id uuid;
  v_results_page_id uuid;
  v_gallery_page_id uuid;
  v_contact_page_id uuid;
BEGIN
  -- Get any active profile to assign as creator (fallback to null if none exists)
  SELECT id INTO v_teacher_id FROM public.profiles LIMIT 1;

  -- 1. Upsert RESULTS page
  INSERT INTO public.site_pages (page_key, name, slug, status, seo_title, seo_description, created_by, updated_by, published_at)
  VALUES (
    'RESULTS', 
    'Results & Success Stories', 
    'results', 
    'PUBLISHED',
    'Success Stories & Alumni | Shifat''s Tales',
    'Explore the brilliant minds who have achieved top ranks in board exams and university admissions with Shifat''s Tales.',
    v_teacher_id,
    v_teacher_id,
    now()
  )
  ON CONFLICT (page_key) DO UPDATE SET 
    updated_at = now()
  RETURNING id INTO v_results_page_id;

  -- 2. Upsert RESULTS_HERO section
  INSERT INTO public.site_page_sections (
    page_id, section_key, component_key, eyebrow, title, subtitle, description, status, is_enabled, created_by, updated_by, published_at
  )
  VALUES (
    v_results_page_id,
    'RESULTS_HERO',
    'InnerPageHero',
    'HALL OF FAME',
    'Our Success Stories',
    '& Alumni',
    'Explore the brilliant minds who have achieved top ranks in board exams and university admissions.',
    'PUBLISHED',
    true,
    v_teacher_id,
    v_teacher_id,
    now()
  )
  ON CONFLICT (page_id, section_key) DO NOTHING;

  -- 3. Upsert GALLERY page
  INSERT INTO public.site_pages (page_key, name, slug, status, seo_title, seo_description, created_by, updated_by, published_at)
  VALUES (
    'GALLERY', 
    'Photo Gallery', 
    'gallery', 
    'PUBLISHED',
    'Photo Gallery | Shifat''s Tales',
    'A glimpse into our classrooms, events, and the vibrant life at Shifat''s Tales.',
    v_teacher_id,
    v_teacher_id,
    now()
  )
  ON CONFLICT (page_key) DO UPDATE SET 
    updated_at = now()
  RETURNING id INTO v_gallery_page_id;

  -- 4. Upsert GALLERY_HERO section
  INSERT INTO public.site_page_sections (
    page_id, section_key, component_key, eyebrow, title, subtitle, description, status, is_enabled, created_by, updated_by, published_at
  )
  VALUES (
    v_gallery_page_id,
    'GALLERY_HERO',
    'InnerPageHero',
    'MEMORIES',
    'A Glimpse into',
    'Our World',
    'Explore our journey through these captured moments from classrooms, events, and celebrations.',
    'PUBLISHED',
    true,
    v_teacher_id,
    v_teacher_id,
    now()
  )
  ON CONFLICT (page_id, section_key) DO NOTHING;

  -- 5. Upsert CONTACT page
  INSERT INTO public.site_pages (page_key, name, slug, status, seo_title, seo_description, created_by, updated_by, published_at)
  VALUES (
    'CONTACT', 
    'Contact & FAQ', 
    'contact', 
    'PUBLISHED',
    'Contact & FAQ | Shifat''s Tales',
    'Get in touch with Shifat''s Tales Academic & Admission Care. We are here to help with your queries.',
    v_teacher_id,
    v_teacher_id,
    now()
  )
  ON CONFLICT (page_key) DO UPDATE SET 
    updated_at = now()
  RETURNING id INTO v_contact_page_id;

  -- 6. Upsert CONTACT_HERO section
  INSERT INTO public.site_page_sections (
    page_id, section_key, component_key, eyebrow, title, subtitle, description, status, is_enabled, created_by, updated_by, published_at
  )
  VALUES (
    v_contact_page_id,
    'CONTACT_HERO',
    'InnerPageHero',
    'GET IN TOUCH',
    'We''d love to',
    'Hear from You',
    'Have a question about our programs? Our team is here to help you out.',
    'PUBLISHED',
    true,
    v_teacher_id,
    v_teacher_id,
    now()
  )
  ON CONFLICT (page_id, section_key) DO NOTHING;

END $$;
