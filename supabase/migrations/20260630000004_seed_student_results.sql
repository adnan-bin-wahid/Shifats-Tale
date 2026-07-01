-- 20260630000004_seed_student_results.sql
-- Seed the "RESULTS_STUDENTS" section and initial mock data

DO $$ 
DECLARE
  v_teacher_id uuid;
  v_page_id uuid;
  v_section_id uuid;
BEGIN
  -- Get any active profile to assign as creator (fallback to null if none exists)
  SELECT id INTO v_teacher_id FROM public.profiles LIMIT 1;

  -- Get the RESULTS page id
  SELECT id INTO v_page_id FROM public.site_pages WHERE page_key = 'RESULTS';

  -- 1. Upsert RESULTS_STUDENTS section
  INSERT INTO public.site_page_sections (
    page_id, section_key, component_key, eyebrow, title, subtitle, description, status, is_enabled, created_by, updated_by, published_at
  )
  VALUES (
    v_page_id,
    'RESULTS_STUDENTS',
    'ResultsGrid',
    NULL,
    'Our Stars',
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
      'Ayon Sen',
      'Notre Dame College',
      'Consistent performance in weekly quizzes and mocks helped me achieve this rank.',
      '{
        "achievement": "BUET - Merit Position 42 (Mechanical)",
        "course": "Engineering Admission Care",
        "examType": "Engineering",
        "year": "2024",
        "fallbackImageUrl": "/images/s1.jpeg"
      }'::jsonb,
      1,
      'PUBLISHED',
      v_teacher_id,
      v_teacher_id
    ),
    (
      v_section_id,
      'Samiul Huq',
      'Dhaka College',
      'Sir''s math shortcuts and textbook summaries saved critical time during exams.',
      '{
        "achievement": "Dhaka University - Merit Position 112 (A Unit)",
        "course": "Varsity Admission Care",
        "examType": "University",
        "year": "2024",
        "fallbackImageUrl": "/images/s2.jpeg"
      }'::jsonb,
      2,
      'PUBLISHED',
      v_teacher_id,
      v_teacher_id
    ),
    (
      v_section_id,
      'Nusrat Jahan',
      'Holy Cross College',
      'Even as a medical candidate, the physics concepts taught by Sir were invaluable.',
      '{
        "achievement": "Mymensingh Medical College (Admission)",
        "course": "Medical Physics Core",
        "examType": "Medical",
        "year": "2024",
        "fallbackImageUrl": "/images/s3.jpeg"
      }'::jsonb,
      3,
      'PUBLISHED',
      v_teacher_id,
      v_teacher_id
    ),
    (
      v_section_id,
      'Ishtiaq Ahmed',
      'Notre Dame College',
      'Perfect board preparation through chapter-wise quizzes and written evaluations.',
      '{
        "achievement": "HSC Board - GPA 5.00 (Physics: 100/100)",
        "course": "HSC Academic Care",
        "examType": "Board",
        "year": "2024",
        "fallbackImageUrl": "/images/s4.jpeg"
      }'::jsonb,
      4,
      'PUBLISHED',
      v_teacher_id,
      v_teacher_id
    ),
    (
      v_section_id,
      'Mehrab Hossain',
      'St. Joseph Higher Secondary School',
      'Weekly mock tests exactly matched the actual exam pattern, building my confidence.',
      '{
        "achievement": "IUT - Merit Position 89 (CSE)",
        "course": "Engineering Admission Care",
        "examType": "Engineering",
        "year": "2024",
        "fallbackImageUrl": "/images/s5.jpeg"
      }'::jsonb,
      5,
      'PUBLISHED',
      v_teacher_id,
      v_teacher_id
    ),
    (
      v_section_id,
      'Zarin Subah',
      'Viqarunnisa Noon College',
      'Mastered Higher Mathematics theorems and calculus concepts with absolute clarity.',
      '{
        "achievement": "HSC Board - GPA 5.00 (Math: 98/100)",
        "course": "HSC Academic Care",
        "examType": "Board",
        "year": "2024",
        "fallbackImageUrl": "/images/s1.jpeg"
      }'::jsonb,
      6,
      'PUBLISHED',
      v_teacher_id,
      v_teacher_id
    );

  END IF;

END $$;
