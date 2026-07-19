-- =========================================================================
-- CMS Base Tables (Teacher Access Only)
-- =========================================================================

-- 1. Media Assets
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),

  provider text not null default 'CLOUDINARY'
    check (provider in ('CLOUDINARY')),

  public_id text not null,
  asset_id text,
  asset_type text not null default 'IMAGE'
    check (asset_type in ('IMAGE', 'VIDEO', 'DOCUMENT')),

  resource_type text not null default 'image'
    check (resource_type in ('image', 'video', 'raw')),
  delivery_type text not null default 'upload'
    check (delivery_type in ('upload', 'authenticated', 'private')),

  secure_url text not null,
  version bigint null,
  format text null,

  folder text null,
  original_filename text null,

  width integer null check (width > 0),
  height integer null check (height > 0),
  bytes bigint null check (bytes >= 0),
  duration numeric null,

  alt_text text null,
  caption text null,

  is_public boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  constraint media_assets_provider_public_id_unique unique (provider, public_id)
);
create index media_assets_active_idx on public.media_assets (created_at desc) where deleted_at is null;
create index media_assets_folder_idx on public.media_assets (folder) where deleted_at is null;
create index media_assets_public_idx on public.media_assets (is_public) where deleted_at is null;
create unique index media_assets_asset_id_unique on public.media_assets (asset_id) where asset_id is not null;
create trigger update_media_assets_modtime
before update on public.media_assets
for each row execute function public.set_updated_at();
-- 2. Global Site Settings
create table public.site_settings (
  id smallint primary key check (id = 1),
  site_name text,
  site_short_name text,
  tagline text,
  site_description text,

  logo_media_id uuid references public.media_assets(id),
  favicon_media_id uuid references public.media_assets(id),
  default_og_media_id uuid references public.media_assets(id),

  primary_phone text,
  secondary_phone text,
  whatsapp_number text,
  email text,

  address_line text,
  city text,
  country text,
  google_map_url text,

  footer_description text,
  copyright_text text,
  developer_credit_text text,

  default_seo_title text,
  default_seo_description text,

  maintenance_mode boolean not null default false,
  registration_enabled boolean not null default true,

  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1);
create trigger update_site_settings_modtime
before update on public.site_settings
for each row execute function public.set_updated_at();
-- 3. Social Links
create table public.site_social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null,
  url text not null,
  icon_key text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_enabled boolean not null default true,
  
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_social_links_sort_idx on public.site_social_links (is_enabled, sort_order);
create trigger update_site_social_links_modtime
before update on public.site_social_links
for each row execute function public.set_updated_at();
-- 4. Navbar and Footer Navigation
create table public.site_navigation_items (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.site_navigation_items(id) on delete cascade,
  location text not null check (location in ('HEADER', 'FOOTER', 'BOTH')),
  label text not null,
  href text not null,
  icon_key text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_enabled boolean not null default true,
  open_in_new_tab boolean not null default false,
  
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_navigation_items_sort_idx on public.site_navigation_items (location, parent_id, sort_order);
create trigger update_site_navigation_items_modtime
before update on public.site_navigation_items
for each row execute function public.set_updated_at();
-- 5. Page Registry
create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique,
  name text not null,
  slug text not null unique,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  
  seo_title text,
  seo_description text,
  canonical_url text,
  og_media_id uuid references public.media_assets(id),

  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index site_pages_status_idx on public.site_pages (status);
create trigger update_site_pages_modtime
before update on public.site_pages
for each row execute function public.set_updated_at();
-- 6. Page Sections
create table public.site_page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.site_pages(id) on delete cascade,
  section_key text not null,
  component_key text not null,
  
  eyebrow text,
  title text,
  subtitle text,
  description text,

  content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,

  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  is_enabled boolean not null default true,

  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,

  constraint site_page_sections_page_section_unique unique (page_id, section_key)
);
create index site_page_sections_order_idx on public.site_page_sections (page_id, sort_order);
create trigger update_site_page_sections_modtime
before update on public.site_page_sections
for each row execute function public.set_updated_at();
-- 7. Generic Section Items
create table public.site_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.site_page_sections(id) on delete cascade,
  
  title text,
  subtitle text,
  body text,

  icon_key text,
  media_id uuid references public.media_assets(id),

  value text,
  link_label text,
  link_url text,

  metadata jsonb not null default '{}'::jsonb,

  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),

  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_section_items_order_idx on public.site_section_items (section_id, sort_order);
create trigger update_site_section_items_modtime
before update on public.site_section_items
for each row execute function public.set_updated_at();
-- =========================================================================
-- Base Table RLS (Teacher Only)
-- =========================================================================

