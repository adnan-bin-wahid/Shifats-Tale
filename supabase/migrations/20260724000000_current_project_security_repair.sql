-- =========================================================================
-- Current project security repair
-- - Keep public CMS reads on deliberately limited views.
-- - Make page/section lookups unambiguous by exposing page_key.
-- - Expose section-item metadata because it contains public presentation data.
-- =========================================================================

CREATE OR REPLACE VIEW public.vw_public_site_page_sections
WITH (security_barrier = true)
AS
SELECT
  s.id,
  s.page_id,
  s.section_key,
  s.component_key,
  s.eyebrow,
  s.title,
  s.subtitle,
  s.description,
  s.content,
  s.settings,
  s.sort_order,
  p.page_key
FROM public.site_page_sections AS s
JOIN public.site_pages AS p ON p.id = s.page_id
WHERE s.status = 'PUBLISHED'
  AND s.is_enabled = true
  AND p.status = 'PUBLISHED';

CREATE OR REPLACE VIEW public.vw_public_site_section_items
WITH (security_barrier = true)
AS
SELECT
  i.id,
  i.section_id,
  i.title,
  i.subtitle,
  i.body,
  i.icon_key,
  i.media_id,
  i.value,
  i.link_label,
  i.link_url,
  i.sort_order,
  i.metadata
FROM public.site_section_items AS i
JOIN public.site_page_sections AS s ON s.id = i.section_id
JOIN public.site_pages AS p ON p.id = s.page_id
WHERE i.status = 'PUBLISHED'
  AND s.status = 'PUBLISHED'
  AND s.is_enabled = true
  AND p.status = 'PUBLISHED';

GRANT SELECT ON public.vw_public_site_page_sections TO anon, authenticated;
GRANT SELECT ON public.vw_public_site_section_items TO anon, authenticated;

COMMENT ON VIEW public.vw_public_site_page_sections IS
  'Public, published CMS sections with page_key for unambiguous lookup.';

COMMENT ON VIEW public.vw_public_site_section_items IS
  'Public, published CMS item fields, including presentation metadata.';
