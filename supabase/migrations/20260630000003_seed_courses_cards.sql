-- 20260630000003_seed_courses_cards.sql
-- Seed the "COURSES_CARDS" section and initial mock data

DO $$ 
DECLARE
  v_teacher_id uuid;
  v_page_id uuid;
  v_section_id uuid;
BEGIN
  -- Get any active profile to assign as creator (fallback to null if none exists)
  SELECT id INTO v_teacher_id FROM public.profiles LIMIT 1;

  -- Get the COURSES page id
  SELECT id INTO v_page_id FROM public.site_pages WHERE page_key = 'COURSES';

  -- 1. Upsert COURSES_CARDS section
  INSERT INTO public.site_page_sections (
    page_id, section_key, component_key, eyebrow, title, subtitle, description, status, is_enabled, created_by, updated_by, published_at
  )
  VALUES (
    v_page_id,
    'COURSES_CARDS',
    'CourseGrid',
    NULL,
    'Course List',
    NULL,
    NULL,
    'PUBLISHED',
    true,
    v_teacher_id,
    v_teacher_id,
    now()
  )
  ON CONFLICT (page_id, section_key) DO UPDATE SET 
    updated_at = now()
  RETURNING id INTO v_section_id;

  -- 2. Insert Mock Items ONLY if none exist for this section
  IF NOT EXISTS (SELECT 1 FROM public.site_section_items WHERE section_id = v_section_id) THEN
    
    INSERT INTO public.site_section_items (section_id, title, subtitle, body, metadata, sort_order, status, created_by, updated_by)
    VALUES 
    (
      v_section_id,
      'HSC 26 & 27 Physics',
      'The Ultimate Physics Program',
      'Comprehensive preparation for both board exams and university admission tests.',
      '{
        "target": "HSC 26 & 27",
        "examType": "Engineering",
        "schedule": "3 days/week",
        "duration": "8 Months",
        "features": ["Weekly mock tests", "Interactive Q&A", "PDF notes provided"],
        "fallbackImageUrl": "/images/flyer_admission_science.jpg"
      }'::jsonb,
      1,
      'PUBLISHED',
      v_teacher_id,
      v_teacher_id
    ),
    (
      v_section_id,
      'BUET Admission 2026',
      'Intensive Admission Care',
      'Dedicated program targeting top engineering universities in Bangladesh.',
      '{
        "target": "Admission 26",
        "examType": "Engineering",
        "schedule": "4 days/week",
        "duration": "4 Months",
        "features": ["Daily model tests", "Question bank solve", "Personalized mentorship"],
        "fallbackImageUrl": "/images/flyer_admission_science.jpg"
      }'::jsonb,
      2,
      'PUBLISHED',
      v_teacher_id,
      v_teacher_id
    ),
    (
      v_section_id,
      'Medical Foundation Course',
      'Pre-Medical Biology & Chemistry',
      'Build a strong foundation for medical college admission from the very beginning.',
      '{
        "target": "HSC 26",
        "examType": "Medical",
        "schedule": "2 days/week",
        "duration": "6 Months",
        "features": ["Visual biology notes", "Chemistry trick sheets", "Medical GK"],
        "fallbackImageUrl": "/images/flyer_admission_science.jpg"
      }'::jsonb,
      3,
      'PUBLISHED',
      v_teacher_id,
      v_teacher_id
    );

  END IF;

END $$;
