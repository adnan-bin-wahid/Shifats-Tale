INSERT INTO public.site_page_sections (page_id, section_key, title, eyebrow, description, status, content, sort_order)
SELECT 
    p.id,
    'HOME_STUDENT_SUCCESS',
    'Celebrating Excellence',
    'STUDENT SUCCESS STORIES',
    'Here are some of the remarkable success stories from our past batches.',
    'PUBLISHED',
    '{"selectedStudentIds": []}'::jsonb,
    30
FROM public.site_pages p
WHERE p.slug = 'HOME'
ON CONFLICT (page_id, section_key) DO NOTHING;