alter table public.media_assets enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_social_links enable row level security;
alter table public.site_navigation_items enable row level security;
alter table public.site_pages enable row level security;
alter table public.site_page_sections enable row level security;
alter table public.site_section_items enable row level security;
-- Base tables only accessible to teachers
create policy "Teachers can view media" on public.media_assets for select to authenticated using (public.is_active_teacher());
create policy "Teachers can insert media" on public.media_assets for insert to authenticated with check (public.is_active_teacher());
create policy "Teachers can update media" on public.media_assets for update to authenticated using (public.is_active_teacher()) with check (public.is_active_teacher());
create policy "Teachers can manage settings" on public.site_settings for update to authenticated using (public.is_active_teacher()) with check (public.is_active_teacher());
create policy "Teachers can select settings" on public.site_settings for select to authenticated using (public.is_active_teacher());
create policy "Teachers can manage social links" on public.site_social_links for all to authenticated using (public.is_active_teacher()) with check (public.is_active_teacher());
create policy "Teachers can manage nav items" on public.site_navigation_items for all to authenticated using (public.is_active_teacher()) with check (public.is_active_teacher());
create policy "Teachers can manage pages" on public.site_pages for all to authenticated using (public.is_active_teacher()) with check (public.is_active_teacher());
create policy "Teachers can manage page sections" on public.site_page_sections for all to authenticated using (public.is_active_teacher()) with check (public.is_active_teacher());
create policy "Teachers can manage section items" on public.site_section_items for all to authenticated using (public.is_active_teacher()) with check (public.is_active_teacher());
-- =========================================================================
-- Public Safe Views (Visitor Access)
-- =========================================================================

-- View 1: Public Media Assets (hides folder, asset_id, bytes, created_by etc)
create view public.vw_public_media_assets as
select
  id,
  asset_type,
  resource_type,
  secure_url,
  format,
  width,
  height,
  duration,
  alt_text,
  caption,
  created_at
from public.media_assets
where is_public = true and deleted_at is null;
-- View 2: Public Site Settings
create view public.vw_public_site_settings as
select
  id,
  site_name,
  site_short_name,
  tagline,
  site_description,
  logo_media_id,
  favicon_media_id,
  default_og_media_id,
  primary_phone,
  secondary_phone,
  whatsapp_number,
  email,
  address_line,
  city,
  country,
  google_map_url,
  footer_description,
  copyright_text,
  developer_credit_text,
  default_seo_title,
  default_seo_description,
  maintenance_mode,
  registration_enabled,
  updated_at
from public.site_settings;
-- View 3: Public Social Links
create view public.vw_public_site_social_links as
select id, platform, label, url, icon_key, sort_order
from public.site_social_links
where is_enabled = true;
-- View 4: Public Nav Items
create view public.vw_public_site_navigation_items as
select id, parent_id, location, label, href, icon_key, sort_order, open_in_new_tab
from public.site_navigation_items
where is_enabled = true;
-- View 5: Public Pages
create view public.vw_public_site_pages as
select id, page_key, name, slug, seo_title, seo_description, canonical_url, og_media_id, published_at
from public.site_pages
where status = 'PUBLISHED';
-- View 6: Public Page Sections
create view public.vw_public_site_page_sections as
select s.id, s.page_id, s.section_key, s.component_key, s.eyebrow, s.title, s.subtitle, s.description, s.content, s.settings, s.sort_order
from public.site_page_sections s
join public.site_pages p on p.id = s.page_id
where s.status = 'PUBLISHED' and s.is_enabled = true and p.status = 'PUBLISHED';
-- View 7: Public Section Items
create view public.vw_public_site_section_items as
select i.id, i.section_id, i.title, i.subtitle, i.body, i.icon_key, i.media_id, i.value, i.link_label, i.link_url, i.sort_order
from public.site_section_items i
join public.site_page_sections s on s.id = i.section_id
join public.site_pages p on p.id = s.page_id
where i.status = 'PUBLISHED' and s.status = 'PUBLISHED' and s.is_enabled = true and p.status = 'PUBLISHED';
-- Grant SELECT access on all views to anon and authenticated roles
grant select on public.vw_public_media_assets to anon, authenticated;
grant select on public.vw_public_site_settings to anon, authenticated;
grant select on public.vw_public_site_social_links to anon, authenticated;
grant select on public.vw_public_site_navigation_items to anon, authenticated;
grant select on public.vw_public_site_pages to anon, authenticated;
grant select on public.vw_public_site_page_sections to anon, authenticated;
grant select on public.vw_public_site_section_items to anon, authenticated;
