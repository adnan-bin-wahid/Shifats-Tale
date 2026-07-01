-- Seed GLOBAL page and GLOBAL_SETTINGS section

DO $$ 
DECLARE
  v_page_id uuid;
BEGIN
  -- Insert GLOBAL page if it doesn't exist
  INSERT INTO public.site_pages (page_key, name, slug, status, seo_title, seo_description, published_at)
  VALUES (
    'GLOBAL', 
    'Global Settings', 
    'GLOBAL', 
    'PUBLISHED', 
    'Global Settings', 
    'Global Settings for the website', 
    now()
  )
  ON CONFLICT (page_key) DO NOTHING;

  -- Get the GLOBAL page ID
  SELECT id INTO v_page_id FROM public.site_pages WHERE page_key = 'GLOBAL';

  IF v_page_id IS NOT NULL THEN
    -- Upsert GLOBAL_SETTINGS section
    INSERT INTO public.site_page_sections (
      page_id, section_key, component_key, title, eyebrow, description, status, is_enabled, sort_order, content
    )
    VALUES (
      v_page_id,
      'GLOBAL_SETTINGS',
      'GlobalSettings',
      'Global Settings',
      'SETTINGS',
      '',
      'PUBLISHED',
      true,
      10,
      '{"coachingCenterName": "Shifat''s Tales - Academic & Admission Care", "tagline": "Admissions Open for SSC & HSC Batches", "shortDescription": "A premium personal coaching ecosystem specialized in Physics and Higher Mathematics. Founded and mentored by Md. Zia Uddin Azad Sifat (Shifat Sir). Empowering SSC and HSC science students to build core concepts and score top ranks in university admission tests.", "phone": "+880 1879-169446", "whatsapp": "8801879169446", "email": "info@shifatstales.com", "address": "Sekandar & M.P Yusuf Building, 3rd Floor, next to Rangunia College, Rangunia, Chattogram, Bangladesh", "nearbyLandmark": "next to Rangunia College", "officeHours": "Daily 4:00 PM - 9:00 PM", "facebookUrl": "https://facebook.com", "youtubeUrl": "https://youtube.com", "googleMapEmbedUrl": "https://maps.google.com/maps?q=Rangunia%20Government%20College,%20Chattogram&t=&z=16&ie=UTF8&iwloc=&output=embed", "googleMapDirectionUrl": "https://maps.google.com/?q=Rangunia+Government+College+Chattogram", "teacherName": "Md. Zia Uddin Azad Sifat", "teacherDesignation": "Lead Mentor & CEO", "teacherExperience": "10+ Years", "teacherSpecialty": "EEE, CUET | Physics & Mathematics Specialist", "teacherBio": "Hello, I am Md. Zia Uddin Azad Sifat (Shifat Sir). As a B.Sc. Engineer from CUET, I specialize in simplifying complex Physics and Higher Mathematics concepts. Through structured classes, weekly exams, and concept-first teaching, I guide SSC and HSC science students to excel in both board exams and engineering admission preparation.", "heroHeadline": "Personal Guidance for Better Academic Success", "heroDescription": "Learn directly from an experienced teacher through structured classes, regular exams, clear explanations, and individual academic support."}'::jsonb
    )
    ON CONFLICT (page_id, section_key) DO UPDATE SET
      component_key = EXCLUDED.component_key,
      content = COALESCE(NULLIF(public.site_page_sections.content, '{}'::jsonb), EXCLUDED.content);
  END IF;
END $$;
