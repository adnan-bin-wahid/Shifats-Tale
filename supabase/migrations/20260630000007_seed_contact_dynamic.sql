-- Seed Contact Page Dynamic Sections

DO $$ 
DECLARE
  v_page_id uuid;
BEGIN
  -- Get the CONTACT page ID
  SELECT id INTO v_page_id FROM public.site_pages WHERE page_key = 'CONTACT';

  IF v_page_id IS NOT NULL THEN
    -- 1. Upsert CONTACT_INFO section
    INSERT INTO public.site_page_sections (
      page_id, section_key, component_key, title, eyebrow, description, status, is_enabled, sort_order, content
    )
    VALUES (
      v_page_id,
      'CONTACT_INFO',
      'LocationSection',
      'Location & Details',
      'CONTACT INFO',
      '',
      'PUBLISHED',
      true,
      20,
      '{"address": "Sekandar & M.P Yusuf Building, 3rd Floor, next to Rangunia College, Rangunia, Chattogram, Bangladesh", "transitInfo": "Conveniently located next to Rangunia College in Rangunia. Easily accessible from all parts of the area by local transport (CNG/bus).", "securityInfo": "24/7 CCTV surveillance, well-lit classrooms, and a highly secure academic environment for all students.", "mapEmbedUrl": "https://maps.google.com/maps?q=Rangunia%20Government%20College,%20Chattogram&t=&z=16&ie=UTF8&iwloc=&output=embed", "mapDirectionUrl": "https://maps.google.com/?q=Rangunia+Government+College+Chattogram"}'::jsonb
    )
    ON CONFLICT (page_id, section_key) DO UPDATE SET
      component_key = EXCLUDED.component_key,
      content = COALESCE(NULLIF(public.site_page_sections.content, '{}'::jsonb), EXCLUDED.content);

    -- 2. Upsert CONTACT_FAQ section
    INSERT INTO public.site_page_sections (
      page_id, section_key, component_key, title, eyebrow, description, status, is_enabled, sort_order, content
    )
    VALUES (
      v_page_id,
      'CONTACT_FAQ',
      'FAQSection',
      'Frequently Asked Questions',
      'FAQ',
      '',
      'PUBLISHED',
      true,
      30,
      '{"faqs": [{"id": "faq-1", "answer": "Our offline facility is located at Sekandar & M.P Yusuf Building (3rd Floor), next to Rangunia College, Rangunia, Chattogram.", "question": "Where is the coaching center located?"}, {"id": "faq-2", "answer": "To enroll, please contact Shifat Sir directly on WhatsApp or over the phone.", "question": "How can I join the coaching?"}, {"id": "faq-3", "answer": "Currently, our primary focus is strictly offline to ensure maximum engagement and focus.", "question": "Are there any online classes available?"}]}'::jsonb
    )
    ON CONFLICT (page_id, section_key) DO UPDATE SET
      component_key = EXCLUDED.component_key,
      content = COALESCE(NULLIF(public.site_page_sections.content, '{}'::jsonb), EXCLUDED.content);
  END IF;
END $$;
